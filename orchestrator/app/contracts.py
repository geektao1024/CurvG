from __future__ import annotations

from .models import AnimationSpec, VisualContract, VisualTextContract, FrameContract


def build_visual_contract(spec: AnimationSpec) -> VisualContract:
    vertical = spec.direction.frame == "9:16"
    return VisualContract(
        frame=FrameContract(
            aspectRatio=spec.direction.frame,
            safeZone=(0.08, 0.07, 0.92, 0.84) if vertical else (0.06, 0.08, 0.94, 0.92),
            targetWidth=1080 if vertical else 1920,
            targetHeight=1920 if vertical else 1080,
        ),
        text=VisualTextContract(
            maxWordsPerObject=spec.direction.textPolicy.maxWordsPerObject,
            maxSimultaneousObjects=spec.direction.textPolicy.maxSimultaneousText,
        ),
        palette=spec.style.palette,
    )
