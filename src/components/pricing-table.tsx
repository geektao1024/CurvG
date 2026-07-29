import { useState, type ComponentType, type SVGProps } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Check, Minus } from 'lucide-react';

import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type PricingFeature =
  | string
  | { icon?: IconComponent; label: string; tooltip?: string };

export interface PricingFeatureGroup {
  label: string;
  features: PricingFeature[];
}

export interface PricingComparisonSection {
  label: string;
  rows: Array<{ key: string; label: string }>;
}

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  price: string;
  originalPrice?: string;
  currency?: string;
  interval?: string;
  featured?: boolean;
  badge?: string;
  features: PricingFeature[];
  featureGroups?: PricingFeatureGroup[];
  comparison?: Record<string, string | boolean>;
  buttonText?: string;
  productId?: string;
  productName?: string;
  paymentProvider?: string;
  priceInCents?: number;
  credits?: number;
  creditsValidDays?: number;
  plan?: {
    name: string;
    interval: string;
    intervalCount: number;
  };
}

export interface PricingGroup {
  key: string;
  label: string;
  note?: string;
  plans: PricingPlan[];
}

export function PricingTable({
  groups,
  onCheckout,
  loadingPlanId,
  disabledPlanIds = [],
  comparisonEyebrow,
  comparisonTitle,
  comparisonDescription,
  comparisonSections = [],
  billingPeriodLabel,
  includedLabel,
  notIncludedLabel,
}: {
  groups: PricingGroup[];
  onCheckout?: (plan: PricingPlan) => void;
  loadingPlanId?: string | null;
  disabledPlanIds?: string[];
  comparisonEyebrow?: string;
  comparisonTitle?: string;
  comparisonDescription?: string;
  comparisonSections?: PricingComparisonSection[];
  billingPeriodLabel?: string;
  includedLabel?: string;
  notIncludedLabel?: string;
}) {
  const [activeGroup, setActiveGroup] = useState(groups[0]?.key || '');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const currentGroup = groups.find((g) => g.key === activeGroup) || groups[0];

  const checkoutMutation = useMutation({
    mutationFn: (plan: PricingPlan) =>
      apiPost<{ checkout_url?: string }>('/api/payment/checkout', {
        product_id: plan.productId,
        product_name: plan.productName || plan.name,
        plan_name: plan.plan?.name || plan.name,
        price: plan.priceInCents,
        currency: plan.currency || 'usd',
        type: plan.plan ? 'subscription' : 'one-time',
        description: plan.name,
        plan: plan.plan,
        credits: plan.credits,
        credits_valid_days: plan.creditsValidDays,
        payment_provider: plan.paymentProvider || 'stripe',
      }),
    onSuccess: (data) => {
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onSettled: () => {
      setLoadingId(null);
    },
  });

  function handleCheckout(plan: PricingPlan) {
    if (onCheckout) {
      onCheckout(plan);
      return;
    }

    if (!plan.productId || !plan.priceInCents) return;

    setLoadingId(plan.id);
    checkoutMutation.mutate(plan);
  }

  return (
    <div>
      {groups.length > 1 && (
        <div className="mb-12 flex flex-col items-center gap-3">
          <div
            className="border-border/80 bg-card/75 inline-flex items-center rounded-full border p-1 shadow-[0_16px_45px_-34px_color-mix(in_oklab,var(--foreground)_45%,transparent)] backdrop-blur"
            aria-label={billingPeriodLabel}
          >
            {groups.map((group) => (
              <button
                type="button"
                key={group.key}
                onClick={() => setActiveGroup(group.key)}
                aria-pressed={activeGroup === group.key}
                className={cn(
                  'focus-visible:ring-primary/40 rounded-full px-5 py-2 text-sm font-semibold transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none',
                  activeGroup === group.key
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {group.label}
              </button>
            ))}
          </div>
          {currentGroup?.note && (
            <p className="text-primary font-mono text-[10px] font-semibold tracking-[0.14em] uppercase">
              {currentGroup.note}
            </p>
          )}
        </div>
      )}

      <div
        className={cn(
          'mx-auto grid items-stretch gap-4 lg:gap-5',
          currentGroup?.plans.length === 2
            ? 'max-w-3xl sm:grid-cols-2'
            : currentGroup?.plans.length === 3
              ? 'max-w-6xl md:grid-cols-3'
              : 'max-w-6xl sm:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {currentGroup?.plans.map((plan, planIndex) => (
          <div
            key={plan.id}
            className={cn(
              'group/plan relative flex min-h-[34rem] flex-col overflow-hidden rounded-[1.75rem] border p-6 transition-[transform,border-color,box-shadow,background-color] duration-300 motion-reduce:transition-none sm:p-7',
              plan.featured
                ? 'border-primary/55 bg-primary/[0.065] shadow-[0_28px_80px_-52px_color-mix(in_oklab,var(--primary)_70%,transparent)]'
                : 'border-border/85 bg-card/72 hover:border-foreground/25 hover:-translate-y-1 hover:shadow-[0_24px_65px_-52px_color-mix(in_oklab,var(--foreground)_45%,transparent)]'
            )}
          >
            <span className="curvg-corner top-3 left-3 opacity-60" />
            <span className="curvg-corner right-3 bottom-3 rotate-180 opacity-60" />
            <div className="mb-8 flex items-center justify-between gap-4">
              <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                {String(planIndex + 1).padStart(2, '0')} /{' '}
                {String(currentGroup.plans.length).padStart(2, '0')}
              </span>
              {plan.badge && (
                <span className="border-primary/25 bg-primary/10 text-primary rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold tracking-[0.08em] uppercase">
                  {plan.badge}
                </span>
              )}
            </div>
            {plan.name && (
              <h3 className="font-serif text-3xl leading-none tracking-tight sm:text-[2.15rem]">
                {plan.name}
              </h3>
            )}

            <div className="mt-6 flex min-h-16 items-baseline gap-1.5">
              <span className="font-serif text-5xl leading-none tracking-[-0.045em] sm:text-[3.4rem]">
                {plan.price}
              </span>
              {plan.interval && (
                <span className="text-muted-foreground text-xs font-medium">
                  /{plan.interval}
                </span>
              )}
            </div>
            {plan.originalPrice && (
              <p className="text-muted-foreground mt-1 text-xs">
                <span className="line-through">{plan.originalPrice}</span>
              </p>
            )}

            {plan.description && (
              <p className="text-muted-foreground mt-4 min-h-12 text-sm leading-6">
                {plan.description}
              </p>
            )}

            <div className="mt-7 space-y-6">
              {(
                plan.featureGroups || [{ label: '', features: plan.features }]
              ).map((featureGroup) => (
                <div
                  key={featureGroup.label || 'features'}
                  className="border-border/75 border-t pt-4"
                >
                  {featureGroup.label && (
                    <p className="text-muted-foreground mb-3 font-mono text-[9px] font-semibold tracking-[0.14em] uppercase">
                      {featureGroup.label}
                    </p>
                  )}
                  <ul className="space-y-3">
                    {featureGroup.features.map((feature, featureIndex) => {
                      const isObj = typeof feature !== 'string';
                      const Icon: IconComponent =
                        (isObj && feature.icon) || Check;
                      const label = isObj ? feature.label : feature;
                      return (
                        <li
                          key={`${label}-${featureIndex}`}
                          className="flex items-start gap-2.5 text-sm leading-5"
                        >
                          <Icon className="text-primary mt-0.5 size-4 shrink-0" />
                          <span className="text-foreground/88">{label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <Button
                variant={plan.featured ? 'default' : 'outline'}
                className="group/button h-11 w-full rounded-full text-sm font-semibold"
                onClick={() => handleCheckout(plan)}
                disabled={
                  loadingId === plan.id ||
                  loadingPlanId === plan.id ||
                  disabledPlanIds.includes(plan.id)
                }
              >
                {loadingId === plan.id || loadingPlanId === plan.id
                  ? m['common.pricing.processing']()
                  : plan.buttonText || m['common.pricing.get_started']()}
                <ArrowRight className="transition-transform group-hover/button:translate-x-0.5 motion-reduce:transition-none" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {comparisonSections.length > 0 && currentGroup && (
        <section
          className="mt-24 sm:mt-32"
          aria-labelledby="plan-comparison-title"
        >
          <div className="max-w-3xl">
            {comparisonEyebrow && (
              <p className="text-primary font-mono text-[10px] font-semibold tracking-[0.16em] uppercase">
                {comparisonEyebrow}
              </p>
            )}
            {comparisonTitle && (
              <h2
                id="plan-comparison-title"
                className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl"
              >
                {comparisonTitle}
              </h2>
            )}
            {comparisonDescription && (
              <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
                {comparisonDescription}
              </p>
            )}
          </div>

          <div className="border-border/80 bg-card/65 mt-10 overflow-x-auto rounded-[1.75rem] border shadow-[0_24px_70px_-58px_color-mix(in_oklab,var(--foreground)_40%,transparent)]">
            <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-border/80 border-b">
                  <th className="bg-card/95 sticky left-0 z-10 w-[32%] px-5 py-5 font-mono text-[10px] tracking-[0.14em] uppercase sm:px-6">
                    {comparisonEyebrow}
                  </th>
                  {currentGroup.plans.map((plan) => (
                    <th key={plan.id} className="min-w-40 px-5 py-5 sm:px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-xl">{plan.name}</span>
                        {plan.featured && plan.badge && (
                          <span className="text-primary font-mono text-[8px] font-semibold tracking-[0.08em] uppercase">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs font-normal">
                        {plan.price}
                        {plan.interval ? ` / ${plan.interval}` : ''}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonSections.map((section) => (
                  <PricingComparisonRows
                    key={section.label}
                    section={section}
                    plans={currentGroup.plans}
                    includedLabel={includedLabel}
                    notIncludedLabel={notIncludedLabel}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function PricingComparisonRows({
  section,
  plans,
  includedLabel,
  notIncludedLabel,
}: {
  section: PricingComparisonSection;
  plans: PricingPlan[];
  includedLabel?: string;
  notIncludedLabel?: string;
}) {
  return (
    <>
      <tr className="bg-muted/55 border-border/70 border-y first:border-t-0">
        <th
          colSpan={plans.length + 1}
          className="px-5 py-3 font-mono text-[9px] font-semibold tracking-[0.14em] uppercase sm:px-6"
        >
          {section.label}
        </th>
      </tr>
      {section.rows.map((row) => (
        <tr key={row.key} className="border-border/55 border-b last:border-b-0">
          <th className="bg-card/95 sticky left-0 z-10 px-5 py-4 font-medium sm:px-6">
            {row.label}
          </th>
          {plans.map((plan) => {
            const value = plan.comparison?.[row.key] ?? false;
            return (
              <td key={plan.id} className="px-5 py-4 text-center sm:px-6">
                {typeof value === 'boolean' ? (
                  value ? (
                    <Check
                      className="text-primary mx-auto size-4"
                      aria-label={includedLabel}
                    />
                  ) : (
                    <Minus
                      className="text-muted-foreground/45 mx-auto size-4"
                      aria-label={notIncludedLabel}
                    />
                  )
                ) : (
                  <span className="text-foreground/82">{value}</span>
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
