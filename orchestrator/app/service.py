from __future__ import annotations

import json

from .contracts import build_visual_contract
from .models import (
    PrepareRequest,
    PrepareResponse,
    ValidateCodeRequest,
    ValidateCodeResponse,
)
from .templates import retrieve_templates
from .validation import repair_directive, validate_python_source, validate_spec


def build_generation_brief(request: PrepareRequest, response: PrepareResponse) -> str:
    contract = response.visualContract
    template_lines = [
        f"- {item.id} ({item.score}): {item.reason}; preferred actions: {', '.join(item.preferredActions)}"
        for item in response.templates
    ]
    blocking = [item for item in response.diagnostics if item.severity == "blocking"]
    evidence = request.failureEvidence.strip() if request.failureEvidence else "none"
    return "\n".join(
        [
            "CURVG ORCHESTRATION CONTRACT (mandatory)",
            f"Protocol: {response.protocolVersion}; visual contract: {contract.contractVersion}",
            f"Frame: {contract.frame.aspectRatio}, {contract.frame.targetWidth}x{contract.frame.targetHeight}@30fps; normalized safe zone {list(contract.frame.safeZone)}.",
            f"Hook: visible motion by {contract.hook.deadlineSeconds:.1f}s. Payoff: resolved visual begins in the final third.",
            f"Text: at most {contract.text.maxWordsPerObject} words per prose object and {contract.text.maxSimultaneousObjects} simultaneous text objects. Geometry and motion carry the explanation.",
            "Use one dominant visual action per beat. Reuse explicit addressable objects; do not replace visual proof with prose.",
            "Template retrieval:",
            *(template_lines or ["- no template match; use the approved scene IR directly"]),
            f"Deterministic blocking diagnostics before code generation: {len(blocking)}.",
            f"Repair evidence: {evidence[:4000]}",
            "The renderer remains authoritative for execution and frame evidence. This contract is a pre-render gate, not proof that Manim will succeed.",
        ]
    )


def prepare_animation(request: PrepareRequest) -> PrepareResponse:
    contract = build_visual_contract(request.spec)
    diagnostics = validate_spec(request.spec, contract)
    response = PrepareResponse(
        visualContract=contract,
        templates=retrieve_templates(request.spec, request.prompt),
        diagnostics=diagnostics,
        generationBrief="pending",
    )
    response.generationBrief = build_generation_brief(request, response)
    return response


def validate_animation_code(request: ValidateCodeRequest) -> ValidateCodeResponse:
    diagnostics = [
        *validate_spec(request.spec, request.visualContract),
        *validate_python_source(request.code, request.visualContract),
    ]
    directive = repair_directive(diagnostics)
    return ValidateCodeResponse(
        valid=directive is None,
        diagnostics=diagnostics,
        repairDirective=directive,
    )


def compact_log_payload(response: PrepareResponse | ValidateCodeResponse) -> str:
    payload = response.model_dump(mode="json")
    payload.pop("generationBrief", None)
    payload.pop("repairDirective", None)
    return json.dumps(payload, separators=(",", ":"))[:4000]
