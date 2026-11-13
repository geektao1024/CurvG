"""Exit when idle so a Cloudflare Container stops billing.

Cloudflare's `sleepAfter` only sends SIGTERM and keeps renewing, so a
container left alone ran a 1 GiB instance around the clock from
2026-11-06 to 2026-11-13 (`containersUsageAdaptiveGroups`: ~24 GiB-hours
a day). Playbook: "Cloudflare Containers 不会自己停" — the process exits by
itself after 60 s idle and after a 10-minute lifetime.
"""

from __future__ import annotations

import os
import signal
import threading
import time

IDLE_EXIT_SECONDS = float(os.environ.get("IDLE_EXIT_SECONDS", "60"))
MAX_LIFETIME_SECONDS = float(os.environ.get("MAX_LIFETIME_SECONDS", "600"))
# After the lifetime, wait this long for in-flight requests, then exit anyway.
LIFETIME_GRACE_SECONDS = 60.0
CHECK_EVERY_SECONDS = 5.0


def should_exit(
    *,
    now: float,
    started_at: float,
    last_activity: float,
    in_flight: int,
    idle_seconds: float = IDLE_EXIT_SECONDS,
    max_lifetime: float = MAX_LIFETIME_SECONDS,
) -> bool:
    age = now - started_at
    if age >= max_lifetime + LIFETIME_GRACE_SECONDS:
        return True
    if in_flight > 0:
        return False
    return now - last_activity >= idle_seconds or age >= max_lifetime


class Activity:
    """Counts in-flight requests and remembers when the last one ended."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.started_at = time.monotonic()
        self.last_activity = self.started_at
        self.in_flight = 0

    def begin(self) -> None:
        with self._lock:
            self.in_flight += 1
            self.last_activity = time.monotonic()

    def end(self) -> None:
        with self._lock:
            self.in_flight = max(0, self.in_flight - 1)
            self.last_activity = time.monotonic()

    def snapshot(self) -> tuple[float, float, int]:
        with self._lock:
            return self.started_at, self.last_activity, self.in_flight


def start_watchdog(activity: Activity) -> threading.Thread:
    """SIGTERM ourselves when idle (uvicorn shuts down gracefully); hard
    exit if that has not finished 20 s later."""

    def run() -> None:
        while True:
            time.sleep(CHECK_EVERY_SECONDS)
            started_at, last_activity, in_flight = activity.snapshot()
            if should_exit(
                now=time.monotonic(),
                started_at=started_at,
                last_activity=last_activity,
                in_flight=in_flight,
            ):
                print("[orchestrator] exiting: idle or lifetime reached", flush=True)
                os.kill(os.getpid(), signal.SIGTERM)
                time.sleep(20)
                os._exit(0)

    thread = threading.Thread(target=run, name="idle-exit", daemon=True)
    thread.start()
    return thread
