import { useState, type ReactNode } from 'react';
import { Shuffle } from 'lucide-react';

import {
  AttractorEngine,
  GALLERY,
  kindOf,
  randomChaotic,
  START,
  type Kind,
  type Params,
} from '@/lib/wonders/attractors';
import { shareNumber } from '@/lib/wonders/share';
import {
  WonderChips,
  WonderReadouts,
  WonderSlider,
  WonderStage,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type AttractorLabels = {
  lambda: string;
  kind: string;
  kinds: Record<Kind, string>;
  gallery: string;
  random: string;
  hint: string;
};

const NAMES = ['a', 'b', 'c', 'd'] as const;

/** Wonder No. 11: four numbers, two lines, a gallery of strange attractors. */
export function AttractorWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: AttractorLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new AttractorEngine());
  const [params, setParams] = useState<Params>(START);
  // Computed in the browser only: chaos amplifies the last-bit differences
  // between server and browser sin/cos, so the two would disagree.
  const [lambda, setLambda] = useState<number | null>(null);

  const set = (p: Params) => {
    engine.params = p;
    setParams(p);
  };

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() => setLambda(engine.lambda(engine.scene.p))}
      share={{
        get: () => ({
          a: engine.params[0],
          b: engine.params[1],
          c: engine.params[2],
          d: engine.params[3],
        }),
        apply: (state) => {
          set(
            NAMES.map(
              (key, i) =>
                Math.round(shareNumber(state[key], -3, 3, START[i]) * 1000) /
                1000
            ) as unknown as Params
          );
        },
      }}
      panel={(api) => {
        const take = () => {
          if (api.mode !== 'story') return;
          api.enterFree();
          setParams(engine.params);
        };
        const shown = api.mode === 'free' ? params : engine.scene.p;
        const current = GALLERY.findIndex((g) =>
          g.p.every((v, i) => v === params[i])
        );
        return (
          <>
            <WonderReadouts
              items={[
                {
                  label: labels.lambda,
                  value: lambda === null ? '—' : lambda.toFixed(3),
                },
                {
                  label: labels.kind,
                  value: lambda === null ? '—' : labels.kinds[kindOf(lambda)],
                  tone:
                    lambda !== null && kindOf(lambda) === 'chaos'
                      ? 'amber'
                      : undefined,
                },
              ]}
            />
            <WonderChips
              label={labels.gallery}
              value={
                api.mode === 'free' && current >= 0 ? String(current) : null
              }
              options={GALLERY.map((_, i) => ({
                value: String(i),
                label: String(i + 1),
              }))}
              onPick={(value) => {
                take();
                set(GALLERY[Number(value)].p);
              }}
            />
            <div className="wonder-chips">
              <button
                type="button"
                className="wonder-chip"
                onClick={() => {
                  take();
                  set(randomChaotic());
                }}
              >
                <Shuffle />
                {labels.random}
              </button>
            </div>
            {NAMES.map((name, i) => (
              <WonderSlider
                key={name}
                label={name}
                min={-3}
                max={3}
                step={0.01}
                value={shown[i]}
                display={shown[i].toFixed(2)}
                onChange={(value) => {
                  take();
                  const next = [...engine.params] as number[];
                  next[i] = value;
                  set(next as unknown as Params);
                }}
              />
            ))}
            <p className="wonder-panel-hint">{labels.hint}</p>
          </>
        );
      }}
    />
  );
}
