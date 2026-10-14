import { useRef, useState, type ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

import {
  formatGap,
  longRun,
  LorenzEngine,
  RHO,
  SWARM_SIZE,
  type LongRun,
  type LorenzText,
} from '@/lib/wonders/lorenz';
import {
  WonderReadouts,
  WonderSlider,
  WonderStage,
  WonderToggle,
  type WonderStageLabels,
} from '@/components/wonder-stage';

export type LorenzLabels = LorenzText & {
  rho: string;
  longRun: string;
  states: Record<LongRun, string>;
  gapLabel: string;
  points: string;
  reseed: string;
  showPath: string;
  hint: string;
};

/** Wonder No. 3: the Lorenz butterfly, where tiny differences explode. */
export function LorenzWonder({
  stage,
  labels,
  overlay,
}: {
  stage: WonderStageLabels;
  labels: LorenzLabels;
  overlay?: ReactNode;
}) {
  const [engine] = useState(() => new LorenzEngine(labels));
  const [rho, setRho] = useState(RHO);
  const [count, setCount] = useState(SWARM_SIZE);
  const [showPath, setShowPath] = useState(true);
  const [gap, setGap] = useState<number | null>(null);
  const apiRef = useRef<{ enterFree: () => void } | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);

  return (
    <WonderStage
      engine={engine}
      labels={stage}
      overlay={overlay}
      onTick={() => setGap(engine.scene.twins > 0.5 ? engine.gap : null)}
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
        return (
          <>
            <WonderReadouts
              items={[
                { label: labels.rho, value: rho.toFixed(1) },
                { label: labels.longRun, value: labels.states[longRun(rho)] },
                ...(gap !== null
                  ? [
                      {
                        label: labels.gapLabel,
                        value: formatGap(gap),
                        tone: 'amber' as const,
                      },
                    ]
                  : []),
              ]}
            />
            <WonderSlider
              label={labels.rho}
              min={0.5}
              max={40}
              step={0.5}
              value={rho}
              display={rho.toFixed(1)}
              onChange={(value) => {
                api.enterFree();
                engine.setRho(value);
                setRho(value);
              }}
            />
            <WonderSlider
              label={labels.points}
              min={500}
              max={6000}
              step={500}
              value={count}
              onChange={(value) => {
                api.enterFree();
                engine.setCount(value);
                setCount(value);
              }}
            />
            <div className="wonder-chips">
              <button
                type="button"
                className="wonder-chip"
                onClick={() => {
                  api.enterFree();
                  engine.reseed();
                }}
              >
                <Sparkles />
                {labels.reseed}
              </button>
            </div>
            <WonderToggle
              label={labels.showPath}
              checked={showPath}
              onChange={(next) => {
                engine.showPath = next;
                setShowPath(next);
              }}
            />
            <p className="wonder-panel-hint">{labels.hint}</p>
          </>
        );
      }}
    />
  );
}
