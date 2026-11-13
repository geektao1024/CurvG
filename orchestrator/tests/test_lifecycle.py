from __future__ import annotations

import unittest

from app.lifecycle import Activity, should_exit


class ShouldExitTest(unittest.TestCase):
    def check(self, **kwargs) -> bool:
        base = dict(now=100.0, started_at=0.0, last_activity=90.0, in_flight=0,
                    idle_seconds=60.0, max_lifetime=600.0)
        base.update(kwargs)
        return should_exit(**base)

    def test_stays_up_while_recently_used(self) -> None:
        self.assertFalse(self.check(now=100.0, last_activity=90.0))

    def test_exits_after_idle(self) -> None:
        self.assertTrue(self.check(now=151.0, last_activity=90.0))

    def test_never_idles_out_with_a_request_in_flight(self) -> None:
        self.assertFalse(self.check(now=500.0, last_activity=90.0, in_flight=1))

    def test_lifetime_waits_for_requests_then_forces(self) -> None:
        self.assertTrue(self.check(now=600.0, last_activity=599.0))
        self.assertFalse(self.check(now=630.0, last_activity=599.0, in_flight=1))
        self.assertTrue(self.check(now=661.0, last_activity=660.0, in_flight=1))

    def test_activity_counts_requests(self) -> None:
        activity = Activity()
        activity.begin()
        activity.begin()
        activity.end()
        _, _, in_flight = activity.snapshot()
        self.assertEqual(in_flight, 1)
        activity.end()
        activity.end()
        self.assertEqual(activity.snapshot()[2], 0)


if __name__ == "__main__":
    unittest.main()
