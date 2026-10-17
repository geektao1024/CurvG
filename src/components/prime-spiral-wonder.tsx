import { useState, type ReactNode } from 'react';

import {
  MAX_LOG,
  MIN_LOG,
  primeCount,
  PrimeSpiralEngine,
  STORY_VIEWS,
  visibleArms,
  type Modulus,
} from '@/lib/wonders/prime-spiral';
import { shareNumber } from '@/lib/wonders/share';
import {
  WonderChips,
  WonderReadouts,
  WonderSlider,
  WonderStage,
  WonderToggle,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type PrimeSpiralLabels = {
  /** Largest number in view. */
  view: string;
  primes: string;
  arms: string;
  armsValue: (count: number) => string;
  oneSpiral: string;
  zoom: string;
  presets: string;
  primesOnly: string;
  colour: string;
  noColour: string;
  hint: string;
  formatCount: (value: number) => string;
};

type View = 'close' | 'six' | 'fortyFour' | 'rays';

const VIEWS: Record<View, number> = {
  close: STORY_VIEWS.first[1],
  six: STORY_VIEWS.six[1],
  fortyFour: STORY_VIEWS.fortyFour[1],
  rays: STORY_VIEWS.rays[1],
};

const MODULI: readonly Modulus[] = [0, 6, 44, 710];

/** Wonder No. 6: primes in polar coordinates, spirals and rays. */
export function PrimeSpiralWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: PrimeSpiralLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new PrimeSpiralEngine());
  const [logR, setLogR] = useState(engine.settings.logR);
  const [primesOnly, setPrimesOnly] = useState(true);
  const [mod, setMod] = useState<Modulus>(0);
  const [R, setR] = useState(engine.scene.R);

  const set = (next: Partial<typeof engine.settings>) => {
    engine.settings = { ...engine.settings, ...next };
  };

  const arms = visibleArms(R);

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() => setR(engine.scene.R)}
      share={{
        get: () => ({
          z: Number(engine.settings.logR.toFixed(3)),
          p: engine.settings.primesOnly,
          m: engine.settings.mod,
        }),
        apply: (state) => {
          const z = shareNumber(
            state.z,
            MIN_LOG,
            MAX_LOG,
            engine.settings.logR
          );
          const p = state.p !== '0';
          const m = Number(state.m);
          const mm: Modulus = MODULI.includes(m as Modulus)
            ? (m as Modulus)
            : 0;
          set({ logR: z, primesOnly: p, mod: mm });
          setLogR(z);
          setPrimesOnly(p);
          setMod(mm);
        },
      }}
      panel={(api) => {
        // Leaving the story keeps its picture; sync the controls to it.
        const take = () => {
          if (api.mode !== 'story') return;
          api.enterFree();
          setLogR(engine.settings.logR);
          setPrimesOnly(engine.settings.primesOnly);
          setMod(engine.settings.mod);
        };
        const shownLog = api.mode === 'free' ? logR : Math.log10(R);
        return (
          <>
            <WonderReadouts
              items={[
                {
                  label: labels.view,
                  value: labels.formatCount(Math.round(R)),
                },
                {
                  label: labels.primes,
                  value: labels.formatCount(primeCount(R)),
                },
                {
                  label: labels.arms,
                  value:
                    arms === null ? labels.oneSpiral : labels.armsValue(arms),
                  tone: arms === null ? undefined : 'amber',
                },
              ]}
            />
            <WonderChips
              label={labels.presets}
              value={null}
              options={(Object.keys(VIEWS) as View[]).map((key) => ({
                value: key,
                label: labels.formatCount(VIEWS[key]),
              }))}
              onPick={(key) => {
                take();
                const z = Math.log10(VIEWS[key]);
                set({ logR: z });
                setLogR(z);
              }}
            />
            <WonderSlider
              label={labels.zoom}
              min={MIN_LOG}
              max={MAX_LOG}
              step={0.01}
              value={shownLog}
              display={labels.formatCount(Math.round(10 ** shownLog))}
              onChange={(value) => {
                take();
                set({ logR: value });
                setLogR(value);
              }}
            />
            <WonderToggle
              label={labels.primesOnly}
              checked={
                api.mode === 'free' ? primesOnly : engine.scene.ints < 0.5
              }
              onChange={(next) => {
                take();
                set({ primesOnly: next });
                setPrimesOnly(next);
              }}
            />
            <WonderChips
              label={labels.colour}
              value={api.mode === 'free' ? String(mod) : null}
              options={MODULI.map((m) => ({
                value: String(m),
                label: m === 0 ? labels.noColour : `mod ${m}`,
              }))}
              onPick={(value) => {
                take();
                const m = Number(value) as Modulus;
                set({ mod: m });
                setMod(m);
              }}
            />
            <p className="wonder-panel-hint">{labels.hint}</p>
          </>
        );
      }}
    />
  );
}
