import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type SVGProps,
} from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Minus } from 'lucide-react';

import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { PixelArrowRail } from '@/components/pixel-arrow';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const SCRAMBLE_CHARACTERS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{};:,.<>?';
const SCRAMBLE_WIDTH = 6;
const SCRAMBLE_INTERVAL_MS = 32;

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
  const [activeGroup, setActiveGroup] = useState(
    groups[1]?.key || groups[0]?.key || ''
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [billingRevision, setBillingRevision] = useState(0);

  const currentGroup =
    groups.find((group) => group.key === activeGroup) || groups[0];
  const yearlyGroup = groups[1];
  const isYearly = Boolean(
    yearlyGroup && currentGroup?.key === yearlyGroup.key
  );

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

  function toggleBilling() {
    if (!yearlyGroup || !groups[0]) return;
    setActiveGroup(isYearly ? groups[0].key : yearlyGroup.key);
    setBillingRevision((revision) => revision + 1);
  }

  if (!currentGroup) return null;

  return (
    <div>
      <div
        className={cn(
          'border-border -mx-px -mt-px grid w-[calc(100%+2px)] items-stretch gap-0',
          currentGroup.plans.length === 2
            ? 'md:grid-cols-2'
            : currentGroup.plans.length === 3
              ? 'lg:grid-cols-3'
              : 'sm:grid-cols-2 lg:grid-cols-4'
        )}
      >
        {currentGroup.plans.map((plan, planIndex) => {
          const isLoading = loadingId === plan.id || loadingPlanId === plan.id;
          const unavailable = disabledPlanIds.includes(plan.id);
          const featureGroups = plan.featureGroups || [
            { label: '', features: plan.features },
          ];

          return (
            <article
              key={`${plan.name}-${planIndex}`}
              className="border-border flex min-w-0 flex-col border-r border-b bg-transparent"
            >
              <div className="flex min-h-[21rem] flex-col gap-6 p-5 md:min-h-96 md:p-10">
                <div className="flex min-h-7 items-start justify-between gap-3">
                  <h3 className="font-sans text-xl leading-7 font-medium tracking-[-0.02em] md:text-2xl">
                    {plan.name}
                  </h3>
                  {plan.badge && (
                    <span className="bg-primary/10 text-primary shrink-0 rounded-[4px] px-1.5 py-0.5 text-xs leading-5 font-medium">
                      {plan.badge}
                    </span>
                  )}
                </div>

                {plan.description && (
                  <p className="text-muted-foreground -mt-3 min-h-[2.8rem] max-w-[19rem] text-base leading-[1.4]">
                    {plan.description}
                  </p>
                )}

                <div className="mt-auto min-h-12">
                  <PriceDisplay
                    key={`${currentGroup.key}-${plan.id}`}
                    price={plan.price}
                    interval={plan.interval}
                    originalPrice={plan.originalPrice}
                    animationRevision={billingRevision}
                    animate={
                      billingRevision > 0 &&
                      groups[0]?.plans[planIndex]?.price !==
                        yearlyGroup?.plans[planIndex]?.price
                    }
                  />
                </div>

                <div className="bg-card flex flex-col gap-4 rounded-[6px] p-3">
                  {yearlyGroup && (
                    <div className="grid min-h-[3.25rem] grid-cols-[55px_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
                      <BillingSwitch
                        checked={isYearly}
                        onChange={toggleBilling}
                        label={billingPeriodLabel || yearlyGroup.label}
                      />
                      <span className="text-foreground min-w-0 text-sm leading-5 font-medium whitespace-nowrap sm:text-base">
                        {yearlyGroup.label}
                      </span>
                      <span
                        className={cn(
                          'bg-primary/10 text-primary col-span-2 max-w-full justify-self-end truncate rounded-[4px] px-1.5 py-0.5 text-[11px] leading-5 font-medium transition-opacity duration-200 motion-reduce:transition-none',
                          isYearly && currentGroup.note && plan.productId
                            ? 'opacity-100'
                            : 'pointer-events-none opacity-0'
                        )}
                        aria-hidden={
                          !isYearly || !currentGroup.note || !plan.productId
                        }
                      >
                        {currentGroup.note || '\u00a0'}
                      </span>
                    </div>
                  )}

                  <AnimatedPricingCta
                    label={
                      isLoading
                        ? m['common.pricing.processing']()
                        : plan.buttonText || m['common.pricing.get_started']()
                    }
                    featured={plan.featured}
                    loading={isLoading}
                    unavailable={unavailable}
                    onClick={() => handleCheckout(plan)}
                  />
                </div>
              </div>

              <div>
                {featureGroups.map((featureGroup) => (
                  <div key={featureGroup.label || 'features'}>
                    {featureGroup.label && (
                      <p className="border-border bg-muted/35 text-muted-foreground border-t px-5 py-3 font-mono text-[9px] font-semibold tracking-[0.14em] uppercase md:px-10">
                        {featureGroup.label}
                      </p>
                    )}
                    <ul>
                      {featureGroup.features.map((feature, featureIndex) => {
                        const isObject = typeof feature !== 'string';
                        const Icon: IconComponent =
                          (isObject && feature.icon) || Check;
                        const label = isObject ? feature.label : feature;

                        return (
                          <li
                            key={`${label}-${featureIndex}`}
                            className="border-border flex min-h-11 items-center gap-2.5 border-t px-5 py-3 text-sm leading-5 md:min-h-16 md:px-10 md:py-5 md:text-base"
                          >
                            <span
                              className={cn(
                                'flex size-4 shrink-0 items-center justify-center rounded-full border',
                                plan.featured
                                  ? 'border-primary text-primary'
                                  : 'border-muted-foreground text-muted-foreground'
                              )}
                            >
                              <Icon className="size-2.5 stroke-[2.2]" />
                            </span>
                            <span className="text-foreground/78">{label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {comparisonSections.length > 0 && (
        <section
          className="border-border"
          aria-labelledby="plan-comparison-title"
        >
          <div className="relative overflow-hidden px-5 py-20 sm:px-10 sm:py-24">
            <span className="curvg-corner top-5 left-3 opacity-55" />
            <span className="curvg-corner right-3 bottom-5 rotate-180 opacity-55" />
            <div className="curvg-dotmatrix pointer-events-none absolute -right-8 bottom-0 size-52 opacity-20" />
            <div className="relative max-w-3xl">
              {comparisonEyebrow && (
                <p className="text-foreground font-mono text-xs font-medium">
                  <span className="text-muted-foreground mr-2">《</span>
                  <span className="text-primary">▦</span> {comparisonEyebrow}
                  <span className="text-muted-foreground ml-2">》</span>
                </p>
              )}
              {comparisonTitle && (
                <h2
                  id="plan-comparison-title"
                  className="mt-4 font-sans text-4xl tracking-tight sm:text-5xl"
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
          </div>

          <div className="border-border -mx-px w-[calc(100%+2px)] overflow-x-auto border-t">
            <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th className="bg-card border-border sticky left-0 z-10 w-[32%] border-r border-b px-5 py-5 font-mono text-[10px] tracking-[0.14em] uppercase sm:px-6">
                    {comparisonEyebrow}
                  </th>
                  {currentGroup.plans.map((plan) => (
                    <th
                      key={plan.id}
                      className="border-border min-w-40 border-r border-b px-5 py-5 sm:px-6"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-xl font-medium">
                          {plan.name}
                        </span>
                        {plan.featured && plan.badge && (
                          <span className="bg-primary/10 text-primary rounded-[4px] px-1.5 py-0.5 text-[9px] font-medium">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs font-normal">
                        {plan.price}
                        {plan.interval ? ` / ${plan.interval}` : ''}
                      </p>
                      <div className="mt-4">
                        <AnimatedPricingCta
                          label={
                            loadingId === plan.id || loadingPlanId === plan.id
                              ? m['common.pricing.processing']()
                              : plan.buttonText ||
                                m['common.pricing.get_started']()
                          }
                          featured={plan.featured}
                          loading={
                            loadingId === plan.id || loadingPlanId === plan.id
                          }
                          unavailable={disabledPlanIds.includes(plan.id)}
                          onClick={() => handleCheckout(plan)}
                        />
                      </div>
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

function BillingSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="focus-visible:ring-primary/45 relative flex h-7 w-[55px] shrink-0 items-center rounded-[5px] before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative block h-7 w-[55px] rounded-[5px] transition-colors duration-300 ease-out motion-reduce:transition-none',
          checked ? 'bg-primary' : 'dark:bg-muted bg-[#e3e3e3]'
        )}
      >
        <span
          className={cn(
            'bg-background absolute top-0.5 left-0.5 size-6 rounded-[4px] border border-black/10 shadow-[0_2px_5px_rgba(0,0,0,0.24)] transition-transform duration-300 ease-out motion-reduce:transition-none',
            checked && 'translate-x-[27px]'
          )}
        />
      </span>
    </button>
  );
}

function PriceDisplay({
  price,
  interval,
  originalPrice,
  animationRevision,
  animate,
}: {
  price: string;
  interval?: string;
  originalPrice?: string;
  animationRevision: number;
  animate: boolean;
}) {
  const { prefix, value, suffix } = splitFormattedPrice(price);
  const [scrambleFrame, setScrambleFrame] = useState<number | null>(null);

  useEffect(() => {
    setScrambleFrame(null);

    if (
      !animate ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const timers: number[] = [];
    const scrambleDelay = 250;
    const frameDuration = 32;
    const frameCount = 5;

    for (let frame = 0; frame < frameCount; frame += 1) {
      timers.push(
        window.setTimeout(
          () => setScrambleFrame(frame),
          scrambleDelay + frame * frameDuration
        )
      );
    }

    timers.push(
      window.setTimeout(
        () => setScrambleFrame(null),
        scrambleDelay + frameCount * frameDuration
      )
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [animate, animationRevision, value]);

  const displayCharacters = getPriceScrambleCharacters(value, scrambleFrame);

  return (
    <div>
      <div className="flex min-h-12 flex-wrap items-baseline gap-x-1.5 gap-y-1">
        {prefix && (
          <span className="font-sans text-base leading-none font-medium">
            {prefix}
          </span>
        )}
        <span
          className="font-sans text-[2.5rem] leading-none font-medium tracking-[-0.045em] md:text-[2.625rem]"
          aria-label={value}
        >
          {displayCharacters.map((character, index) => (
            <span
              // Position is stable for the lifetime of a single price value.
              key={`${index}-${character.target}`}
              aria-hidden="true"
              className={
                character.resolved ? 'text-foreground' : 'text-[#a1a1a1]'
              }
            >
              {character.display}
            </span>
          ))}
        </span>
        {suffix && (
          <span className="text-muted-foreground text-base leading-none">
            {suffix}
          </span>
        )}
        {interval && (
          <span className="text-muted-foreground text-base leading-none">
            / {interval}
          </span>
        )}
      </div>
      {originalPrice && (
        <p className="text-muted-foreground mt-1 text-xs leading-4">
          <span className="line-through">{originalPrice}</span>
        </p>
      )}
    </div>
  );
}

function getPriceScrambleCharacters(value: string, frame: number | null) {
  const characters = Array.from(value);

  if (frame === null) {
    return characters.map((character) => ({
      target: character,
      display: character,
      resolved: true,
    }));
  }

  const digitIndexes = characters
    .map((character, index) => (/\d/u.test(character) ? index : -1))
    .filter((index) => index >= 0);
  const resolutionOrder = [...digitIndexes].sort((left, right) => {
    const leftDistance = getPriceCharacterEdgeDistance(characters, left);
    const rightDistance = getPriceCharacterEdgeDistance(characters, right);

    return leftDistance - rightDistance || left - right;
  });
  const resolvedCount = Math.max(
    0,
    Math.floor((Math.max(0, frame - 1) / 4) * resolutionOrder.length)
  );
  const resolvedIndexes = new Set(resolutionOrder.slice(0, resolvedCount));

  return characters.map((character, index) => {
    if (!/\d/u.test(character) || resolvedIndexes.has(index)) {
      return { target: character, display: character, resolved: true };
    }

    return {
      target: character,
      display: getPriceScrambledCharacter(character, index, frame),
      resolved: false,
    };
  });
}

function getPriceCharacterEdgeDistance(characters: string[], index: number) {
  const punctuationIndexes = characters
    .map((character, characterIndex) =>
      /\d/u.test(character) ? -1 : characterIndex
    )
    .filter((characterIndex) => characterIndex >= 0);
  const boundaries = [-1, characters.length, ...punctuationIndexes];

  return Math.min(...boundaries.map((boundary) => Math.abs(index - boundary)));
}

function getPriceScrambledCharacter(
  source: string,
  index: number,
  frame: number
) {
  const offset = source.codePointAt(0) || 0;

  return SCRAMBLE_CHARACTERS[
    (offset + index * 13 + frame * 17) % SCRAMBLE_CHARACTERS.length
  ];
}

function splitFormattedPrice(price: string) {
  const normalized = price.trim();
  const match = normalized.match(
    /^([^\d+-]*)([+-]?(?:\d[\d\s.,]*\d|\d))(.*)$/u
  );

  if (!match) {
    return { prefix: '', value: normalized, suffix: '' };
  }

  return {
    prefix: match[1].trim(),
    value: match[2].trim(),
    suffix: match[3].trim(),
  };
}

function AnimatedPricingCta({
  label,
  featured,
  loading,
  unavailable,
  onClick,
}: {
  label: string;
  featured?: boolean;
  loading: boolean;
  unavailable: boolean;
  onClick: () => void;
}) {
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const pressedRef = useRef(false);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);
  const [animationCycle, setAnimationCycle] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [scrambleStep, setScrambleStep] = useState(0);
  const [pixelDelays, setPixelDelays] = useState(getDefaultPixelDelays);

  const setInteractionState = (nextActive: boolean) => {
    if (nextActive && !activeRef.current) {
      setPixelDelays(getPixelDelays());
      setAnimationCycle((cycle) => cycle + 1);
    }

    activeRef.current = nextActive;
    setActive(nextActive);
  };

  const syncInteractionState = () => {
    setInteractionState(
      hoveredRef.current || focusedRef.current || pressedRef.current
    );
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener('change', updateReducedMotion);

    return () => mediaQuery.removeEventListener('change', updateReducedMotion);
  }, []);

  useEffect(() => {
    if (!active) {
      setScrambleStep(0);
      return;
    }

    const totalSteps = Array.from(label).length + SCRAMBLE_WIDTH;

    if (reducedMotion) {
      setScrambleStep(totalSteps);
      return;
    }

    let nextStep = 0;
    setScrambleStep(0);

    const timer = window.setInterval(() => {
      nextStep += 1;
      setScrambleStep(nextStep);

      if (nextStep >= totalSteps) {
        window.clearInterval(timer);
      }
    }, SCRAMBLE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [active, animationCycle, label, reducedMotion]);

  const scramble = getScrambleSegments(label, scrambleStep);

  return (
    <button
      type="button"
      onClick={unavailable ? undefined : onClick}
      disabled={loading}
      aria-busy={loading}
      aria-disabled={loading || unavailable}
      aria-label={label}
      data-payment-unavailable={unavailable || undefined}
      data-active={active}
      data-variant={featured ? 'primary' : 'pricing'}
      onPointerEnter={() => {
        hoveredRef.current = true;
        syncInteractionState();
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
        pressedRef.current = false;
        syncInteractionState();
      }}
      onPointerDown={() => {
        pressedRef.current = true;
        syncInteractionState();
      }}
      onPointerUp={() => {
        pressedRef.current = false;
        syncInteractionState();
      }}
      onPointerCancel={() => {
        pressedRef.current = false;
        syncInteractionState();
      }}
      onFocus={(event) => {
        focusedRef.current = event.currentTarget.matches(':focus-visible');
        syncInteractionState();
      }}
      onBlur={() => {
        focusedRef.current = false;
        pressedRef.current = false;
        syncInteractionState();
      }}
      className={cn(
        'curvg-pixel-reveal-link h-[53px] min-h-[53px] w-full px-4 !text-[18px] font-medium disabled:cursor-wait disabled:opacity-75',
        featured
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-foreground'
      )}
    >
      <span
        key={animationCycle}
        className="curvg-pixel-reveal-grid"
        aria-hidden="true"
      >
        {pixelDelays.map((delay, index) => (
          <span
            key={`${featured ? 'primary' : 'pricing'}-${index}`}
            className="curvg-pixel-reveal-cell"
            style={{ '--curvg-pixel-delay': `${delay}ms` } as CSSProperties}
          />
        ))}
      </span>

      <span className="curvg-pixel-reveal-content" aria-hidden="true">
        <span className="curvg-pixel-label-stack">
          <span className="curvg-pixel-label-base">{label}</span>
          {active && (
            <span className="curvg-pixel-label-scramble">
              <span>{scramble.prefix}</span>
              <span className="curvg-pixel-label-noise">
                {scramble.scrambled}
              </span>
              <span className="curvg-pixel-label-hidden">
                {scramble.hidden}
              </span>
            </span>
          )}
        </span>
        <PixelArrowRail />
      </span>
    </button>
  );
}

function getDefaultPixelDelays() {
  return [405, 360, 225, 180, 45, 450, 315, 270, 135, 90];
}

function getPixelDelays() {
  const columns = 5;
  const rows = 2;
  const interval = 45;
  const delays = Array.from({ length: columns * rows }, () => 0);
  let step = 1;

  for (let column = columns - 1; column >= 0; column -= 1) {
    const rowOrder = Array.from({ length: rows }, (_, row) => row);

    if (rows > 1 && Math.random() > 0.5) {
      rowOrder.reverse();
    }

    for (const row of rowOrder) {
      delays[row * columns + column] = step * interval;
      step += 1;
    }
  }

  return delays;
}

function getScrambledCharacter(source: string, index: number, step: number) {
  if (/\s/u.test(source)) return source;

  const character =
    SCRAMBLE_CHARACTERS[
      (step * 17 + index * 13 + source.codePointAt(0)!) %
        SCRAMBLE_CHARACTERS.length
    ];

  if (
    source.toLocaleLowerCase() === source &&
    source.toLocaleUpperCase() !== source
  ) {
    return character.toLocaleLowerCase();
  }

  return character;
}

function getScrambleSegments(label: string, step: number) {
  const characters = Array.from(label);
  const prefixEnd = Math.min(
    characters.length,
    Math.max(0, step - SCRAMBLE_WIDTH)
  );
  const scrambleEnd = Math.min(characters.length, Math.max(0, step));

  return {
    prefix: characters.slice(0, prefixEnd).join(''),
    scrambled: characters
      .slice(prefixEnd, scrambleEnd)
      .map((character, index) =>
        getScrambledCharacter(character, prefixEnd + index, step)
      )
      .join(''),
    hidden: characters.slice(scrambleEnd).join(''),
  };
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
      <tr className="bg-muted/55">
        <th
          colSpan={plans.length + 1}
          className="border-border border-r border-b px-5 py-3 font-mono text-[9px] font-semibold tracking-[0.14em] uppercase sm:px-6"
        >
          {section.label}
        </th>
      </tr>
      {section.rows.map((row) => (
        <tr key={row.key}>
          <th className="bg-card border-border sticky left-0 z-10 border-r border-b px-5 py-4 font-medium sm:px-6">
            {row.label}
          </th>
          {plans.map((plan) => {
            const value = plan.comparison?.[row.key] ?? false;
            return (
              <td
                key={plan.id}
                className="border-border border-r border-b px-5 py-4 text-center sm:px-6"
              >
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
