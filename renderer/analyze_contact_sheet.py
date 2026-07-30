import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image


ANALYZER_VERSION = 1
GRID_COLUMNS = 4
GRID_ROWS = 3
MARGIN = 8
PADDING = 8
TEMPORAL_WIDTH = 160
TEMPORAL_HEIGHT = 90
MIN_BLACK_SEGMENT_SECONDS = 0.2
MIN_FROZEN_SEGMENT_SECONDS = 2.0
SIGNIFICANT_PIXEL_DELTA = 4
MAX_FROZEN_CHANGED_PIXEL_FRACTION = 0.0005
MAX_FROZEN_MEAN_DELTA = 0.0001


def crop_frames(image: Image.Image) -> list[np.ndarray]:
    width, height = image.size
    tile_width = (width - 2 * MARGIN - (GRID_COLUMNS - 1) * PADDING) // GRID_COLUMNS
    tile_height = (height - 2 * MARGIN - (GRID_ROWS - 1) * PADDING) // GRID_ROWS
    if tile_width < 64 or tile_height < 64:
        raise ValueError("Contact sheet tiles are too small")
    frames: list[np.ndarray] = []
    for row in range(GRID_ROWS):
        for column in range(GRID_COLUMNS):
            left = MARGIN + column * (tile_width + PADDING)
            top = MARGIN + row * (tile_height + PADDING)
            tile = image.crop((left, top, left + tile_width, top + tile_height))
            frames.append(np.asarray(tile.convert("RGB"), dtype=np.float32))
    return frames


