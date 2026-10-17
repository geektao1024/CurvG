import { useState, type ReactNode } from 'react';
import { Plus, RotateCcw } from 'lucide-react';

import { BuffonEngine, crossChance, estimate } from '@/lib/wonders/buffon';
import { shareNumber } from '@/lib/wonders/share';
import {
  WonderReadouts,
  WonderSlider,
  WonderStage,
  WonderToggle,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type BuffonLabels = {
  thrown: string;
  crossed: string;
  /** "measured (theory)" share of crossings. */
  versus: (measured: string, expected: string) => string;
  estimate: string;
  length: string;
  rate: string;
  throwMore: string;
  reset: string;
  graph: string;
  hint: string;
};

/** Wonder No. 9: dropping needles to find π. */
export function BuffonWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: BuffonLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new BuffonEngine());
  const [settings, setSettings] = useState(engine.settings);
  const [shown, setShown] = useState(engine.shown);

  const set = (next: Partial<typeof engine.settings>, reset = false) => {
    engine.settings = { ...engine.settings, ...next };
    if (reset) engine.reset();
    setSettings(engine.settings);
  };

  const est = estimate(shown.length, shown.thrown, shown.crossed);

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() => setShown(engine.shown)}
      share={{
        get: () => ({
          l: engine.settings.length,
          r: engine.settings.rate,
          g: engine.settings.graph,
        }),
        apply: (state) => {
          set(
            {
              length: Math.round(shareNumber(state.l, 0.2, 1, 1) * 20) / 20,
              rate: Math.round(shareNumber(state.r, 10, 2000, 200)),
              graph: state.g !== '0',
            },
            true
          );
          engine.throwMore(2000);
        },
      }}
      panel={(api) => {
        const take = () => {
          if (api.mode !== 'story') return;
          api.enterFree();
          setSettings(engine.settings);
        };
        return (
          <>
            <WonderReadouts
              items={[
                { label: labels.thrown, value: shown.thrown.toLocaleString() },
                {
                  label: labels.crossed,
                  value: labels.versus(
                    shown.thrown
                      ? `${((shown.crossed / shown.thrown) * 100).toFixed(2)}%`
                      : '—',
                    `${(crossChance(shown.length) * 100).toFixed(2)}%`
                  ),
                },
                {
                  label: labels.estimate,
                  value: Number.isFinite(est) ? est.toFixed(4) : '—',
                  tone: 'amber',
                },
              ]}
            />
            <WonderSlider
              label={labels.length}
              min={0.2}
              max={1}
              step={0.05}
              value={settings.length}
              display={`${settings.length.toFixed(2)} d`}
              onChange={(value) => {
                take();
                set({ length: value }, true);
              }}
            />
            <WonderSlider
              label={labels.rate}
              min={10}
              max={2000}
              step={10}
              value={settings.rate}
              onChange={(value) => {
                take();
                set({ rate: value });
              }}
            />
            <div className="wonder-chips">
              <button
                type="button"
                className="wonder-chip"
                onClick={() => {
                  take();
                  engine.throwMore(1000);
                }}
              >
                <Plus />
                {labels.throwMore}
              </button>
              <button
                type="button"
                className="wonder-chip"
                onClick={() => {
                  take();
                  engine.reset();
                }}
              >
                <RotateCcw />
                {labels.reset}
              </button>
            </div>
            <WonderToggle
              label={labels.graph}
              checked={settings.graph}
              onChange={(next) => {
                take();
                set({ graph: next });
              }}
            />
            <p className="wonder-panel-hint">{labels.hint}</p>
          </>
        );
      }}
    />
  );
}
