import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';

import {
  FULL,
  MAX_WIDTH,
  MIN_WIDTH,
  NewtonEngine,
  POLYS,
  type C,
  type NewtonText,
  type PolyKey,
} from '@/lib/wonders/newton';
import { shareNumber } from '@/lib/wonders/share';
import {
  WonderChips,
  WonderReadouts,
  WonderStage,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type NewtonLabels = NewtonText & {
  equation: string;
  custom: string;
  zoom: string;
  roots: string;
  presets: string;
  addRoot: string;
  removeRoot: string;
  overview: string;
  hint: string;
  formatZoom: (factor: number) => string;
};

const PRESET_ORDER: readonly PolyKey[] = ['z2', 'z3', 'z4', 'z5', 'cycle'];
const ROOT_KEYS = ['ra', 'rb', 'rc', 'rd', 're', 'rf'] as const;
const MAX_ROOTS = ROOT_KEYS.length;

/**
 * `0.5j-0.25` ↔ 0.5 − 0.25i, for share links: no `+`, which a query
 * string would read as a space.
 */
export const formatRoot = (r: C) =>
  `${Number(r.re.toFixed(4))}j${Number(r.im.toFixed(4))}`;
export function parseRoot(value: string | undefined): C | null {
  const m = value?.match(/^(-?\d*\.?\d+)j(-?\d*\.?\d+)$/);
  if (!m) return null;
  const re = shareNumber(m[1], -4, 4, NaN);
  const im = shareNumber(m[2], -4, 4, NaN);
  return Number.isFinite(re) && Number.isFinite(im) ? { re, im } : null;
}

/** Wonder No. 7: Newton's method in the complex plane. */
export function NewtonWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: NewtonLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new NewtonEngine(labels));
  const [readout, setReadout] = useState({
    zoom: 1,
    count: 3,
    preset: 'z3' as PolyKey | null,
    /** The real-line √2 demo is on screen. */
    tangent: false,
  });
  const apiRef = useRef<{ enterFree: () => void; mode: string } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(0);
  const dragRoot = useRef(-1);

  const local = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const takeOver = () => apiRef.current?.enterFree();
  engine.onInteract = takeOver;

  const equation = readout.tangent
    ? 'x² − 2'
    : readout.preset === null
      ? labels.custom
      : POLYS[readout.preset].label;

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() =>
        setReadout({
          zoom: FULL.width / engine.view.width,
          count:
            apiRef.current?.mode === 'free'
              ? engine.roots.length
              : POLYS[engine.scene.poly].roots.length,
          preset:
            apiRef.current?.mode === 'free' ? engine.preset : engine.scene.poly,
          tangent:
            apiRef.current?.mode !== 'free' && engine.scene.tangent.alpha > 0.5,
        })
      }
      share={{
        get: () => {
          const state: Record<string, string | number> = {
            x: Number(engine.view.re.toPrecision(8)),
            y: Number(engine.view.im.toPrecision(8)),
            w: Number(engine.view.width.toPrecision(5)),
          };
          if (engine.preset) state.p = engine.preset;
          else
            engine.roots.forEach(
              (r, i) => (state[ROOT_KEYS[i]] = formatRoot(r))
            );
          return state;
        },
        apply: (state) => {
          const preset = PRESET_ORDER.find((key) => key === state.p) ?? null;
          const roots = preset
            ? POLYS[preset].roots
            : ROOT_KEYS.map((key) => parseRoot(state[key])).filter(
                (r): r is C => r !== null
              );
          if (roots.length >= 2) engine.setRoots(roots, preset);
          const width = shareNumber(state.w, MIN_WIDTH, MAX_WIDTH, 0);
          if (width > 0) {
            engine.view = {
              re: shareNumber(state.x, -4, 4, 0),
              im: shareNumber(state.y, -4, 4, 0),
              width,
            };
          }
        },
      }}
      canvasProps={{
        className: 'is-pannable',
        onPointerDown: (e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = local(e);
          pointers.current.set(e.pointerId, p);
          moved.current = 0;
          // Grab a root only once the reader is playing (roots are drawn).
          dragRoot.current =
            apiRef.current?.mode === 'free' ? engine.rootNear(p.x, p.y) : -1;
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
            if (dragRoot.current >= 0) {
              engine.moveRoot(dragRoot.current, p.x, p.y);
            } else if (moved.current > 4) {
              takeOver();
              engine.pan(dx, dy);
            }
          } else if (all.length === 2) {
            dragRoot.current = -1;
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
          // A tap (no drag) shows that start's Newton path.
          if (
            moved.current <= 4 &&
            dragRoot.current < 0 &&
            pointers.current.size === 0
          ) {
            takeOver();
            engine.probeAt(p.x, p.y);
          }
          dragRoot.current = -1;
        },
        onPointerCancel: (e) => {
          pointers.current.delete(e.pointerId);
          dragRoot.current = -1;
        },
      }}
      panel={(api) => {
        apiRef.current = api;
        return (
          <>
            <WonderReadouts
              items={[
                { label: labels.equation, value: equation },
                { label: labels.roots, value: String(readout.count) },
                { label: labels.zoom, value: labels.formatZoom(readout.zoom) },
              ]}
            />
            <WonderChips
              label={labels.presets}
              value={api.mode === 'free' ? readout.preset : null}
              options={PRESET_ORDER.map((value) => ({
                value,
                label: POLYS[value].label,
              }))}
              onPick={(value) => {
                api.enterFree();
                engine.setRoots(POLYS[value].roots, value);
                engine.flyTo(
                  value === 'cycle' ? { re: 0.45, im: 0, width: 2.4 } : FULL
                );
              }}
            />
            <div className="wonder-chips">
              <button
                type="button"
                className="wonder-chip"
                disabled={
                  api.mode === 'free' && engine.roots.length >= MAX_ROOTS
                }
                onClick={() => {
                  api.enterFree();
                  if (engine.roots.length >= MAX_ROOTS) return;
                  // A new root on a circle, between the existing ones.
                  const n = engine.roots.length;
                  const a = 0.7 + n * 2.4;
                  engine.setRoots(
                    [
                      ...engine.roots,
                      { re: 1.1 * Math.cos(a), im: 1.1 * Math.sin(a) },
                    ],
                    null
                  );
                }}
              >
                <Plus />
                {labels.addRoot}
              </button>
              <button
                type="button"
                className="wonder-chip"
                disabled={api.mode === 'free' && engine.roots.length <= 2}
                onClick={() => {
                  api.enterFree();
                  if (engine.roots.length <= 2) return;
                  engine.setRoots(engine.roots.slice(0, -1), null);
                }}
              >
                <Minus />
                {labels.removeRoot}
              </button>
              <button
                type="button"
                className="wonder-chip"
                onClick={() => {
                  api.enterFree();
                  engine.probe = null;
                  engine.flyTo(engine.overview());
                }}
              >
                <Maximize />
                {labels.overview}
              </button>
            </div>
            <p className="wonder-panel-hint">{labels.hint}</p>
          </>
        );
      }}
    />
  );
}
