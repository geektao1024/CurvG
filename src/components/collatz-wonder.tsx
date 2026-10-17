import { useState, type ReactNode } from 'react';

import {
  CollatzEngine,
  MAX_N,
  MIN_N,
  stoppingTime,
  STORY_EVEN,
  STORY_N,
  STORY_ODD,
} from '@/lib/wonders/collatz';
import { shareNumber } from '@/lib/wonders/share';
import {
  WonderChips,
  WonderReadouts,
  WonderSlider,
  WonderStage,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type CollatzLabels = {
  numbers: string;
  steps: string;
  peak: string;
  count: string;
  even: string;
  odd: string;
  follow: string;
  none: string;
  hint: string;
  formatCount: (value: number) => string;
};

const FOLLOW = [27, 97, 871, 6171] as const;

/** Wonder No. 10: the Collatz conjecture, drawn as a coral. */
export function CollatzWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: CollatzLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new CollatzEngine());
  const [settings, setSettings] = useState(engine.settings);
  const [nodes, setNodes] = useState(0);

  const set = (next: Partial<typeof engine.settings>) => {
    engine.settings = { ...engine.settings, ...next };
    setSettings(engine.settings);
  };

  const followed = settings.highlight ? stoppingTime(settings.highlight) : null;

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() => {
        const { N, even, odd } = engine.settings;
        setNodes(engine.drawn(N, even, odd).tree.nodes.length);
      }}
      share={{
        get: () => ({
          n: engine.settings.N,
          e: Number(engine.settings.even.toFixed(3)),
          o: Number(engine.settings.odd.toFixed(3)),
          h: engine.settings.highlight,
        }),
        apply: (state) => {
          set({
            N:
              Math.round(shareNumber(state.n, MIN_N, MAX_N, STORY_N) / 100) *
              100,
            even: shareNumber(state.e, 0, 0.8, STORY_EVEN),
            odd: shareNumber(state.o, 0, 0.8, STORY_ODD),
            highlight: Math.round(shareNumber(state.h, 0, 1e6, 27)),
          });
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
            {api.mode === 'free' && (
              <WonderReadouts
                items={[
                  { label: labels.numbers, value: labels.formatCount(nodes) },
                  ...(followed
                    ? [
                        {
                          label: labels.steps,
                          value: String(followed.steps),
                          tone: 'amber' as const,
                        },
                        {
                          label: labels.peak,
                          value: labels.formatCount(followed.peak),
                        },
                      ]
                    : []),
                ]}
              />
            )}
            <WonderChips
              label={labels.follow}
              value={api.mode === 'free' ? String(settings.highlight) : null}
              options={[
                ...FOLLOW.map((n) => ({ value: String(n), label: String(n) })),
                { value: '0', label: labels.none },
              ]}
              onPick={(value) => {
                take();
                const h = Number(value);
                // Make sure the followed number is in the tree.
                set({ highlight: h, N: Math.max(engine.settings.N, h) });
              }}
            />
            <WonderSlider
              label={labels.count}
              min={MIN_N}
              max={MAX_N}
              step={100}
              value={settings.N}
              display={labels.formatCount(settings.N)}
              onChange={(value) => {
                take();
                set({ N: value });
              }}
            />
            <WonderSlider
              label={labels.even}
              min={0}
              max={0.8}
              step={0.01}
              value={settings.even}
              display={settings.even.toFixed(2)}
              onChange={(value) => {
                take();
                set({ even: value });
              }}
            />
            <WonderSlider
              label={labels.odd}
              min={0}
              max={0.8}
              step={0.01}
              value={settings.odd}
              display={settings.odd.toFixed(2)}
              onChange={(value) => {
                take();
                set({ odd: value });
              }}
            />
            <p className="wonder-panel-hint">{labels.hint}</p>
          </>
        );
      }}
    />
  );
}
