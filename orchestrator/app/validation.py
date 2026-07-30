from __future__ import annotations

import ast
import re

from .models import AnimationSpec, Diagnostic, VisualContract


ALLOWED_MODULES = {"manim", "math", "numpy"}
BLOCKED_CALLS = {
    "__import__",
    "compile",
    "delattr",
    "eval",
    "exec",
    "getattr",
    "globals",
    "input",
    "locals",
    "open",
    "setattr",
    "vars",
}
BLOCKED_ATTRIBUTES = {"add_updater", "get_scale_factor"}
SCENE_BASES = {"Scene", "MovingCameraScene", "ThreeDScene"}
VISIBLE_OPS = {"draw", "write", "fade_in", "transform", "move_along", "emphasize", "glow"}


def diagnostic(
    code: str,
    severity: str,
    stage: str,
    message: str,
    path: str | None = None,
) -> Diagnostic:
    return Diagnostic(code=code, severity=severity, stage=stage, message=message, path=path)


def validate_spec(spec: AnimationSpec, contract: VisualContract) -> list[Diagnostic]:
    issues: list[Diagnostic] = []
    object_ids = {item.id for item in spec.objects}
    shot_ids = {item.id for item in spec.shots}
    for index, event in enumerate(spec.timeline):
        if event.ref not in object_ids:
            issues.append(diagnostic("unknown_object_ref", "blocking", "spec", f"Timeline references unknown object {event.ref}", f"timeline.{index}.ref"))
        if event.shotId not in shot_ids:
            issues.append(diagnostic("unknown_shot_ref", "blocking", "spec", f"Timeline references unknown shot {event.shotId}", f"timeline.{index}.shotId"))
        if event.at + event.runTime > spec.durationSeconds + 0.001:
            issues.append(diagnostic("event_outside_duration", "blocking", "spec", "Timeline event exceeds the declared duration", f"timeline.{index}"))

    ordered_shots = sorted(spec.shots, key=lambda item: item.startAt)
    if ordered_shots[0].startAt > 0.001:
        issues.append(diagnostic("late_storyboard_start", "blocking", "visual", "The first shot must start at zero", "shots.0.startAt"))
    if ordered_shots[-1].endAt < spec.durationSeconds - 0.05:
        issues.append(diagnostic("missing_payoff_hold", "warning", "visual", "The storyboard ends before the declared duration", "shots"))
    for index, shot in enumerate(ordered_shots):
        if shot.endAt <= shot.startAt:
            issues.append(diagnostic("invalid_shot_duration", "blocking", "spec", "Shot end must be after its start", f"shots.{index}"))
        if index and shot.startAt < ordered_shots[index - 1].endAt - 0.001:
            issues.append(diagnostic("overlapping_shots", "blocking", "spec", "Storyboard shots overlap", f"shots.{index}"))
        visible = [event for event in spec.timeline if event.shotId == shot.id and event.op in VISIBLE_OPS]
        if not visible:
            issues.append(diagnostic("shot_without_visible_action", "blocking", "visual", f"Shot {shot.id} has no visible action", f"shots.{index}"))

    first_motion = min((event.at for event in spec.timeline if event.op in VISIBLE_OPS), default=999.0)
    if first_motion > contract.hook.deadlineSeconds:
        issues.append(diagnostic("missing_first_second_hook", "blocking", "visual", "Visible motion must begin within the first second", "timeline"))
    payoff_deadline = spec.durationSeconds * contract.payoff.startRatio
    if not any(shot.startAt >= payoff_deadline - 0.5 and shot.beat in {"payoff", "memory"} for shot in spec.shots):
        issues.append(diagnostic("missing_payoff", "warning", "visual", "The final third needs an explicit payoff or memory shot", "shots"))

    dossier = spec.mathDossier
    if not dossier.definitions or not dossier.derivationSteps or not dossier.checks:
        issues.append(diagnostic("incomplete_math_contract", "blocking", "math", "Definitions, derivation steps, and independent checks are required", "mathDossier"))
    if not dossier.limitations:
        issues.append(diagnostic("missing_math_scope", "warning", "math", "State at least one mathematical limitation or scope boundary", "mathDossier.limitations"))
    if not dossier.visualProof.strip():
        issues.append(diagnostic("missing_visual_proof", "blocking", "math", "The mathematical claim needs an explicit visual proof mechanism", "mathDossier.visualProof"))

    for index, item in enumerate(spec.objects):
        if item.kind in {"text", "formula"} and item.text:
            words = re.findall(r"\S+", item.text)
            if item.kind == "text" and len(words) > contract.text.maxWordsPerObject:
                issues.append(diagnostic("text_budget_exceeded", "warning", "visual", f"Text object {item.id} exceeds the visual text budget", f"objects.{index}.text"))
    return issues


def validate_python_source(code: str, contract: VisualContract) -> list[Diagnostic]:
    issues: list[Diagnostic] = []
    try:
        tree = ast.parse(code)
        compile(tree, "<curvg-scene>", "exec")
    except (SyntaxError, ValueError) as exc:
        return [diagnostic("python_syntax", "blocking", "code", f"Python source is invalid: {exc}")]

    scene_found = False
    visible_play_calls = 0
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == "CurvGScene":
            if len(node.bases) == 1 and isinstance(node.bases[0], ast.Name) and node.bases[0].id in SCENE_BASES:
                scene_found = True
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] not in ALLOWED_MODULES:
                    issues.append(diagnostic("blocked_import", "blocking", "code", f"Import {alias.name} is not allowed"))
        elif isinstance(node, ast.ImportFrom):
            module = (node.module or "").split(".")[0]
            if module not in ALLOWED_MODULES:
                issues.append(diagnostic("blocked_import", "blocking", "code", f"Import from {node.module} is not allowed"))
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_CALLS:
                issues.append(diagnostic("blocked_call", "blocking", "code", f"Call {node.func.id} is not allowed"))
            if isinstance(node.func, ast.Attribute):
                if node.func.attr in BLOCKED_ATTRIBUTES:
                    issues.append(diagnostic("blocked_attribute", "blocking", "code", f"Method {node.func.attr} is not allowed"))
                if node.func.attr == "play":
                    visible_play_calls += 1
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            value = node.value.strip()
            if "://" in value or value.startswith(("/", "~")) or "../" in value:
                issues.append(diagnostic("external_resource", "blocking", "code", "External paths and URLs are not allowed"))
            words = re.findall(r"\S+", value)
            if len(words) > contract.text.maxWordsPerObject * 3:
                issues.append(diagnostic("long_on_screen_copy", "warning", "visual", "A source string is too long for the visual text policy"))
    if not scene_found:
        issues.append(diagnostic("missing_scene", "blocking", "code", "CurvGScene must inherit one supported Manim scene base"))
    if visible_play_calls < 2:
        issues.append(diagnostic("insufficient_motion", "blocking", "visual", "The scene needs at least two explicit animation beats"))
    return issues


def repair_directive(issues: list[Diagnostic]) -> str | None:
    blocking = [item for item in issues if item.severity == "blocking"]
    if not blocking:
        return None
    lines = [
        "Repair only the following deterministic contract failures. Preserve correct mathematics, object ids, palette, and already-valid timing:",
    ]
    lines.extend(f"- [{item.code}] {item.message}" for item in blocking[:12])
    lines.append("Return one complete self-contained CurvGScene Python module and no Markdown.")
    return "\n".join(lines)
