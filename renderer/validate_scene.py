import ast
import sys
from pathlib import Path


ALLOWED_MODULES = {"manim", "math", "numpy"}
BLOCKED_CALLS = {"compile", "eval", "exec", "input", "open", "__import__"}
BLOCKED_UPDATE_METHODS = {"add_updater"}
BLOCKED_MANIM_ATTRIBUTES = {
    "axis_lines",
    "get_axis_lines",
    "get_grid_line",
    "get_grid_lines",
    "get_scale_factor",
    "grid_line",
}
ALLOWED_DUNDER_ATTRIBUTES = {"__init__", "__call__"}
FRAME_CALLBACKS = {"__call__", "interpolate_mobject", "update", "updater"}
EXPENSIVE_FRAME_CONSTRUCTORS = {"MathTex", "Tex", "Text"}
EXPENSIVE_FRAME_METHODS = {"refresh_bounding_box", "set_text"}
TEXT_POSITION_METHODS = {
    "align_to",
    "match_height",
    "match_width",
    "move_to",
    "next_to",
    "scale",
    "scale_to_fit_height",
    "scale_to_fit_width",
    "shift",
    "to_corner",
    "to_edge",
}


def root_name(node: ast.AST) -> str | None:
    while isinstance(node, ast.Attribute):
        node = node.value
    return node.id if isinstance(node, ast.Name) else None


def numeric_value(node: ast.AST, constants: dict[str, float]) -> float | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.Name):
        return constants.get(node.id)
    return None


def coordinate_y(node: ast.AST, constants: dict[str, float]) -> float | None:
    if not isinstance(node, (ast.List, ast.Tuple)) or len(node.elts) < 2:
        return None
    return numeric_value(node.elts[1], constants)


def has_explicit_run_time(node: ast.AST) -> bool:
    return isinstance(node, ast.Call) and any(
        keyword.arg == "run_time" for keyword in node.keywords
    )


