import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { RichMath } from '@/components/rich-math';

/** One multiple-choice question; reveals the explanation once answered. */
export function QuizCard({
  number,
  question,
  choices,
  answer,
  explanation,
  correctLabel,
  incorrectLabel,
}: {
  number: number;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
  correctLabel: string;
  incorrectLabel: string;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  // Same order on server and client; rotate so the answer is not always first.
  const order = useMemo(
    () => choices.map((_, i) => (i + number) % choices.length),
    [choices, number]
  );
  const answered = picked !== null;

  return (
    <div className="lw-quiz">
      <p className="q">Q{String(number).padStart(2, '0')}</p>
      <RichMath source={question} className="ask" />
      <div className="lw-chips">
        {order.map((choiceIndex) => {
          const isAnswer = choiceIndex === answer;
          const isPicked = choiceIndex === picked;
          return (
            <button
              key={choiceIndex}
              type="button"
              disabled={answered}
              onClick={() => setPicked(choiceIndex)}
              className={cn(
                answered && isAnswer && 'right',
                answered && isPicked && !isAnswer && 'wrong'
              )}
            >
              <span className="min-w-0 flex-1">
                <RichMath source={choices[choiceIndex]} />
              </span>
              {answered && isAnswer ? (
                <Check className="size-4 shrink-0 text-(--lw-ok)" />
              ) : null}
              {answered && isPicked && !isAnswer ? (
                <X className="size-4 shrink-0 text-(--lw-red)" />
              ) : null}
            </button>
          );
        })}
      </div>
      {answered ? (
        <div className="verdict">
          <b className={picked === answer ? 'ok' : 'bad'}>
            {picked === answer ? correctLabel : incorrectLabel}
          </b>
          <RichMath source={explanation} />
        </div>
      ) : null}
    </div>
  );
}
