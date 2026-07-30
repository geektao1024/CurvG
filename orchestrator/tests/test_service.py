from __future__ import annotations

import unittest

from app.models import PrepareRequest, ValidateCodeRequest
from app.service import prepare_animation, validate_animation_code


def valid_spec() -> dict:
    return {
        "schemaVersion": 5,
        "title": "A moving point proves the projection",
        "summary": "Track one point and its projection.",
        "durationSeconds": 6,
        "assumptions": ["The point moves on the unit circle."],
        "style": {"background": "#0B0D14", "palette": ["#7C8CFF", "#62D9C3"], "camera": "static"},
        "direction": {"preset": "geometric-proof", "frame": "16:9", "pacing": "balanced", "textPolicy": {"maxWordsPerObject": 8, "maxSimultaneousText": 2}},
        "objects": [
            {"id": "circle", "kind": "circle", "region": "graph"},
            {"id": "point", "kind": "point", "region": "graph"},
            {"id": "projection", "kind": "line", "region": "graph"},
        ],
        "timeline": [
            {"id": "draw", "shotId": "hook", "at": 0, "op": "draw", "ref": "circle", "runTime": 0.8},
            {"id": "move", "shotId": "proof", "at": 1, "op": "move_along", "ref": "point", "runTime": 3},
            {"id": "hold", "shotId": "payoff", "at": 4.2, "op": "emphasize", "ref": "projection", "runTime": 1},
        ],
        "shots": [
            {"id": "hook", "beat": "hook", "purpose": "show the circle", "startAt": 0, "endAt": 1, "focusRef": "circle", "transition": "build", "acceptance": ["circle visible"]},
            {"id": "proof", "beat": "proof", "purpose": "track projection", "startAt": 1, "endAt": 4.2, "focusRef": "point", "transition": "morph", "acceptance": ["point moves"]},
            {"id": "payoff", "beat": "payoff", "purpose": "resolve", "startAt": 4.2, "endAt": 6, "focusRef": "projection", "transition": "hold", "acceptance": ["projection clear"]},
        ],
        "mathDossier": {
            "coreClaim": "The projection is the x-coordinate.",
            "invariants": ["The point remains on the unit circle."],
            "commonMisreading": "The line length is not the angle.",
            "visualProof": "Move the point and keep the projection endpoint synchronized.",
            "definitions": [{"concept": "projection", "statement": "x-coordinate"}],
            "derivationSteps": ["Write the point as (cos t, sin t)."],
            "checks": [{"claim": "At t=0, x=1", "method": "substitute t=0", "expected": "1"}],
            "limitations": ["Uses the unit circle."],
        },
    }


class OrchestrationServiceTests(unittest.TestCase):
    def test_prepare_builds_visual_contract_and_templates(self) -> None:
        response = prepare_animation(
            PrepareRequest(
                protocolVersion="curvg.orchestrator/v1",
                animationId="animation-1",
                prompt="Show projection on a circle",
                spec=valid_spec(),
                mode="initial",
            )
        )
        self.assertEqual(response.visualContract.contractVersion, "curvg.visual/v1")
        self.assertEqual(response.templates[0].id, "geometric-construction")
        self.assertIn("visible motion by 1.0s", response.generationBrief)
        self.assertFalse(any(item.severity == "blocking" for item in response.diagnostics))

    def test_ast_validation_returns_targeted_repair(self) -> None:
        prepared = prepare_animation(
            PrepareRequest(
                protocolVersion="curvg.orchestrator/v1",
                animationId="animation-1",
                prompt="Show projection on a circle",
                spec=valid_spec(),
                mode="initial",
            )
        )
        result = validate_animation_code(
            ValidateCodeRequest(
                protocolVersion="curvg.orchestrator/v1",
                animationId="animation-1",
                spec=valid_spec(),
                visualContract=prepared.visualContract,
                code="from manim import *\nimport os\nclass CurvGScene(Scene):\n    def construct(self):\n        self.play(FadeIn(Dot()))\n        self.wait(1)\n" + "# padding\n" * 8,
            )
        )
        self.assertFalse(result.valid)
        self.assertIn("blocked_import", result.repairDirective or "")
        self.assertIn("insufficient_motion", result.repairDirective or "")


if __name__ == "__main__":
    unittest.main()
