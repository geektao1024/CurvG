import { Link } from '@/core/i18n/navigation';
import { CurveThumb } from '@/components/curve-preview';
import type { CurveDef } from '@/content/curves';

export function LibraryCurveCard({
  curve,
  locale,
  badge,
  ariaLabel,
  heading: Heading = 'h3',
}: {
  curve: CurveDef;
  locale: 'en' | 'zh';
  badge?: string;
  ariaLabel: string;
  /** h2 when the grid sits directly under the page H1. */
  heading?: 'h2' | 'h3';
}) {
  return (
    <Link
      href={`/curves/${curve.slug}`}
      className="group bg-card hover:border-primary/50 block overflow-hidden rounded-2xl border transition-colors"
    >
      <div className="bg-muted/20 aspect-[4/3] border-b">
        <CurveThumb curve={curve} ariaLabel={ariaLabel} />
      </div>
      <div className="p-5">
        {badge ? (
          <p className="text-primary mb-2 font-mono text-[10px] tracking-[0.14em] uppercase">
            {badge}
          </p>
        ) : null}
        <Heading className="group-hover:text-primary text-lg font-semibold tracking-tight transition-colors">
          {curve.name[locale]}
        </Heading>
        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
          {curve.short[locale]}
        </p>
      </div>
    </Link>
  );
}
