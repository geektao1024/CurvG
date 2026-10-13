import { ArrowRight, Check } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { getPricingProduct } from '@/config/pricing';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SectionHeading } from '@/components/section-heading';

function monthly(productId: string, locale: string) {
  const product = getPricingProduct(productId);
  if (!product) return null;
  const price = new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: product.priceInCents % 100 === 0 ? 0 : 2,
  }).format(product.priceInCents / 100);
  return { name: product.planName, price, credits: product.credits };
}

/**
 * Homepage pricing summary: labs are free, video plans start here. The full
 * table and checkout live on /pricing; prices come from the same catalog.
 */
export function HomePricing() {
  const locale = getLocale();
  const starter = monthly('starter_monthly', locale);
  const pro = monthly('pro_monthly', locale);
  const tiers = [
    {
      name: m['home.pricing.free_name'](),
      price: m['home.pricing.free_price'](),
      unit: '',
      note: m['home.pricing.free_note'](),
      accent: true,
    },
    ...(starter
      ? [
          {
            name: starter.name,
            price: starter.price,
            unit: m['home.pricing.per_month'](),
            note: m['home.pricing.starter_note']({ credits: starter.credits }),
            accent: false,
          },
        ]
      : []),
    ...(pro
      ? [
          {
            name: pro.name,
            price: pro.price,
            unit: m['home.pricing.per_month'](),
            note: m['home.pricing.pro_note']({ credits: pro.credits }),
            accent: false,
          },
        ]
      : []),
  ];

  return (
    <section id="pricing">
      <div className="curvg-stage curvg-frame curvg-section-spacing relative border-b">
        <SectionHeading
          eyebrow={m['home.pricing.eyebrow']()}
          title={m['home.pricing.title']()}
          action={
            <Link
              href="/pricing"
              className="bg-foreground text-background hover:bg-foreground/90 inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors"
            >
              {m['home.pricing.cta']()}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => (
            <li
              key={tier.name}
              className={cn(
                'bg-card rounded-2xl border p-6',
                tier.accent && 'border-primary/40 bg-primary/[0.04]'
              )}
            >
              <p className="text-muted-foreground font-mono text-xs tracking-[0.14em] uppercase">
                {tier.name}
              </p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="curvg-heading text-4xl">{tier.price}</span>
                {tier.unit ? (
                  <span className="text-muted-foreground text-sm">
                    {tier.unit}
                  </span>
                ) : null}
              </p>
              <p className="text-muted-foreground mt-4 flex gap-2 text-sm leading-relaxed">
                <Check
                  className={cn(
                    'mt-0.5 size-4 shrink-0',
                    tier.accent ? 'text-primary' : 'text-muted-foreground'
                  )}
                  aria-hidden
                />
                {tier.note}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
