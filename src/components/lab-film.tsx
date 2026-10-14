import { useMemo } from 'react';

import {
  evaluateBoard,
  type BoardFrame,
  type CompiledBoard,
} from '@/lib/board/evaluate';
import {
  cueAt,
  LAB_FILM_SIZE,
  paramsAt,
  type LabFilmAspect,
  type LabFilmCue,
  type LabFilmTimeline,
} from '@/lib/lab-video/timeline';
import { cn } from '@/lib/utils';
import { BoardCanvas } from '@/components/lab-board';
import { InlineTex, RichMath } from '@/components/rich-math';

export type LabFilmText = {
  brand: string;
  context: string;
  chapterTitle: string;
  question: string;
  keyPoints: string[];
  steps: { title: string; body: string }[];
  resultTex: string;
  stepLabel: (index: number, total: number) => string;
  outroTitle: string;
  outroBody: string;
  url: string;
  boardLabel: string;
};

/**
 * The board is laid out at 1/BOARD_ZOOM of its frame and scaled up, so
 * strokes, points and labels keep the proportions they have in the lab
 * instead of shrinking to hairlines at 1080p.
 */
const BOARD_ZOOM = 1.6;

/** Seconds a panel takes to fade in at the start of a cue. */
const FADE = 0.45;

/**
 * One frame of a lab film at time `t`: the lab's board on the left (top in
 * portrait), the narrated step beside it, live readouts under the text.
 * Everything is a pure function of `t` (no CSS transitions), so a capture
 * script can seek to any frame and get the same pixels every time.
 */
export function LabFilmFrame({
  film,
  board,
  text,
  aspect,
  t,
}: {
  film: LabFilmTimeline;
  board: CompiledBoard;
  text: LabFilmText;
  aspect: LabFilmAspect;
  t: number;
}) {
  const size = LAB_FILM_SIZE[aspect];
  const boardSize =
    aspect === 'landscape'
      ? { width: 1140, height: 940 }
      : { width: 1000, height: 1000 };
  const cue = cueAt(film, t);
  const values = paramsAt(film, t);
  const frame = useMemo(() => evaluateBoard(board, values), [board, values]);
  const fade = Math.min(1, Math.max(0, (t - cue.start) / FADE));
  const steps = film.cues.filter((c) => c.kind === 'step');

  return (
    <div
      className={cn('lf', `lf-${aspect}`)}
      style={{ width: size.width, height: size.height }}
    >
      <div className="lf-board">
        <div
          style={{
            width: boardSize.width / BOARD_ZOOM,
            height: boardSize.height / BOARD_ZOOM,
            transform: `scale(${BOARD_ZOOM})`,
            transformOrigin: '0 0',
          }}
        >
          <BoardCanvas
            spec={board.spec}
            frame={frame}
            ariaLabel={text.boardLabel}
            size={{
              width: boardSize.width / BOARD_ZOOM,
              height: boardSize.height / BOARD_ZOOM,
            }}
            theme="paper"
          />
        </div>
      </div>

      <div className="lf-side">
        <div className="lf-brand">
          <i />
          <b>{text.brand}</b>
          <span>{text.context}</span>
        </div>

        <div
          className="lf-panel"
          style={{
            opacity: fade,
            transform: `translateY(${(1 - fade) * 18}px)`,
          }}
        >
          <Panel cue={cue} text={text} total={steps.length} />
        </div>

        {cue.kind === 'step' && (
          <Readouts tex={text.resultTex} readouts={frame.readouts} />
        )}

        <div className="lf-progress" aria-hidden>
          {steps.map((step, i) => {
            const p = Math.min(
              1,
              Math.max(0, (t - step.start) / (step.end - step.start))
            );
            return (
              <span key={i}>
                <i style={{ width: `${p * 100}%` }} />
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Panel({
  cue,
  text,
  total,
}: {
  cue: LabFilmCue;
  text: LabFilmText;
  total: number;
}) {
  if (cue.kind === 'intro') {
    return (
      <>
        <div className="lf-kicker">{text.chapterTitle}</div>
        <h1 className="lf-question">{text.question}</h1>
        <ul className="lf-points">
          {text.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </>
    );
  }
  if (cue.kind === 'outro') {
    return (
      <>
        <div className="lf-kicker">{text.chapterTitle}</div>
        <h2 className="lf-question">{text.outroTitle}</h2>
        <p className="lf-body">{text.outroBody}</p>
        <div className="lf-url">{text.url}</div>
      </>
    );
  }
  const step = text.steps[cue.step ?? 0];
  return (
    <>
      <div className="lf-kicker">
        {text.stepLabel((cue.step ?? 0) + 1, total)}
      </div>
      <h2 className="lf-title">{step.title}</h2>
      <RichMath source={step.body} className="lf-body" />
    </>
  );
}

function Readouts({
  tex,
  readouts,
}: {
  tex: string;
  readouts: BoardFrame['readouts'];
}) {
  const values = readouts.filter((r) => r.kind === 'value').slice(0, 4);
  return (
    <div className="lf-readouts">
      <InlineTex tex={tex} className="lf-result" />
      <dl>
        {values.map((readout, i) => (
          <div key={i} className={readout.highlight ? 'hl' : undefined}>
            <dt>
              <InlineTex tex={readout.label} />
            </dt>
            <dd>{readout.text}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