def validate(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))
    compile(tree, str(path), "exec")
    constants: dict[str, float] = {}
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
        ):
            value = numeric_value(node.value, constants)
            if value is not None:
                constants[node.targets[0].id] = value
    directly_displayed: set[str] = set()
    fade_in_targets: set[str] = set()
    hidden_targets: set[str] = set()
    transform_sources: set[str] = set()
    transform_targets: set[str] = set()
    transform_aliases: set[tuple[str, str]] = set()
    text_mobjects: set[str] = set()
    positioned_text_mobjects: set[str] = set()
    scene_found = False
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
            and isinstance(node.value, ast.Call)
            and isinstance(node.value.func, ast.Name)
            and node.value.func.id in EXPENSIVE_FRAME_CONSTRUCTORS
        ):
            text_mobjects.add(node.targets[0].id)
        if (
            isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
            and isinstance(node.value, ast.Name)
        ):
            transform_aliases.add((node.targets[0].id, node.value.id))
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in FRAME_CALLBACKS:
            for child in ast.walk(node):
                if (
                    isinstance(child, ast.Call)
                    and isinstance(child.func, ast.Name)
                    and child.func.id in EXPENSIVE_FRAME_CONSTRUCTORS
                ):
                    raise ValueError(
                        "Generated code constructs text inside a frame callback"
                    )
                if (
                    isinstance(child, ast.Call)
                    and isinstance(child.func, ast.Attribute)
                    and child.func.attr in EXPENSIVE_FRAME_METHODS
                ):
                    raise ValueError(
                        "Generated code mutates text inside a frame callback"
                    )
                if (
                    isinstance(child, ast.Call)
                    and isinstance(child.func, ast.Attribute)
                    and child.func.attr == "become"
                    and any(
                        isinstance(argument, ast.Call)
                        and isinstance(argument.func, ast.Name)
                        and argument.func.id in EXPENSIVE_FRAME_CONSTRUCTORS
                        for argument in child.args
                    )
                ):
                    raise ValueError(
                        "Generated code replaces text inside a frame callback"
                    )
        if isinstance(node, ast.Import):
            if any(alias.name.split(".")[0] not in ALLOWED_MODULES for alias in node.names):
                raise ValueError("Generated code imports a blocked module")
        if isinstance(node, ast.ImportFrom):
            module = (node.module or "").split(".")[0]
            if module not in ALLOWED_MODULES:
                raise ValueError("Generated code imports a blocked module")
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in {"Create", "FadeIn", "Write"}:
                    directly_displayed.update(
                        argument.id
                        for argument in node.args
                        if isinstance(argument, ast.Name)
                    )
                if node.func.id == "FadeIn":
                    fade_in_targets.update(
                        argument.id
                        for argument in node.args
                        if isinstance(argument, ast.Name)
                    )
                if (
                    node.func.id == "Transform"
                    and len(node.args) >= 2
                    and isinstance(node.args[0], ast.Name)
                    and isinstance(node.args[1], ast.Name)
                ):
                    transform_sources.add(node.args[0].id)
                    transform_targets.add(node.args[1].id)
            if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_CALLS:
                raise ValueError("Generated code calls a blocked function")
            if (
                isinstance(node.func, ast.Attribute)
                and node.func.attr in BLOCKED_UPDATE_METHODS
            ):
                raise ValueError("Generated code installs a frame updater")
            if (
                isinstance(node.func, ast.Attribute)
                and node.func.attr in BLOCKED_MANIM_ATTRIBUTES
            ):
                raise ValueError("Generated code calls an unsupported Manim API")
            if (
                isinstance(node.func, ast.Attribute)
                and node.func.attr in TEXT_POSITION_METHODS
                and isinstance(node.func.value, ast.Name)
            ):
                positioned_text_mobjects.add(node.func.value.id)
                if (
                    node.func.attr == "move_to"
                    and node.func.value.id in text_mobjects
                    and node.args
                ):
                    y = coordinate_y(node.args[0], constants)
                    if y is not None and abs(y) > 3.4:
                        raise ValueError(
                            "Generated code positions text outside the safe frame"
                        )
            if (
                isinstance(node.func, ast.Attribute)
                and node.func.attr == "set_opacity"
                and isinstance(node.func.value, ast.Name)
                and node.args
                and numeric_value(node.args[0], constants) == 0
            ):
                hidden_targets.add(node.func.value.id)
            if (
                isinstance(node.func, ast.Attribute)
                and node.func.attr == "play"
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "self"
            ):
                has_play_run_time = any(
                    keyword.arg == "run_time" for keyword in node.keywords
                )
                if not node.args or (
                    not has_play_run_time
                    and not all(
                        has_explicit_run_time(argument) for argument in node.args
                    )
                ):
                    raise ValueError("Generated code omits self.play run_time")
            if (
                isinstance(node.func, ast.Attribute)
                and node.func.attr == "wait"
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "self"
                and node.args
            ):
                duration = numeric_value(node.args[0], constants)
                if duration is not None and duration <= 0:
                    raise ValueError("Generated code uses a non-positive wait")
            for keyword in node.keywords:
                if keyword.arg != "run_time":
                    continue
                run_time = numeric_value(keyword.value, constants)
                if run_time is not None and run_time <= 0:
                    raise ValueError("Generated code uses a non-positive run_time")
        if (
            isinstance(node, ast.Attribute)
            and node.attr.startswith("__")
            and node.attr not in ALLOWED_DUNDER_ATTRIBUTES
        ):
            raise ValueError("Generated code accesses a blocked attribute")
        if (
            isinstance(node, ast.Attribute)
            and node.attr == "frame"
            and isinstance(node.value, ast.Attribute)
            and node.value.attr == "camera"
            and isinstance(node.value.value, ast.Name)
            and node.value.value.id == "self"
        ):
            raise ValueError("Generated code accesses self.camera.frame on Scene")
        if isinstance(node, ast.Call) and root_name(node.func) in {"os", "pathlib", "socket", "subprocess"}:
            raise ValueError("Generated code calls a blocked API")
        if isinstance(node, ast.ClassDef) and node.name == "CurvGScene":
            scene_found = any(
                isinstance(base, ast.Name) and base.id == "Scene" for base in node.bases
            )
    if hidden_targets & fade_in_targets:
        raise ValueError("Generated code hides an object before FadeIn")
    if (transform_sources & transform_targets) - directly_displayed:
        raise ValueError("Generated code reuses an undisplayed Transform target")
    if any(
        source in transform_sources and target in transform_targets
        for source, target in transform_aliases
    ):
        raise ValueError("Generated code reassigns a Transform source to a target")
    if (transform_targets & text_mobjects) - positioned_text_mobjects:
        raise ValueError("Generated code does not position a text Transform target")
    if not scene_found:
        raise ValueError("CurvGScene(Scene) is required")


if __name__ == "__main__":
    validate(Path(sys.argv[1]))