def frame_metrics(frame: np.ndarray, index: int) -> tuple[dict, np.ndarray]:
    height, width, _ = frame.shape
    corner = max(4, min(width, height) // 40)
    corners = np.concatenate(
        [
            frame[:corner, :corner].reshape(-1, 3),
            frame[:corner, -corner:].reshape(-1, 3),
            frame[-corner:, :corner].reshape(-1, 3),
            frame[-corner:, -corner:].reshape(-1, 3),
        ],
        axis=0,
    )
    background = np.median(corners, axis=0)
    distance = np.max(np.abs(frame - background), axis=2)
    mask = distance >= 24
    occupancy = float(np.mean(mask))

    edge_x = max(2, round(width * 0.018))
    edge_y = max(2, round(height * 0.018))
    edge_mask = np.zeros_like(mask)
    edge_mask[:edge_y, :] = True
    edge_mask[-edge_y:, :] = True
    edge_mask[:, :edge_x] = True
    edge_mask[:, -edge_x:] = True
    edge_content = float(np.mean(mask[edge_mask]))
    edge_risk = edge_content >= 0.035

    coordinates = np.argwhere(mask)
    if coordinates.size:
        center_y, center_x = np.mean(coordinates, axis=0)
        center_offset = float(
            np.hypot(
                (center_x - width / 2) / (width / 2),
                (center_y - height / 2) / (height / 2),
            )
        )
        y_min, x_min = np.min(coordinates, axis=0)
        y_max, x_max = np.max(coordinates, axis=0)
        bbox = [
            round(float(x_min / width), 4),
            round(float(y_min / height), 4),
            round(float((x_max + 1) / width), 4),
            round(float((y_max + 1) / height), 4),
        ]
    else:
        center_offset = 1.0
        bbox = [0.0, 0.0, 0.0, 0.0]

    contrast = (
        float(np.percentile(distance[mask], 75) / 255) if coordinates.size else 0.0
    )
    return (
        {
            "index": index,
            "occupancy": round(occupancy, 4),
            "edgeContent": round(edge_content, 4),
            "edgeRisk": edge_risk,
            "centerOffset": round(center_offset, 4),
            "contrast": round(contrast, 4),
            "contentBounds": bbox,
        },
        frame,
    )


def issue(code: str, severity: str, frames: list[int], message: str) -> dict:
    return {
        "code": code,
        "severity": severity,
        "frames": frames,
        "message": message,
    }


def parse_frame_rate(value: str) -> float:
    if "/" in value:
        numerator, denominator = value.split("/", 1)
        rate = float(numerator) / float(denominator)
    else:
        rate = float(value)
    if not np.isfinite(rate) or rate <= 0 or rate > 120:
        raise ValueError("Video frame rate is outside the supported range")
    return rate


def probe_video(video_path: Path) -> tuple[float, float]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration:stream=avg_frame_rate",
            "-of",
            "json",
            str(video_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    payload = json.loads(result.stdout)
    duration = float(payload["format"]["duration"])
    streams = payload.get("streams") or []
    if not streams:
        raise ValueError("Video has no decodable stream")
    frame_rate = parse_frame_rate(streams[0]["avg_frame_rate"])
    if not np.isfinite(duration) or duration <= 0 or duration > 300:
        raise ValueError("Video duration is outside the supported range")
    return duration, frame_rate


def close_segment(
    segments: list[list[float]],
    start_index: int | None,
    end_index: int,
    minimum_samples: int,
    sample_rate: float,
) -> None:
    if start_index is None or end_index - start_index + 1 < minimum_samples:
        return
    segments.append(
        [
            round(start_index / sample_rate, 3),
            round((end_index + 1) / sample_rate, 3),
        ]
    )


def frames_are_effectively_frozen(frame: np.ndarray, prior: np.ndarray) -> bool:
    """Detect a real hold without treating sparse line motion as a frozen frame."""
    absolute_delta = np.abs(frame.astype(np.int16) - prior.astype(np.int16))
    pixel_delta = np.max(absolute_delta, axis=2)
    changed_fraction = float(np.mean(pixel_delta >= SIGNIFICANT_PIXEL_DELTA))
    mean_delta = float(np.mean(absolute_delta) / 255)
    return (
        changed_fraction < MAX_FROZEN_CHANGED_PIXEL_FRACTION
        and mean_delta < MAX_FROZEN_MEAN_DELTA
    )


def analyze_timeline(video_path: Path) -> dict:
    duration, sample_rate = probe_video(video_path)
    command = [
        "ffmpeg",
        "-v",
        "error",
        "-i",
        str(video_path),
        "-vf",
        f"scale={TEMPORAL_WIDTH}:{TEMPORAL_HEIGHT}:flags=bilinear",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "pipe:1",
    ]
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if process.stdout is None:
        raise RuntimeError("Could not read decoded video frames")

    frame_size = TEMPORAL_WIDTH * TEMPORAL_HEIGHT * 3
    prior: np.ndarray | None = None
    sample_count = 0
    black_start: int | None = None
    frozen_start: int | None = None
    black_segments: list[list[float]] = []
    frozen_segments: list[list[float]] = []
    flash_timestamps: list[float] = []

    while True:
        raw = process.stdout.read(frame_size)
        if not raw:
            break
        if len(raw) != frame_size:
            process.kill()
            raise RuntimeError("Decoded video ended with an incomplete frame")
        frame = np.frombuffer(raw, dtype=np.uint8).reshape(
            TEMPORAL_HEIGHT, TEMPORAL_WIDTH, 3
        )
        luminance = (
            frame[:, :, 0].astype(np.float32) * 0.2126
            + frame[:, :, 1].astype(np.float32) * 0.7152
            + frame[:, :, 2].astype(np.float32) * 0.0722
        )
        is_black = float(np.mean(luminance <= 12)) >= 0.9985
        if is_black and black_start is None:
            black_start = sample_count
        elif not is_black and black_start is not None:
            close_segment(
                black_segments,
                black_start,
                sample_count - 1,
                max(2, round(sample_rate * MIN_BLACK_SEGMENT_SECONDS)),
                sample_rate,
            )
            black_start = None

        if prior is not None:
            absolute_delta = np.abs(
                frame.astype(np.int16) - prior.astype(np.int16)
            )
            mean_delta = float(np.mean(absolute_delta) / 255)
            if frames_are_effectively_frozen(frame, prior):
                if frozen_start is None:
                    frozen_start = sample_count - 1
            elif frozen_start is not None:
                close_segment(
                    frozen_segments,
                    frozen_start,
                    sample_count - 1,
                    max(2, round(sample_rate * MIN_FROZEN_SEGMENT_SECONDS)),
                    sample_rate,
                )
                frozen_start = None
            if mean_delta >= 0.65:
                flash_timestamps.append(
                    round(sample_count / sample_rate, 3)
                )
        prior = frame.copy()
        sample_count += 1

    stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
    return_code = process.wait()
    if return_code != 0:
        raise RuntimeError(f"ffmpeg temporal scan failed: {stderr[-1000:]}")
    if black_start is not None:
        close_segment(
            black_segments,
            black_start,
            sample_count - 1,
            max(2, round(sample_rate * MIN_BLACK_SEGMENT_SECONDS)),
            sample_rate,
        )
    if frozen_start is not None:
        close_segment(
            frozen_segments,
            frozen_start,
            sample_count - 1,
            max(2, round(sample_rate * MIN_FROZEN_SEGMENT_SECONDS)),
            sample_rate,
        )
    if sample_count <= 0:
        raise RuntimeError("Video contained no decodable frames")
    return {
        "durationSeconds": round(duration, 3),
        "temporalSampleRate": round(sample_rate, 3),
        "temporalSampleCount": sample_count,
        "blackSegments": black_segments,
        "frozenSegments": frozen_segments,
        "flashTimestamps": flash_timestamps,
    }


def frame_for_time(timestamp: float, duration: float) -> int:
    if duration <= 0:
        return 1
    return max(1, min(12, int(timestamp / duration * 12) + 1))


def analyze(path: Path, video_path: Path) -> dict:
    image = Image.open(path)
    frames = crop_frames(image)
    metrics: list[dict] = []
    arrays: list[np.ndarray] = []
    for index, frame in enumerate(frames, start=1):
        metric, array = frame_metrics(frame, index)
        metrics.append(metric)
        arrays.append(array)

    transition_deltas = [
        float(
            np.mean(
                np.max(np.abs(arrays[index] - arrays[index - 1]), axis=2) >= 24
            )
        )
        for index in range(1, len(arrays))
    ]
    empty_frames = [item["index"] for item in metrics if item["occupancy"] < 0.002]
    sparse_frames = [
        item["index"]
        for item in metrics
        if 0.002 <= item["occupancy"] < 0.008
    ]
    edge_frames = [item["index"] for item in metrics if item["edgeRisk"]]
    off_center_frames = [
        item["index"]
        for item in metrics
        if item["occupancy"] >= 0.008 and item["centerOffset"] > 0.62
    ]
    low_contrast_frames = [
        item["index"]
        for item in metrics
        if item["occupancy"] >= 0.002 and item["contrast"] < 0.22
    ]
    static_transitions = [
        index + 1 for index, delta in enumerate(transition_deltas) if delta < 0.0008
    ]

    issues: list[dict] = []
    weak_opening = metrics[0]["occupancy"] < 0.008
    if weak_opening:
        issues.append(
            issue(
                "weak_opening",
                "warning",
                [1],
                "The opening sample has a small visible subject; verify that the first second has a clear hook.",
            )
        )
    if empty_frames:
        issues.append(
            issue(
                "empty_frame",
                "warning",
                empty_frames,
                "One or more sampled frames contain almost no visible teaching content.",
            )
        )
    if sparse_frames:
        issues.append(
            issue(
                "sparse_frame",
                "info",
                sparse_frames,
                "The main subject may be too small in these sampled frames.",
            )
        )
    if edge_frames:
        issues.append(
            issue(
                "edge_risk",
                "warning",
                edge_frames,
                "Visible content reaches the outer safe-zone band and may be clipped or covered.",
            )
        )
    if off_center_frames:
        issues.append(
            issue(
                "off_center",
                "info",
                off_center_frames,
                "The visible content is strongly biased away from the frame center.",
            )
        )
    if low_contrast_frames:
        issues.append(
            issue(
                "low_contrast",
                "warning",
                low_contrast_frames,
                "Foreground and background contrast may be insufficient.",
            )
        )
    if len(static_transitions) >= 3:
        issues.append(
            issue(
                "static_sequence",
                "info",
                static_transitions,
                "Several consecutive samples change very little; verify that the pacing is intentional.",
            )
        )

    temporal = analyze_timeline(video_path)
    black_segments = temporal["blackSegments"]
    frozen_segments = temporal["frozenSegments"]
    flash_timestamps = temporal["flashTimestamps"]
    duration = temporal["durationSeconds"]
    if black_segments:
        issues.append(
            issue(
                "black_segment",
                "warning",
                sorted(
                    {
                        frame_for_time((start + end) / 2, duration)
                        for start, end in black_segments
                    }
                ),
                "The full-timeline scan found a blank or nearly black interval.",
            )
        )
    if flash_timestamps:
        issues.append(
            issue(
                "flash_frame",
                "warning",
                sorted(
                    {frame_for_time(timestamp, duration) for timestamp in flash_timestamps}
                ),
                "The full-timeline scan found one or more abrupt flash-like frame changes.",
            )
        )
    if frozen_segments:
        issues.append(
            issue(
                "frozen_segment",
                "info",
                sorted(
                    {
                        frame_for_time((start + end) / 2, duration)
                        for start, end in frozen_segments
                    }
                ),
                "The full-timeline scan found a hold longer than two seconds.",
            )
        )

    score = 100
    if weak_opening:
        score -= 10
    score -= 18 * len(empty_frames)
    score -= 7 * len(sparse_frames)
    score -= 8 * len(edge_frames)
    score -= 4 * len(off_center_frames)
    score -= 7 * len(low_contrast_frames)
    if len(static_transitions) >= 3:
        score -= min(15, 3 * len(static_transitions))
    score -= min(36, 18 * len(black_segments))
    score -= min(24, 8 * len(flash_timestamps))
    score -= min(12, 3 * len(frozen_segments))
    score = max(0, min(100, score))
    has_warning = any(item["severity"] == "warning" for item in issues)

    return {
        "analyzerVersion": ANALYZER_VERSION,
        "status": "pass" if score >= 80 and not has_warning else "review",
        "score": score,
        "sampleCount": len(frames),
        "frames": metrics,
        "transitionDeltas": [round(value, 4) for value in transition_deltas],
        **temporal,
        "issues": issues,
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(
            "Usage: analyze_contact_sheet.py <contact-sheet.jpg> <video.mp4>"
        )
    print(
        json.dumps(
            analyze(Path(sys.argv[1]), Path(sys.argv[2])), separators=(",", ":")
        )
    )
