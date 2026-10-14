import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

import { FULL, PRESETS, type MandelPreset } from '@/lib/wonders/mandelbrot';
import { MandelbrotEngine, type MandelText } from '@/lib/wonders/mandelbrot-gl';
import {
  WonderChips,
  WonderReadouts,
  WonderSlider,
  WonderStage,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type MandelbrotLabels = MandelText & {
  zoom: string;
  iterations: string;
  places: string;
  presets: Record<MandelPreset, string>;
  detail: string;
  hint: string;
  /** Formats a magnification, e.g. 1.2 万× / 12k×. */
  formatZoom: (factor: number) => string;
};

const PRESET_ORDER: readonly MandelPreset[] = [
  'full',
  'seahorse',
  'deep',
  'antenna',
];

/** Wonder No. 2: z² + c, and the endless detail on its boundary. */
export function MandelbrotWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: MandelbrotLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new MandelbrotEngine(labels));
  const [readout, setReadout] = useState({ zoom: 1, iter: 0 });
  const [preset, setPreset] = useState<MandelPreset | null>(null);
  const [detail, setDetail] = useState(1);
  const apiRef = useRef<{ enterFree: () => void } | null>(null);
  // Pointers down on the canvas: one drags, two pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);

  const local = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const takeOver = () => {
    apiRef.current?.enterFree();
    setPreset(null);
  };
  engine.onInteract = takeOver;

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() =>
        setReadout({
          zoom: FULL.width / engine.view.width,
          iter: engine.scene.maxIter,
        })
      }
      canvasProps={{
        className: 'is-pannable',
        onPointerDown: (e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, local(e));
          moved.current = 0;
        },
        onPointerMove: (e) => {
          const prev = pointers.current.get(e.pointerId);
          if (!prev) return;
          const p = local(e);
          const all = [...pointers.current.entries()];
          if (all.length === 1) {
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            moved.current += Math.abs(dx) + Math.abs(dy);
            if (moved.current > 4) {
              takeOver();
              engine.pan(dx, dy);
            }
          } else if (all.length === 2) {
            const other = all.find(([id]) => id !== e.pointerId)![1];
            const before = Math.hypot(prev.x - other.x, prev.y - other.y);
            const after = Math.hypot(p.x - other.x, p.y - other.y);
            if (before > 0 && after > 0) {
              takeOver();
              moved.current += 10;
              engine.zoomAt(
                (p.x + other.x) / 2,
                (p.y + other.y) / 2,
                before / after
              );
            }
          }
          pointers.current.set(e.pointerId, p);
        },
        onPointerUp: (e) => {
          const p = local(e);
          pointers.current.delete(e.pointerId);
          // A tap (no drag) shows that point's orbit.
          if (moved.current <= 4 && pointers.current.size === 0) {
            takeOver();
            engine.probeAt(p.x, p.y);
          }
        },
        onPointerCancel: (e) => pointers.current.delete(e.pointerId),
      }}
      panel={(api) => {
        apiRef.current = api;
        return (
          <>
            <WonderReadouts
              items={[
                { label: labels.zoom, value: labels.formatZoom(readout.zoom) },
                { label: labels.iterations, value: String(readout.iter) },
              ]}
            />
            <WonderChips
              label={labels.places}
              value={api.mode === 'free' ? preset : null}
              options={PRESET_ORDER.map((value) => ({
                value,
                label: labels.presets[value],
              }))}
              onPick={(value) => {
                api.enterFree();
                engine.probe = null;
                engine.flyTo(PRESETS[value]);
                setPreset(value);
              }}
            />
            <WonderSlider
              label={labels.detail}
              min={0.5}
              max={3}
              step={0.25}
              value={detail}
              display={`×${detail}`}
              onChange={(value) => {
                api.enterFree();
                engine.detail = value;
                setDetail(value);
              }}
            />
            <p className="wonder-panel-hint">{labels.hint}</p>
          </>
        );
      }}
    />
  );
}
