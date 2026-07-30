from __future__ import annotations

from dataclasses import dataclass

from .models import AnimationSpec, TemplateMatch


@dataclass(frozen=True)
class TemplateDefinition:
    id: str
    keywords: frozenset[str]
    object_kinds: frozenset[str]
    required_objects: tuple[str, ...]
    preferred_actions: tuple[str, ...]


TEMPLATES = (
    TemplateDefinition(
        "coordinate-function-proof",
        frozenset({"function", "graph", "slope", "limit", "derivative", "integral", "curve"}),
        frozenset({"axes", "curve", "area", "point", "line"}),
        ("axes", "curve", "point"),
        ("draw", "move_along", "transform", "spotlight"),
    ),
    TemplateDefinition(
        "geometric-construction",
        frozenset({"circle", "triangle", "geometry", "projection", "angle", "proof"}),
        frozenset({"circle", "point", "line", "arrow", "arc"}),
        ("point", "line"),
        ("draw", "move_along", "emphasize", "camera_focus"),
    ),
    TemplateDefinition(
        "algebra-transformation",
        frozenset({"equation", "algebra", "identity", "solve", "matrix", "transform"}),
        frozenset({"formula", "matrix", "series"}),
        ("formula",),
        ("write", "transform", "emphasize", "hold"),
    ),
    TemplateDefinition(
        "sequence-comparison",
        frozenset({"sequence", "series", "sort", "compare", "probability", "data"}),
        frozenset({"series", "area", "point", "arrow"}),
        ("series",),
        ("fade_in", "transform", "emphasize", "hold"),
    ),
    TemplateDefinition(
        "abstract-concept-map",
        frozenset({"vector", "topology", "complex", "eigenvalue", "space", "mapping"}),
        frozenset({"point", "line", "arrow", "formula"}),
        ("point", "arrow"),
        ("draw", "transform", "camera_focus", "camera_reset"),
    ),
)


def retrieve_templates(spec: AnimationSpec, prompt: str, limit: int = 3) -> list[TemplateMatch]:
    text = f"{prompt} {spec.title} {spec.summary} {spec.mathDossier.coreClaim}".lower()
    kinds = {item.kind.lower() for item in spec.objects}
    ranked: list[tuple[float, TemplateDefinition, list[str]]] = []
    for template in TEMPLATES:
        keyword_hits = sorted(word for word in template.keywords if word in text)
        kind_hits = sorted(template.object_kinds.intersection(kinds))
        score = len(keyword_hits) * 1.5 + len(kind_hits) * 2.0
        if all(required in kinds for required in template.required_objects):
            score += 2.5
        reason_parts = []
        if kind_hits:
            reason_parts.append(f"objects: {', '.join(kind_hits)}")
        if keyword_hits:
            reason_parts.append(f"concepts: {', '.join(keyword_hits[:5])}")
        ranked.append((score, template, reason_parts))
    ranked.sort(key=lambda item: (-item[0], item[1].id))
    return [
        TemplateMatch(
            id=template.id,
            score=round(score, 2),
            reason="; ".join(reason_parts) or "general visual compatibility",
            requiredObjects=list(template.required_objects),
            preferredActions=list(template.preferred_actions),
        )
        for score, template, reason_parts in ranked[:limit]
    ]
