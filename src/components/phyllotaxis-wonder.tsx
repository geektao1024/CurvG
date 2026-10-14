import { useState, type ReactNode } from 'react';

import {
  GOLDEN_ANGLE,
  minSpacing,
  NEAR_GOLDEN,
  nearestFraction,
  PhyllotaxisEngine,
  seeds,
  STORY_SEEDS,
} from '@/lib/wonders/phyllotaxis';
import {
  WonderChips,
  WonderReadouts,
  WonderSlider,
  WonderStage,
  WonderToggle,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type PhyllotaxisLabels = {
  angle: string;
  /** Closest simple fraction of a turn (denominator ≤ 55). */
  fraction: string;
  spacing: string;
  seeds: string;
  presets: string;
  golden: string;
  spirals: string;
};

type AnglePreset = 'quarter' | 'third' | 'twoFifths' | 'golden' | 'near';

const ANGLES: Record<AnglePreset, number> = {
  quarter: 90,
  third: 120,
  twoFifths: 144,
  golden: GOLDEN_ANGLE,
  near: NEAR_GOLDEN,
};

/** Spacing of the golden angle at the same count: the best it gets. */
const goldenSpacing = new Map<number, number>();
function spacingRatio(count: number, angle: number): number {
  const n = Math.max(2, Math.round(count));
  if (!goldenSpacing.has(n)) {
    goldenSpacing.set(n, minSpacing(seeds(n, GOLDEN_ANGLE)));
  }
  return minSpacing(seeds(n, angle)) / goldenSpacing.get(n)!;
}

/** Wonder No. 4: why sunflowers turn each seed by 137.5°. */
export function PhyllotaxisWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: PhyllotaxisLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new PhyllotaxisEngine());
  const [angle, setAngle] = useState(GOLDEN_ANGLE);
  const [count, setCount] = useState(STORY_SEEDS);
  const [spirals, setSpirals] = useState(false);
  const [preset, setPreset] = useState<AnglePreset | null>(null);
  const [readout, setReadout] = useState({ angle: 90, spacing: 0, count: 0 });

  const set = (next: Partial<typeof engine.target>) => {
    engine.target = { ...engine.target, ...next };
  };

  const fraction = nearestFraction(readout.angle, 55);

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() =>
        setReadout({
          angle: engine.scene.angle,
          count: engine.scene.count,
          spacing: spacingRatio(engine.scene.count, engine.scene.angle),
        })
      }
      panel={(api) => {
        // Leaving the story keeps its picture; sync the controls to it.
        const take = () => {
          if (api.mode !== 'story') return;
          api.enterFree();
          // Early in the story only a few seeds are out; give the reader
          // the full head to play with.
          if (engine.target.count < 300) set({ count: STORY_SEEDS });
          setAngle(engine.target.angle);
          setCount(engine.target.count);
        };
        return (
          <>
            <WonderReadouts
              items={[
                { label: labels.angle, value: `${readout.angle.toFixed(3)}°` },
                {
                  label: labels.fraction,
                  value: `${fraction.p}/${fraction.q}`,
                },
                {
                  label: labels.spacing,
                  value: `${Math.round(readout.spacing * 100)}%`,
                  tone: readout.spacing < 0.9 ? 'amber' : undefined,
                },
              ]}
            />
            <WonderChips
              label={labels.presets}
              value={api.mode === 'free' ? preset : null}
              options={(Object.keys(ANGLES) as AnglePreset[]).map((key) => ({
                value: key,
                label:
                  key === 'golden'
                    ? labels.golden
                    : `${Number(ANGLES[key].toFixed(1))}°`,
              }))}
              onPick={(key) => {
                take();
                set({ angle: ANGLES[key] });
                setAngle(ANGLES[key]);
                setPreset(key);
              }}
            />
            <WonderSlider
              label={labels.angle}
              min={90}
              max={180}
              step={0.01}
              value={api.mode === 'free' ? angle : readout.angle}
              display={`${(api.mode === 'free' ? angle : readout.angle).toFixed(2)}°`}
              onChange={(value) => {
                take();
                set({ angle: value });
                setAngle(value);
                setPreset(null);
              }}
            />
            <WonderSlider
              label={labels.seeds}
              min={50}
              max={2500}
              step={50}
              value={api.mode === 'free' ? count : Math.round(readout.count)}
              onChange={(value) => {
                take();
                set({ count: value });
                setCount(value);
              }}
            />
            <WonderToggle
              label={labels.spirals}
              checked={spirals}
              onChange={(next) => {
                take();
                set({ spirals: next });
                setSpirals(next);
              }}
            />
          </>
        );
      }}
    />
  );
}
