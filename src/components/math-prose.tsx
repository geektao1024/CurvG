import { Fragment } from 'react';

import { plainMath } from '@/lib/plain-math';

const POWER = /\^(\([^()]*\)|[\p{L}\p{N}]+)/u;

/**
 * Prose with light inline math: `plainMath` text, with exponents set as
 * superscripts (`x^(2/3)` → x²ᐟ³). The caret and parentheses stay in the
 * DOM as screen-reader-only text, so the page text still reads `x^(2/3)`,
 * matching the description and structured data.
 */
export function MathProse({ text }: { text: string }) {
  const parts = plainMath(text).split(new RegExp(POWER.source, 'gu'));
  // split with one capture group: even indexes are prose, odd are exponents.
  return parts.map((part, index) => {
    if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;
    const grouped = part.startsWith('(');
    return (
      <sup key={index} className="text-[0.72em] leading-none">
        <span className="sr-only">{grouped ? '^(' : '^'}</span>
        {grouped ? part.slice(1, -1) : part}
        {grouped ? <span className="sr-only">)</span> : null}
      </sup>
    );
  });
}
