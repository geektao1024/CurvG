#!/usr/bin/env python3
"""Deterministic RingEscapeAudioPlan v1 synthesis and AAC quality analysis.

This module intentionally uses only the Python standard library.  The renderer
invokes it as one of:

    audio_pipeline.py synth --plan /workspace/audio-plan.json \
        --output /workspace/audio.wav
    audio_pipeline.py analyze --plan /workspace/audio-plan.json \
        --reference /workspace/audio.wav \
        --pcm /workspace/decoded-audio.pcm

Explicit paths are supported for isolated tests, but must be absolute,
canonical, non-symlink paths in one directory and have the expected suffix.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import struct
import sys
from array import array
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
FAMILY = "ring_escape"
FPS = 30
SAMPLE_RATE = 48_000
CHANNELS = 2
SAMPLES_PER_FRAME = SAMPLE_RATE // FPS
MIN_DURATION_FRAMES = 180
MAX_DURATION_FRAMES = 360
MAX_CUES = 256
MAX_PLAN_BYTES = 256 * 1024
PCM_MIN = -32_768
PCM_MAX = 32_767
PHASE_SCALE = 1 << 32
PHASE_MASK = PHASE_SCALE - 1

PLAN_FIELDS = {
    "schemaVersion",
    "family",
    "fps",
    "sampleRate",
    "channels",
    "durationFrames",
    "cues",
}
CUE_FIELDS = {
    "eventSeq",
    "kind",
    "frame",
    "sampleIndex",
    "gain",
    "frequency",
    "durationMs",
}
PRESETS: dict[str, tuple[float, int, int]] = {
    "spawn": (0.18, 220, 120),
    "contact_enter": (0.42, 880, 90),
    "contact_exit": (0.24, 440, 70),
    "escape": (0.58, 1_320, 240),
    "terminal": (0.5, 1_760, 180),
}


class PipelineError(ValueError):
    """An input or quality-contract violation safe to report to the caller."""


def _reject_constant(value: str) -> None:
    raise PipelineError(f"non-finite JSON number is forbidden: {value}")


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise PipelineError(f"duplicate JSON field: {key}")
        result[key] = value
    return result


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _is_number(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
    )


def _exact_fields(value: Any, expected: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise PipelineError(f"{label} must be a JSON object")
    actual = set(value)
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    if missing or extra:
        raise PipelineError(
            f"{label} fields do not match schema; missing={missing}, extra={extra}"
        )
    return value


def _require_int(value: Any, minimum: int, maximum: int, label: str) -> int:
    if not _is_int(value) or value < minimum or value > maximum:
        raise PipelineError(f"{label} must be an integer in [{minimum}, {maximum}]")
    return value


def _canonical_path(raw: str, suffix: str, *, exists: bool) -> Path:
    if not raw or "\x00" in raw:
        raise PipelineError("path is empty or contains NUL")
    path = Path(raw)
    if not path.is_absolute():
        raise PipelineError(f"path must be absolute: {raw}")
    normalized = Path(os.path.abspath(path))
    if path != normalized or ".." in path.parts:
        raise PipelineError(f"path must be lexically canonical: {raw}")
    if path.suffix != suffix:
        raise PipelineError(f"path must end in {suffix}: {raw}")
    parent = path.parent
    if not parent.is_dir():
        raise PipelineError(f"path parent does not exist: {parent}")
    canonical_parent = Path(os.path.realpath(parent))
    canonical = canonical_parent / path.name
    if path.parent != canonical_parent:
        raise PipelineError(f"path must use its canonical parent: {raw}")
    if exists:
        if not path.is_file() or path.is_symlink():
            raise PipelineError(f"input must be a regular non-symlink file: {raw}")
        if Path(os.path.realpath(path)) != canonical:
            raise PipelineError(f"input path must be canonical: {raw}")
    elif path.is_symlink() or (path.exists() and not path.is_file()):
        raise PipelineError(f"output must be a regular non-symlink file path: {raw}")
    return canonical


def _same_directory(paths: list[Path]) -> None:
    if len({path.parent for path in paths}) != 1:
        raise PipelineError("all audio pipeline paths must share one directory")


def load_plan(path: Path) -> dict[str, Any]:
    size = path.stat().st_size
    if size <= 0 or size > MAX_PLAN_BYTES:
        raise PipelineError("audio plan size is outside the supported range")
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as error:
        raise PipelineError("audio plan must be valid UTF-8") from error
    try:
        value = json.loads(
            text,
            object_pairs_hook=_unique_object,
            parse_constant=_reject_constant,
        )
    except json.JSONDecodeError as error:
        raise PipelineError(f"invalid audio plan JSON: {error.msg}") from error
    return validate_plan(value)


def validate_plan(value: Any) -> dict[str, Any]:
    plan = _exact_fields(value, PLAN_FIELDS, "audio plan")
    literals = {
        "schemaVersion": SCHEMA_VERSION,
        "family": FAMILY,
        "fps": FPS,
        "sampleRate": SAMPLE_RATE,
        "channels": CHANNELS,
    }
    for field, expected in literals.items():
        if plan[field] != expected or (
            isinstance(expected, int) and not _is_int(plan[field])
        ):
            raise PipelineError(f"audio plan {field} must equal {expected!r}")
    duration_frames = _require_int(
        plan["durationFrames"],
        MIN_DURATION_FRAMES,
        MAX_DURATION_FRAMES,
        "audio plan durationFrames",
    )
    cues = plan["cues"]
    if not isinstance(cues, list) or not 1 <= len(cues) <= MAX_CUES:
        raise PipelineError(f"audio plan cues must contain 1..{MAX_CUES} entries")

    prior_seq = -1
    prior_frame = -1
    terminal_count = 0
    for index, raw_cue in enumerate(cues):
        cue = _exact_fields(raw_cue, CUE_FIELDS, f"cue[{index}]")
        event_seq = _require_int(cue["eventSeq"], 0, 255, f"cue[{index}].eventSeq")
        frame = _require_int(
            cue["frame"], 0, MAX_DURATION_FRAMES - 1, f"cue[{index}].frame"
        )
        sample_index = _require_int(
            cue["sampleIndex"],
            0,
            MAX_DURATION_FRAMES * SAMPLES_PER_FRAME - 1,
            f"cue[{index}].sampleIndex",
        )
        kind = cue["kind"]
        if not isinstance(kind, str) or kind not in PRESETS:
            raise PipelineError(f"cue[{index}].kind is unsupported")
        gain, frequency, preset_ms = PRESETS[kind]
        if not _is_number(cue["gain"]) or cue["gain"] != gain:
            raise PipelineError(f"cue[{index}].gain does not match {kind}")
        if not _is_number(cue["frequency"]) or cue["frequency"] != frequency:
            raise PipelineError(f"cue[{index}].frequency does not match {kind}")
        if not _is_number(cue["durationMs"]) or cue["durationMs"] <= 0:
            raise PipelineError(f"cue[{index}].durationMs must be finite and positive")
        remaining = (duration_frames - frame) * SAMPLES_PER_FRAME
        preset_samples = round(preset_ms * SAMPLE_RATE / 1_000)
        expected_duration_ms = min(preset_samples, remaining) * 1_000 / SAMPLE_RATE
        if cue["durationMs"] != expected_duration_ms:
            raise PipelineError(f"cue[{index}].durationMs does not match {kind}")
        if event_seq <= prior_seq:
            raise PipelineError("cue eventSeq values must be strictly increasing")
        if frame < prior_frame:
            raise PipelineError("cue frame values must be monotonic")
        if frame >= duration_frames:
            raise PipelineError(f"cue[{index}].frame is outside durationFrames")
        if sample_index != frame * SAMPLES_PER_FRAME:
            raise PipelineError(f"cue[{index}].sampleIndex must equal frame * 1600")
        if index == 0 and (kind != "spawn" or event_seq != 0):
            raise PipelineError("audio cues must start with event 0 spawn")
        if kind == "terminal":
            terminal_count += 1
            if index != len(cues) - 1:
                raise PipelineError("terminal cue must be last")
        prior_seq = event_seq
        prior_frame = frame

    if terminal_count > 1:
        raise PipelineError("audio plan may contain at most one terminal cue")
    if cues[-1]["kind"] not in {"escape", "terminal"}:
        raise PipelineError("audio cues must end with escape or terminal")
    return plan


def _cue_sample_count(cue: dict[str, Any]) -> int:
    # Valid plans express durations as an exact integer number of 48 kHz samples.
    return round(cue["durationMs"] * SAMPLE_RATE / 1_000)


def _triangle(phase: int) -> int:
    # Signed Q15 triangle: 0 -> +32767 -> 0 -> -32767 -> 0.
    quadrant = phase >> 30
    offset = (phase & ((1 << 30) - 1)) >> 15
    if quadrant == 0:
        return offset
    if quadrant == 1:
        return 32_767 - offset
    if quadrant == 2:
        return -offset
    return -32_767 + offset


def synthesize(plan: dict[str, Any]) -> array:
    sample_count = plan["durationFrames"] * SAMPLES_PER_FRAME
    mono = [0] * sample_count
    attack_samples = 96  # two milliseconds, fixed and deterministic
    release_samples = 480  # ten milliseconds, shortened for very short cues
    for cue in plan["cues"]:
        start = cue["sampleIndex"]
        length = _cue_sample_count(cue)
        gain_q15 = round(cue["gain"] * 32_767)
        phase = 0
        phase_step = round(cue["frequency"] * PHASE_SCALE / SAMPLE_RATE)
        attack = min(attack_samples, max(1, length // 4))
        release = min(release_samples, max(1, length // 3))
        for offset in range(length):
            if offset < attack:
                envelope_q15 = (offset * 32_767) // attack
            elif offset >= length - release:
                envelope_q15 = ((length - 1 - offset) * 32_767) // release
            else:
                envelope_q15 = 32_767
            tone = _triangle(phase)
            value = (tone * gain_q15 * envelope_q15) // (32_767 * 32_767)
            mono[start + offset] += value
            phase = (phase + phase_step) & PHASE_MASK

    stereo = array("h")
    for value in mono:
        clipped = min(PCM_MAX, max(PCM_MIN, value))
        stereo.append(clipped)
        stereo.append(clipped)
    if sys.byteorder != "little":
        stereo.byteswap()
    return stereo


def wav_bytes(samples: array) -> bytes:
    payload = samples.tobytes()
    byte_rate = SAMPLE_RATE * CHANNELS * 2
    block_align = CHANNELS * 2
    return b"".join(
        (
            b"RIFF",
            struct.pack("<I", 36 + len(payload)),
            b"WAVEfmt ",
            struct.pack("<IHHIIHH", 16, 1, CHANNELS, SAMPLE_RATE, byte_rate, block_align, 16),
            b"data",
            struct.pack("<I", len(payload)),
            payload,
        )
    )


def read_reference_wav(path: Path, expected_sample_count: int) -> array:
    raw = path.read_bytes()
    expected_data_bytes = expected_sample_count * CHANNELS * 2
    if len(raw) != 44 + expected_data_bytes:
        raise PipelineError("reference WAV has an unexpected byte length")
    if raw[:4] != b"RIFF" or raw[8:16] != b"WAVEfmt " or raw[36:40] != b"data":
        raise PipelineError("reference WAV must use the canonical PCM RIFF layout")
    riff_size = struct.unpack_from("<I", raw, 4)[0]
    fmt_size, audio_format, channels, rate, byte_rate, align, bits = struct.unpack_from(
        "<IHHIIHH", raw, 16
    )
    data_size = struct.unpack_from("<I", raw, 40)[0]
    if (
        riff_size != len(raw) - 8
        or fmt_size != 16
        or audio_format != 1
        or channels != CHANNELS
        or rate != SAMPLE_RATE
        or byte_rate != SAMPLE_RATE * CHANNELS * 2
        or align != CHANNELS * 2
        or bits != 16
        or data_size != expected_data_bytes
    ):
        raise PipelineError("reference WAV must be 48 kHz stereo PCM s16le")
    return _samples_from_bytes(raw[44:])


def _samples_from_bytes(raw: bytes) -> array:
    if len(raw) % 2:
        raise PipelineError("PCM byte length must be even")
    samples = array("h")
    samples.frombytes(raw)
    if sys.byteorder != "little":
        samples.byteswap()
    return samples


def read_pcm(path: Path, expected_sample_count: int) -> array:
    expected_bytes = expected_sample_count * CHANNELS * 2
    if path.stat().st_size != expected_bytes:
        raise PipelineError(
            f"decoded PCM must contain exactly {expected_sample_count} stereo samples"
        )
    return _samples_from_bytes(path.read_bytes())


def _mono(samples: array) -> list[int]:
    return [
        (int(samples[index]) + int(samples[index + 1])) // 2
        for index in range(0, len(samples), 2)
    ]


def _correlation(reference: list[int], decoded: list[int], start: int, end: int, lag: int, stride: int) -> float:
    lower = max(start, 0, -lag)
    upper = min(end, len(reference), len(decoded) - lag)
    if upper - lower < 128:
        return -1.0
    dot = 0
    ref_energy = 0
    decoded_energy = 0
    for index in range(lower, upper, stride):
        left = reference[index]
        right = decoded[index + lag]
        dot += left * right
        ref_energy += left * left
        decoded_energy += right * right
    if ref_energy == 0 or decoded_energy == 0:
        return -1.0
    return dot / math.sqrt(ref_energy * decoded_energy)


def _best_lag(
    reference: list[int],
    decoded: list[int],
    start: int,
    end: int,
    minimum: int,
    maximum: int,
    stride: int,
) -> tuple[int, float]:
    coarse_step = 16
    best_lag = minimum
    best_score = -1.0
    for lag in range(minimum, maximum + 1, coarse_step):
        score = _correlation(reference, decoded, start, end, lag, stride)
        if score > best_score:
            best_lag, best_score = lag, score
    refine_minimum = max(minimum, best_lag - coarse_step)
    refine_maximum = min(maximum, best_lag + coarse_step)
    for lag in range(refine_minimum, refine_maximum + 1):
        score = _correlation(reference, decoded, start, end, lag, stride)
        if score > best_score:
            best_lag, best_score = lag, score
    return best_lag, best_score


def _signal_metrics(samples: array) -> dict[str, Any]:
    peak_integer = 0
    square_sum = 0
    clipping_samples = 0
    for sample in samples:
        magnitude = abs(int(sample))
        peak_integer = max(peak_integer, magnitude)
        square_sum += int(sample) * int(sample)
        if sample in (PCM_MIN, PCM_MAX):
            clipping_samples += 1
    rms = math.sqrt(square_sum / len(samples)) / 32_768 if samples else 0.0
    return {
        "peak": round(peak_integer / 32_768, 8),
        "rms": round(rms, 8),
        "clippingSamples": clipping_samples,
    }


def analyze(plan: dict[str, Any], reference_samples: array, decoded_samples: array) -> dict[str, Any]:
    expected_samples = synthesize(plan)
    if reference_samples.tobytes() != expected_samples.tobytes():
        raise PipelineError("reference WAV does not match deterministic synthesis of plan")

    reference = _mono(reference_samples)
    decoded = _mono(decoded_samples)
    # A wider global search makes a two-frame edit observable instead of
    # aliasing to a periodic tone inside the one-frame acceptance window.
    global_lag, global_correlation = _best_lag(
        reference,
        decoded,
        0,
        len(reference),
        -3 * SAMPLES_PER_FRAME,
        3 * SAMPLES_PER_FRAME,
        32,
    )
    failures: list[str] = []
    if abs(global_lag) > SAMPLES_PER_FRAME:
        failures.append("global audio alignment exceeds one video frame")
    if global_correlation < 0.72:
        failures.append("decoded audio correlation is below threshold")

    cue_results: list[dict[str, Any]] = []
    for cue in plan["cues"]:
        expected_start = cue["sampleIndex"]
        expected_duration = _cue_sample_count(cue)
        expected_end = expected_start + expected_duration
        pad = 320
        onset_lag, onset_correlation = _best_lag(
            reference,
            decoded,
            expected_start - pad,
            min(expected_end + pad, len(reference)),
            -SAMPLES_PER_FRAME,
            SAMPLES_PER_FRAME,
            8,
        )
        tail_lag, tail_correlation = _best_lag(
            reference,
            decoded,
            max(expected_start, expected_end - 1_600),
            min(expected_end + 480, len(reference)),
            -SAMPLES_PER_FRAME,
            SAMPLES_PER_FRAME,
            4,
        )
        detected_start = expected_start + onset_lag
        detected_duration = expected_duration + tail_lag - onset_lag
        onset_error = detected_start - expected_start
        duration_error = detected_duration - expected_duration
        passed = (
            abs(onset_error) <= SAMPLES_PER_FRAME
            and abs(duration_error) <= SAMPLES_PER_FRAME
            and onset_correlation >= 0.68
            and tail_correlation >= 0.62
        )
        if not passed:
            failures.append(f"cue {cue['eventSeq']} failed timing/correlation checks")
        cue_results.append(
            {
                "eventSeq": cue["eventSeq"],
                "kind": cue["kind"],
                "expectedSample": expected_start,
                "detectedSample": detected_start,
                "onsetErrorSamples": onset_error,
                "onsetErrorFrames": round(onset_error / SAMPLES_PER_FRAME, 6),
                "expectedDurationSamples": expected_duration,
                "detectedDurationSamples": detected_duration,
                "durationErrorSamples": duration_error,
                "durationErrorFrames": round(duration_error / SAMPLES_PER_FRAME, 6),
                "correlation": round(onset_correlation, 6),
                "tailCorrelation": round(tail_correlation, 6),
                "status": "pass" if passed else "fail",
            }
        )

    decoded_metrics = _signal_metrics(decoded_samples)
    if decoded_metrics["clippingSamples"]:
        failures.append("decoded audio contains clipped samples")
    return {
        "status": "pass" if not failures else "fail",
        "metrics": {
            "sampleRate": SAMPLE_RATE,
            "channels": CHANNELS,
            "sampleCount": len(decoded),
            "globalLagSamples": global_lag,
            "globalLagFrames": round(global_lag / SAMPLES_PER_FRAME, 6),
            "globalCorrelation": round(global_correlation, 6),
            "reference": _signal_metrics(reference_samples),
            "decoded": decoded_metrics,
        },
        "cues": cue_results,
        "failures": failures,
    }


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="audio_pipeline.py", allow_abbrev=False)
    commands = parser.add_subparsers(dest="command", required=True)
    synth = commands.add_parser("synth", allow_abbrev=False)
    synth.add_argument("--plan", default="/workspace/audio-plan.json")
    synth.add_argument("--output", default="/workspace/audio.wav")
    analyze_parser = commands.add_parser("analyze", allow_abbrev=False)
    analyze_parser.add_argument("--plan", default="/workspace/audio-plan.json")
    analyze_parser.add_argument("--reference", default="/workspace/audio.wav")
    analyze_parser.add_argument("--pcm", default="/workspace/decoded-audio.pcm")
    return parser


def _emit(payload: dict[str, Any], stream: Any = sys.stdout) -> None:
    json.dump(payload, stream, sort_keys=True, separators=(",", ":"))
    stream.write("\n")


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        plan_path = _canonical_path(args.plan, ".json", exists=True)
        if args.command == "synth":
            output_path = _canonical_path(args.output, ".wav", exists=False)
            _same_directory([plan_path, output_path])
            plan = load_plan(plan_path)
            output = wav_bytes(synthesize(plan))
            output_path.write_bytes(output)
            _emit(
                {
                    "status": "pass",
                    "sampleCount": plan["durationFrames"] * SAMPLES_PER_FRAME,
                    "sha256": hashlib.sha256(output).hexdigest(),
                }
            )
            return 0

        reference_path = _canonical_path(args.reference, ".wav", exists=True)
        pcm_path = _canonical_path(args.pcm, ".pcm", exists=True)
        _same_directory([plan_path, reference_path, pcm_path])
        plan = load_plan(plan_path)
        sample_count = plan["durationFrames"] * SAMPLES_PER_FRAME
        report = analyze(
            plan,
            read_reference_wav(reference_path, sample_count),
            read_pcm(pcm_path, sample_count),
        )
        _emit(report)
        return 0 if report["status"] == "pass" else 1
    except (OSError, PipelineError) as error:
        _emit({"status": "fail", "error": str(error)}, sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
