import { useRef, useState, type ReactNode } from 'react';

import {
  apparentGap,
  COUNT,
  CYCLE,
  MAX_COUNT,
  MIN_COUNT,
  PendulumWaveEngine,
  visibleRows,
} from '@/lib/wonders/pendulum-wave';
import { shareNumber } from '@/lib/wonders/share';
import {
  WonderChips,
  WonderReadouts,
  WonderSlider,
  WonderStage,
  WonderToggle,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type PendulumWaveLabels = {
  time: string;
  /** Phase gap between neighbours as the eye sees it. */
  gap: string;
  pattern: string;
  groups: (count: number) => string;
  together: string;
  wave: string;
  jump: string;
  speed: string;
  count: string;
  showWave: string;
  hint: string;
};

type Moment = 'start' | 'fifth' | 'quarter' | 'third' | 'half' | 'twoThirds';

/** Fractions of the cycle the reader can jump to. */
const MOMENTS: Record<Moment, [number, string]> = {
  start: [0, '0'],
  fifth: [1 / 5, '1/5'],
  quarter: [1 / 4, '1/4'],
  third: [1 / 3, '1/3'],
  half: [1 / 2, '1/2'],
  twoThirds: [2 / 3, '2/3'],
};

/** Wonder No. 5: fifteen independent pendulums that snake, split and realign. */
export function PendulumWaveWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: PendulumWaveLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new PendulumWaveEngine());
  const [count, setCount] = useState(COUNT);
  const [speed, setSpeed] = useState(1);
  const [wave, setWave] = useState(false);
  const [readout, setReadout] = useState({ tau: 0, count: COUNT });
  const apiRef = useRef<{ enterFree: () => void } | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  const set = (next: Partial<typeof engine.settings>) => {
    engine.settings = { ...engine.settings, ...next };
  };

  const rows = visibleRows(readout.tau, readout.count);
  const pattern =
    rows === null
      ? labels.wave
      : rows === 1
        ? labels.together
        : labels.groups(rows);

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() =>
        setReadout({ tau: engine.scene.tau, count: engine.settings.count })
      }
      share={{
        get: () => {
          const { yaw, pitch } = engine.camera();
          return {
            c: engine.settings.count,
            t: Number((engine.scene.tau % CYCLE).toFixed(2)),
            v: engine.settings.speed,
            w: engine.settings.wave,
            yaw: Number(yaw.toFixed(3)),
            tilt: Number(pitch.toFixed(3)),
          };
        },
        apply: (state) => {
          const c = Math.round(
            shareNumber(state.c, MIN_COUNT, MAX_COUNT, COUNT)
          );
          const v = Math.round(shareNumber(state.v, 0.25, 4, 1) * 4) / 4;
          const w = state.w === '1';
          set({ count: c, speed: v, wave: w });
          engine.seek(shareNumber(state.t, 0, CYCLE, 0));
          const cam = engine.camera();
          engine.setCamera(
            shareNumber(state.yaw, -100, 100, cam.yaw),
            shareNumber(state.tilt, 0.05, 1.45, cam.pitch)
          );
          setCount(c);
          setSpeed(v);
          setWave(w);
        },
      }}
      canvasProps={{
        className: 'is-pannable',
        onPointerDown: (e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = { x: e.clientX, y: e.clientY };
        },
        onPointerMove: (e) => {
          if (!last.current) return;
          const dx = e.clientX - last.current.x;
          const dy = e.clientY - last.current.y;
          if (Math.abs(dx) + Math.abs(dy) < 1) return;
          apiRef.current?.enterFree();
          engine.rotate(dx, dy);
          last.current = { x: e.clientX, y: e.clientY };
        },
        onPointerUp: () => (last.current = null),
        onPointerCancel: () => (last.current = null),
      }}
      panel={(api) => {
        apiRef.current = api;
        // Leaving the story keeps its picture; sync the controls to it.
        const take = () => {
          if (api.mode !== 'story') return;
          api.enterFree();
          setWave(engine.settings.wave);
        };
        return (
          <>
            <WonderReadouts
              items={[
                {
                  label: labels.time,
                  value: `${(readout.tau % CYCLE).toFixed(1)} s / ${CYCLE} s`,
                },
                {
                  label: labels.gap,
                  value: `${Math.round(apparentGap(readout.tau))}°`,
                },
                {
                  label: labels.pattern,
                  value: pattern,
                  tone: rows !== null ? 'amber' : undefined,
                },
              ]}
            />
            <WonderChips
              label={labels.jump}
              value={null}
              options={(Object.keys(MOMENTS) as Moment[]).map((key) => ({
                value: key,
                label: MOMENTS[key][1],
              }))}
              onPick={(key) => {
                take();
                // Land a moment early, so the reader watches the rows form.
                const at = MOMENTS[key][0] * CYCLE;
                engine.seek(at === 0 ? 0 : at - 1.2 * engine.settings.speed);
              }}
            />
            <WonderSlider
              label={labels.speed}
              min={0.25}
              max={4}
              step={0.25}
              value={speed}
              display={`×${speed.toFixed(2)}`}
              onChange={(value) => {
                take();
                set({ speed: value });
                setSpeed(value);
              }}
            />
            <WonderSlider
              label={labels.count}
              min={MIN_COUNT}
              max={MAX_COUNT}
              step={1}
              value={api.mode === 'free' ? count : COUNT}
              onChange={(value) => {
                take();
                set({ count: value });
                setCount(value);
              }}
            />
            <WonderToggle
              label={labels.showWave}
              checked={api.mode === 'free' ? wave : engine.scene.wave > 0.5}
              onChange={(next) => {
                take();
                set({ wave: next });
                setWave(next);
              }}
            />
            <p className="wonder-panel-hint">{labels.hint}</p>
          </>
        );
      }}
    />
  );
}
