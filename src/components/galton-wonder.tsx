import { useState, type ReactNode } from 'react';
import { Plus, RotateCcw } from 'lucide-react';

import {
  binomial,
  GaltonEngine,
  MAX_ROWS,
  MIN_ROWS,
  STORY_ROWS,
} from '@/lib/wonders/galton';
import { shareNumber } from '@/lib/wonders/share';
import {
  WonderReadouts,
  WonderSlider,
  WonderStage,
  WonderToggle,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type GaltonLabels = {
  dropped: string;
  middle: string;
  /** "measured vs expected", e.g. 21.9% / 22.6%. */
  versus: (measured: string, expected: string) => string;
  mean: string;
  rows: string;
  tilt: string;
  rate: string;
  dropMore: string;
  reset: string;
  pascal: string;
  curve: string;
  hint: string;
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Wonder No. 8: random bounces, the same bell every time. */
export function GaltonWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: GaltonLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new GaltonEngine());
  const [settings, setSettings] = useState(engine.settings);
  const [readout, setReadout] = useState({
    total: 0,
    rows: STORY_ROWS,
    p: 0.5,
    middle: 0,
    mean: 0,
  });

  const set = (next: Partial<typeof engine.settings>, reset = false) => {
    engine.settings = { ...engine.settings, ...next };
    if (reset) engine.reset();
    setSettings(engine.settings);
  };

  const n = settings.rows;
  const p = settings.p;
  // Readouts follow what is on the board (the story's or the reader's).
  const rn = readout.rows;
  const rp = readout.p;
  const mid = Math.round(rn * rp);

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() => {
        const { slots, rows, p } = engine.shown;
        const total = slots.reduce((a, c) => a + c, 0);
        setReadout({
          total,
          rows,
          p,
          middle: total ? (slots[Math.round(rows * p)] ?? 0) / total : 0,
          mean: total ? slots.reduce((a, c, k) => a + c * k, 0) / total : 0,
        });
      }}
      share={{
        get: () => ({
          n: engine.settings.rows,
          p: engine.settings.p,
          r: engine.settings.rate,
          c: engine.settings.curve,
          t: engine.settings.pascal,
        }),
        apply: (state) => {
          set(
            {
              rows: Math.round(
                shareNumber(state.n, MIN_ROWS, MAX_ROWS, STORY_ROWS)
              ),
              p: Math.round(shareNumber(state.p, 0.05, 0.95, 0.5) * 100) / 100,
              rate: Math.round(shareNumber(state.r, 5, 300, 60)),
              curve: state.c !== '0',
              pascal: state.t === '1',
            },
            true
          );
          // Open on a board already filling up.
          engine.drop(600);
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
            {readout.total > 0 && (
              <WonderReadouts
                items={[
                  {
                    label: labels.dropped,
                    value: readout.total.toLocaleString(),
                  },
                  {
                    label: labels.middle,
                    value: labels.versus(
                      pct(readout.middle),
                      pct(binomial(rn, mid, rp))
                    ),
                    tone: 'amber',
                  },
                  {
                    label: labels.mean,
                    value: labels.versus(
                      readout.mean.toFixed(2),
                      (rn * rp).toFixed(2)
                    ),
                  },
                ]}
              />
            )}
            <WonderSlider
              label={labels.rows}
              min={MIN_ROWS}
              max={MAX_ROWS}
              step={1}
              value={n}
              onChange={(value) => {
                take();
                set({ rows: value }, true);
              }}
            />
            <WonderSlider
              label={labels.tilt}
              min={0.05}
              max={0.95}
              step={0.05}
              value={p}
              display={p.toFixed(2)}
              onChange={(value) => {
                take();
                set({ p: value }, true);
              }}
            />
            <WonderSlider
              label={labels.rate}
              min={5}
              max={300}
              step={5}
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
                  engine.drop(1000);
                }}
              >
                <Plus />
                {labels.dropMore}
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
              label={labels.pascal}
              checked={settings.pascal}
              onChange={(next) => {
                take();
                set({ pascal: next });
              }}
            />
            <WonderToggle
              label={labels.curve}
              checked={settings.curve}
              onChange={(next) => {
                take();
                set({ curve: next });
              }}
            />
            <p className="wonder-panel-hint">{labels.hint}</p>
          </>
        );
      }}
    />
  );
}
