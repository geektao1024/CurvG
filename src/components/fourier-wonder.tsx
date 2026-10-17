import { useState, type PointerEvent, type ReactNode } from 'react';
import { PenLine } from 'lucide-react';

import { pathError, squareOvershoot, waveError } from '@/lib/wonders/fourier';
import {
  FourierEngine,
  isWaveShape,
  MAX_PATH_CIRCLES,
  MAX_WAVE_CIRCLES,
  type FourierShape,
} from '@/lib/wonders/fourier-scene';
import { shareNumber } from '@/lib/wonders/share';
import {
  WonderChips,
  WonderReadouts,
  WonderSlider,
  WonderStage,
  WonderToggle,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type FourierLabels = {
  shape: string;
  shapes: Record<FourierShape, string>;
  circles: string;
  error: string;
  overshoot: string;
  /** Canvas annotation, e.g. "+{percent}% overshoot". */
  overshootNote: (percent: string) => string;
  showCircles: string;
  drawHint: string;
  drawTooShort: string;
};

const SHAPES: readonly FourierShape[] = [
  'square',
  'sawtooth',
  'triangle',
  'pi',
  'custom',
];

const maxCircles = (shape: FourierShape) =>
  isWaveShape(shape) ? MAX_WAVE_CIRCLES : MAX_PATH_CIRCLES;

const pct = (x: number) => `${(x * 100).toFixed(x < 0.01 ? 2 : 1)}%`;

/** Wonder No. 1: spinning circles that add up to any curve. */
export function FourierWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: FourierLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(
    () => new FourierEngine({ overshoot: labels.overshootNote })
  );
  const [shape, setShape] = useState<FourierShape>('pi');
  const [count, setCount] = useState(30);
  const [showCircles, setShowCircles] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [readout, setReadout] = useState({ circles: 1, error: 0, over: 0 });

  const tick = () => {
    const s = engine.scene;
    const pathMode = s.mix > 0.5;
    const circles = engine.circles();
    const cycles =
      s.path === 'custom' && engine.data.custom
        ? engine.data.custom.cycles
        : engine.data.pi.cycles;
    setReadout({
      circles,
      error: pathMode
        ? pathError(cycles, circles + 1)
        : waveError(s.wave, engine.data.waves[s.wave].slice(0, circles)),
      over:
        !pathMode && s.wave === 'square'
          ? squareOvershoot(Math.max(1, circles))
          : 0,
    });
    // Keep the panel in step with where the story left things.
    if (engine.target.shape !== shape) setShape(engine.target.shape);
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!engine.drawing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    engine.stroke = [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
  };
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!engine.drawing || !engine.stroke.length || !(e.buttons & 1)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const prev = engine.stroke[engine.stroke.length - 1];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) > 2) engine.stroke.push(p);
  };
  const onPointerUp = () => {
    if (!engine.drawing || !engine.stroke.length) return;
    if (!engine.finishStroke()) {
      setNotice(labels.drawTooShort);
      return;
    }
    setDrawing(false);
    setNotice(null);
    setShape('custom');
    setCount(80);
  };

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={tick}
      notice={notice}
      share={{
        // A free-hand drawing is too big for a link; share the presets.
        get: () =>
          engine.target.shape === 'custom'
            ? null
            : {
                f: engine.target.shape,
                n: engine.target.count,
                c: engine.target.showCircles,
              },
        apply: (state) => {
          const f =
            SHAPES.find((item) => item === state.f && item !== 'custom') ??
            'pi';
          const n = Math.round(
            shareNumber(state.n, 1, maxCircles(f), isWaveShape(f) ? 8 : 30)
          );
          const c = state.c !== '0';
          engine.drawing = false;
          engine.target = { shape: f, count: n, showCircles: c };
          setShape(f);
          setCount(n);
          setShowCircles(c);
        },
      }}
      canvasProps={{
        className: drawing ? 'is-drawing' : undefined,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
      }}
      panel={(api) => {
        const pick = (next: FourierShape) => {
          api.enterFree();
          if (next === 'custom') {
            engine.drawing = true;
            engine.stroke = [];
            setDrawing(true);
            setNotice(labels.drawHint);
            setShape('custom');
            return;
          }
          // Each shape opens at a count that shows it well.
          const n = isWaveShape(next) ? 8 : 30;
          engine.drawing = false;
          engine.target = { ...engine.target, shape: next, count: n };
          setDrawing(false);
          setNotice(null);
          setShape(next);
          setCount(n);
        };
        const free = api.mode === 'free';
        return (
          <>
            <WonderReadouts
              items={[
                { label: labels.circles, value: String(readout.circles) },
                { label: labels.error, value: pct(readout.error) },
                ...(readout.over > 0
                  ? [
                      {
                        label: labels.overshoot,
                        value: pct(readout.over),
                        tone: 'amber' as const,
                      },
                    ]
                  : []),
              ]}
            />
            <WonderChips
              label={labels.shape}
              value={free || drawing ? shape : null}
              onPick={pick}
              options={SHAPES.map((item) => ({
                value: item,
                label:
                  item === 'custom' ? (
                    <>
                      <PenLine />
                      {labels.shapes[item]}
                    </>
                  ) : (
                    labels.shapes[item]
                  ),
              }))}
            />
            <WonderSlider
              label={labels.circles}
              min={1}
              max={maxCircles(shape)}
              value={
                free ? count : Math.min(readout.circles, maxCircles(shape))
              }
              onChange={(n) => {
                if (!free) {
                  // Taking the slider mid-story keeps the scene on screen.
                  api.enterFree();
                  setShape(engine.target.shape);
                }
                engine.target = { ...engine.target, count: n };
                setCount(n);
              }}
            />
            <WonderToggle
              label={labels.showCircles}
              checked={showCircles}
              onChange={(next) => {
                engine.target = { ...engine.target, showCircles: next };
                setShowCircles(next);
              }}
            />
          </>
        );
      }}
    />
  );
}
