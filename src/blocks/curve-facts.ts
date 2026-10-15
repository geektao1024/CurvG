import { plainMath } from '@/lib/plain-math';
import { m } from '@/paraglide/messages.js';
import {
  factLines,
  getCurveFacts,
  type CurveDef,
  type CurveFact,
  type CurveFactKind,
} from '@/content/curves';
import { contentLocale } from '@/content/text';

type Opts = { locale: never };

const LABELS: Record<Exclude<CurveFactKind, 'other'>, (o: Opts) => string> = {
  cartesian: (o) => m['curves.fact.cartesian']({}, o),
  parametric: (o) => m['curves.fact.parametric']({}, o),
  polar: (o) => m['curves.fact.polar']({}, o),
  arc_length: (o) => m['curves.fact.arc_length']({}, o),
  perimeter: (o) => m['curves.fact.perimeter']({}, o),
  area: (o) => m['curves.fact.area']({}, o),
  foci: (o) => m['curves.fact.foci']({}, o),
  eccentricity: (o) => m['curves.fact.eccentricity']({}, o),
  asymptote: (o) => m['curves.fact.asymptote']({}, o),
  period: (o) => m['curves.fact.period']({}, o),
  cusps: (o) => m['curves.fact.cusps']({}, o),
  rule: (o) => m['curves.fact.rule']({}, o),
};

const EQUATION_KINDS: readonly CurveFactKind[] = [
  'cartesian',
  'parametric',
  'polar',
];

/** Measures a searcher asks about, in the order the FAQ answers them. */
const FAQ_KINDS = ['rule', 'perimeter', 'arc_length', 'area'] as const;

const FAQ_QUESTIONS: Record<
  'equation' | (typeof FAQ_KINDS)[number],
  (name: string, o: Opts) => string
> = {
  equation: (name, o) => m['curves.faq.equation']({ name }, o),
  rule: (name, o) => m['curves.faq.rule']({ name }, o),
  perimeter: (name, o) => m['curves.faq.perimeter']({ name }, o),
  arc_length: (name, o) => m['curves.faq.arc_length']({ name }, o),
  area: (name, o) => m['curves.faq.area']({ name }, o),
};

export type CurveFactRow = {
  label: string;
  note?: string;
  tex: readonly string[];
  /** A rule in words, shown instead of (or after) the formula. */
  text?: string;
  /** The quantity for the slider values on screen, e.g. "≈ 7.2". */
  current?: string;
};

/** Four significant figures, no trailing zeros: 565.49 → 565.5, 6 → 6. */
export function formatValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  const rounded = Number(value.toPrecision(4));
  return rounded === value ? `= ${rounded}` : `≈ ${rounded}`;
}

function factLabel(fact: CurveFact, locale: string): string {
  const lang = contentLocale(locale);
  if (fact.label) return fact.label[lang];
  // `other` always carries its own label (tests/curves-seo.test.ts).
  if (fact.kind === 'other') return '';
  return LABELS[fact.kind]({ locale: locale as never });
}

/** The formula card: one row per fact, labelled in the page language. */
export function curveFactRows(
  curve: CurveDef,
  locale: string,
  values?: Record<string, number>
): { rows: CurveFactRow[]; where: string } | null {
  const card = getCurveFacts(curve.slug);
  if (!card) return null;
  const lang = contentLocale(locale);
  return {
    rows: card.facts.map((fact) => ({
      label: factLabel(fact, locale),
      note: fact.note?.[lang],
      tex: factLines(fact),
      text: fact.text?.[lang],
      current:
        values && fact.value ? formatValue(fact.value(values)) : undefined,
    })),
    where: card.where[lang],
  };
}

/**
 * Questions people search for ("cycloid equation", "perimeter of astroid"),
 * answered from the same facts as the card, in plain text so the visible
 * answer and the FAQPage structured data are word for word the same.
 */
export function curveFaq(
  curve: CurveDef,
  locale: string
): { question: string; answer: string }[] {
  const card = getCurveFacts(curve.slug);
  if (!card) return [];
  const lang = contentLocale(locale);
  const opts = { locale: locale as never };
  const name = curve.name[lang];
  const zh = lang === 'zh';
  const sentence = (fact: CurveFact) => {
    const note = fact.note
      ? zh
        ? `（${fact.note.zh}）`
        : ` (${fact.note.en})`
      : '';
    const formula = [
      ...factLines(fact).map(plainMath),
      ...(fact.text ? [fact.text[lang]] : []),
    ].join(zh ? '，' : ', ');
    return `${factLabel(fact, locale)}${note}${zh ? '：' : ': '}${formula}`;
  };
  const answer = (facts: readonly CurveFact[]) =>
    `${facts.map(sentence).join(zh ? '；' : '; ')}${zh ? '。' : '.'}${zh ? '' : ' '}${card.where[lang]}`;

  const items: { question: string; answer: string }[] = [];
  const equations = card.facts.filter((fact) =>
    EQUATION_KINDS.includes(fact.kind)
  );
  if (equations.length > 0) {
    items.push({
      question: FAQ_QUESTIONS.equation(name, opts),
      answer: answer(equations),
    });
  }
  for (const kind of FAQ_KINDS) {
    const facts = card.facts.filter((fact) => fact.kind === kind);
    if (facts.length > 0) {
      items.push({
        question: FAQ_QUESTIONS[kind](name, opts),
        answer: answer(facts),
      });
    }
  }
  return items;
}

/** What "Copy LaTeX" puts on the clipboard: every form of the equation. */
export function curveLatex(curve: CurveDef): string {
  const card = getCurveFacts(curve.slug);
  const forms = card?.facts.filter((fact) =>
    EQUATION_KINDS.includes(fact.kind)
  );
  return forms?.length
    ? forms.flatMap((fact) => factLines(fact)).join('\n')
    : curve.equations.join('\n');
}
