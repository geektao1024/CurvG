import ast
import sys
from pathlib import Path


ALLOWED_MODULES = {"manim", "math", "numpy"}
BLOCKED_CALLS = {"compile", "eval", "exec", "input", "open", "__import__"}


def root_name(node: ast.AST) -> str | None:
    while isinstance(node, ast.Attribute):
        node = node.value
    return node.id if isinstance(node, ast.Name) else None


def validate(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))
    scene_found = False
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            if any(alias.name.split(".")[0] not in ALLOWED_MODULES for alias in node.names):
                raise ValueError("Generated code imports a blocked module")
        if isinstance(node, ast.ImportFrom):
            module = (node.module or "").split(".")[0]
            if module not in ALLOWED_MODULES:
                raise ValueError("Generated code imports a blocked module")
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in BLOCKED_CALLS:
                raise ValueError("Generated code calls a blocked function")
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise ValueError("Generated code accesses a blocked attribute")
        if isinstance(node, ast.Call) and root_name(node.func) in {"os", "pathlib", "socket", "subprocess"}:
            raise ValueError("Generated code calls a blocked API")
        if isinstance(node, ast.ClassDef) and node.name == "CurvGScene":
            scene_found = any(
                isinstance(base, ast.Name) and base.id == "Scene" for base in node.bases
            )
    if not scene_found:
        raise ValueError("CurvGScene(Scene) is required")


if __name__ == "__main__":
    validate(Path(sys.argv[1]))
