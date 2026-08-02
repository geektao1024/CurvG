from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


PROTOCOL_VERSION = "curvg.orchestrator/v1"
VISUAL_CONTRACT_VERSION = "curvg.visual/v1"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ForwardCompatibleModel(BaseModel):
    model_config = ConfigDict(extra="allow")


class StyleSpec(ForwardCompatibleModel):
    background: str
    palette: list[str] = Field(min_length=1, max_length=12)
    camera: str = "static"


class TextPolicy(ForwardCompatibleModel):
    maxWordsPerObject: int = Field(default=8, ge=1, le=24)
    maxSimultaneousText: int = Field(default=2, ge=1, le=6)


class DirectionSpec(ForwardCompatibleModel):
    preset: str = "clean-classroom"
    frame: Literal["16:9", "9:16"] = "16:9"
    pacing: str = "balanced"
    textPolicy: TextPolicy = Field(default_factory=TextPolicy)


class ObjectSpec(ForwardCompatibleModel):
    id: str = Field(min_length=1, max_length=80)
    kind: str = Field(min_length=1, max_length=40)
    region: str | None = None
    text: str | None = None


class TimelineEvent(ForwardCompatibleModel):
    id: str = Field(min_length=1, max_length=80)
    shotId: str = Field(min_length=1, max_length=80)
    at: float = Field(ge=0, le=300)
    op: str = Field(min_length=1, max_length=40)
    ref: str = Field(min_length=1, max_length=80)
    runTime: float = Field(gt=0, le=60)


class ShotSpec(ForwardCompatibleModel):
    id: str = Field(min_length=1, max_length=80)
    beat: str
    purpose: str
    startAt: float = Field(ge=0, le=300)
    endAt: float = Field(gt=0, le=300)
    focusRef: str
    transition: str
    acceptance: list[str] = Field(default_factory=list, max_length=12)


class MathCheck(ForwardCompatibleModel):
    claim: str
    method: str
    expected: str


class MathDossier(ForwardCompatibleModel):
    coreClaim: str
    invariants: list[str] = Field(default_factory=list)
    commonMisreading: str = ""
    visualProof: str
    definitions: list[dict[str, Any]] = Field(default_factory=list)
    derivationSteps: list[str] = Field(default_factory=list)
    checks: list[MathCheck] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class AnimationSpec(ForwardCompatibleModel):
    # Schema 6 adds dossier-owned formulas, knowledge depth/assumed/visualSeed
    # and spine; the orchestrator's checks read shared v5 fields, and
    # ForwardCompatibleModel already tolerates the additions.
    schemaVersion: int = Field(default=5, ge=5, le=6)
    title: str = Field(min_length=1, max_length=160)
    summary: str = Field(min_length=1, max_length=1200)
    durationSeconds: float = Field(gt=0, le=180)
    assumptions: list[str] = Field(default_factory=list, max_length=30)
    style: StyleSpec
    direction: DirectionSpec = Field(default_factory=DirectionSpec)
    objects: list[ObjectSpec] = Field(min_length=1, max_length=160)
    timeline: list[TimelineEvent] = Field(min_length=1, max_length=400)
    shots: list[ShotSpec] = Field(min_length=1, max_length=20)
    mathDossier: MathDossier

    @field_validator("objects")
    @classmethod
    def unique_object_ids(cls, objects: list[ObjectSpec]) -> list[ObjectSpec]:
        ids = [item.id for item in objects]
        if len(ids) != len(set(ids)):
            raise ValueError("object ids must be unique")
        return objects

    @field_validator("shots")
    @classmethod
    def unique_shot_ids(cls, shots: list[ShotSpec]) -> list[ShotSpec]:
        ids = [item.id for item in shots]
        if len(ids) != len(set(ids)):
            raise ValueError("shot ids must be unique")
        return shots


class PrepareRequest(StrictModel):
    protocolVersion: Literal["curvg.orchestrator/v1"]
    animationId: str = Field(pattern=r"^[A-Za-z0-9-]{1,80}$")
    prompt: str = Field(min_length=1, max_length=12_000)
    spec: AnimationSpec
    mode: Literal["initial", "repair"]
    currentCode: str | None = Field(default=None, max_length=60_000)
    failureEvidence: str | None = Field(default=None, max_length=12_000)


class Diagnostic(StrictModel):
    code: str
    severity: Literal["info", "warning", "blocking"]
    stage: Literal["spec", "math", "visual", "code"]
    message: str
    path: str | None = None


class FrameContract(StrictModel):
    aspectRatio: Literal["16:9", "9:16"]
    safeZone: tuple[float, float, float, float]
    targetWidth: int
    targetHeight: int
    frameRate: Literal[30] = 30


class HookContract(StrictModel):
    deadlineSeconds: float = 1.0
    requiresVisibleMotion: bool = True


class PayoffContract(StrictModel):
    startRatio: float = 0.67
    requiresResolvedVisual: bool = True


class VisualTextContract(StrictModel):
    maxWordsPerObject: int
    maxSimultaneousObjects: int
    proseIsSecondary: bool = True


class MotionContract(StrictModel):
    dominantActionsPerBeat: int = 1
    requireVisualProof: bool = True


class VisualContract(StrictModel):
    contractVersion: Literal["curvg.visual/v1"] = VISUAL_CONTRACT_VERSION
    frame: FrameContract
    hook: HookContract = Field(default_factory=HookContract)
    payoff: PayoffContract = Field(default_factory=PayoffContract)
    text: VisualTextContract
    motion: MotionContract = Field(default_factory=MotionContract)
    palette: list[str]


class TemplateMatch(StrictModel):
    id: str
    score: float
    reason: str
    requiredObjects: list[str]
    preferredActions: list[str]


class PrepareResponse(StrictModel):
    protocolVersion: Literal["curvg.orchestrator/v1"] = PROTOCOL_VERSION
    status: Literal["ready"] = "ready"
    visualContract: VisualContract
    templates: list[TemplateMatch]
    diagnostics: list[Diagnostic]
    generationBrief: str
    preparedAt: str = Field(default_factory=utc_now)


class ValidateCodeRequest(StrictModel):
    protocolVersion: Literal["curvg.orchestrator/v1"]
    animationId: str = Field(pattern=r"^[A-Za-z0-9-]{1,80}$")
    spec: AnimationSpec
    code: str = Field(min_length=100, max_length=60_000)
    visualContract: VisualContract


class ValidateCodeResponse(StrictModel):
    protocolVersion: Literal["curvg.orchestrator/v1"] = PROTOCOL_VERSION
    valid: bool
    diagnostics: list[Diagnostic]
    repairDirective: str | None = None
    validatedAt: str = Field(default_factory=utc_now)
