import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Code2, Film, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { getPricingProduct, type PricingProduct } from '@/config/pricing';
import type { AnimationModelCatalog } from '@/lib/animation';
import { apiGet, apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  PaymentProviderModal,
  type PaymentProvider,
} from '@/components/payment-provider-modal';
import {
  PricingTable,
  type PricingComparisonSection,
  type PricingGroup,
  type PricingPlan,
} from '@/components/pricing-table';

const SUPPORTED_PROVIDERS: PaymentProvider[] = ['stripe', 'creem', 'paypal'];

interface PaymentProviderAvailability {
  providers: string[];
  defaultProvider: string | null;
}

function displayCents(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

function displayPrice(product: PricingProduct, locale: string) {
  return displayCents(product.priceInCents, product.currency, locale);
}

export function Pricing({ title }: { title?: string } = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const locale = getLocale();
  const { data: configsData } = usePublicConfig();
  const configs = configsData ?? {};
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);

  const tierQuery = useQuery({
    queryKey: ['animation-models', session?.user?.id],
    queryFn: () => apiGet<AnimationModelCatalog>('/api/animations/models'),
    enabled: !!session?.user,
    staleTime: 0,
  });
  const viewerTier = tierQuery.data?.viewerTier ?? 'free';
  const tierLoading = !!session?.user && tierQuery.isLoading;
  // Model discovery is an informational surface, not a prerequisite for
  // purchasing a paid plan. If Yunwu's catalog is temporarily unavailable, the
  // checkout endpoint still performs the authoritative entitlement check.

  const providerQuery = useQuery({
    queryKey: ['payment-providers'],
    queryFn: () =>
      apiGet<PaymentProviderAvailability>('/api/payment/providers'),
    staleTime: 30_000,
  });

  const enabledProviders = useMemo<PaymentProvider[]>(
    () =>
      SUPPORTED_PROVIDERS.filter((provider) =>
        providerQuery.data?.providers.includes(provider)
      ),
    [providerQuery.data]
  );
  const paymentsAvailable =
    providerQuery.isSuccess && enabledProviders.length > 0;
  const starterMonthly = getPricingProduct('starter_monthly')!;
  const starterYearly = getPricingProduct('starter_yearly')!;
  const proMonthly = getPricingProduct('pro_monthly')!;
  const proYearly = getPricingProduct('pro_yearly')!;
  const renderCreditCost = Math.max(
    1,
    Number.parseInt(configs.animation_render_credits || '20', 10) || 20
  );

  function renderEstimate(product: PricingProduct) {
    return Math.floor(product.credits / renderCreditCost);
  }

  const freeFeatures = [
    { icon: Sparkles, label: m['landing.pricing.feature_free_model']() },
    { icon: Check, label: m['landing.pricing.feature_scene_plans']() },
    { icon: Code2, label: m['landing.pricing.feature_code_export']() },
  ];
  const starterFeatures = [
    { icon: Sparkles, label: m['landing.pricing.feature_starter_models']() },
    { icon: Check, label: m['landing.pricing.feature_everything_free']() },
  ];
  const proFeatures = [
    { icon: Sparkles, label: m['landing.pricing.feature_pro_models']() },
    { icon: RefreshCw, label: m['landing.pricing.feature_auto_failover']() },
    { icon: Check, label: m['landing.pricing.feature_everything_starter']() },
  ];

  function freePlan(group: string): PricingPlan {
    return {
      id: `free-${group}`,
      name: m['landing.pricing.free'](),
      description: m['landing.pricing.free_desc'](),
      price: '$0',
      features: freeFeatures,
      featureGroups: [
        {
          label: m['landing.pricing.group.creation'](),
          features: freeFeatures,
        },
        {
          label: m['landing.pricing.group.rendering'](),
          features: [
            {
              icon: Film,
              label: m['landing.pricing.feature_no_render_credits'](),
            },
          ],
        },
      ],
      comparison: {
        models: m['landing.pricing.comparison.one_model'](),
        fallback: false,
        credits: '—',
        renders: '—',
        previews: true,
        review: true,
        python: true,
        video: false,
        expiration: '—',
      },
      buttonText: !session?.user
        ? m['common.pricing.start_free']()
        : viewerTier === 'free'
          ? m['common.pricing.current_plan']()
          : m['common.pricing.open_creator'](),
    };
  }

  function paidPlan(params: {
    tier: 'starter' | 'pro';
    group: string;
    product: PricingProduct;
    originalPrice?: string;
    interval?: string;
  }): PricingPlan {
    const isStarter = params.tier === 'starter';
    const isCurrent = viewerTier === params.tier;
    const hasPaidPlan = viewerTier !== 'free';
    const estimate = renderEstimate(params.product);
    return {
      id: `${params.tier}-${params.group}`,
      name: isStarter
        ? m['landing.pricing.starter']()
        : m['landing.pricing.pro'](),
      description: isStarter
        ? m['landing.pricing.starter_desc']()
        : m['landing.pricing.pro_desc'](),
      price: displayPrice(params.product, locale),
      originalPrice: params.originalPrice,
      interval: params.interval,
      featured: isStarter,
      badge: isStarter
        ? m['landing.pricing.popular']()
        : m['landing.pricing.full_power'](),
      features: isStarter ? starterFeatures : proFeatures,
      featureGroups: [
        {
          label: m['landing.pricing.group.models'](),
          features: isStarter ? starterFeatures : proFeatures,
        },
        {
          label: m['landing.pricing.group.rendering'](),
          features: [
            {
              icon: Film,
              label: m['landing.pricing.feature_render_credits']({
                credits: params.product.credits,
              }),
            },
            {
              icon: Check,
              label: m['landing.pricing.feature_render_estimate']({
                renders: estimate,
                cost: renderCreditCost,
              }),
            },
            {
              icon: Code2,
              label: m['landing.pricing.feature_video_export'](),
            },
          ],
        },
      ],
      comparison: {
        models: isStarter
          ? m['landing.pricing.comparison.three_models']()
          : m['landing.pricing.comparison.all_models'](),
        fallback: !isStarter,
        credits: new Intl.NumberFormat(locale).format(params.product.credits),
        renders: m['landing.pricing.comparison.about_renders']({
          renders: estimate,
        }),
        previews: true,
        review: true,
        python: true,
        video: true,
        expiration: m['landing.pricing.comparison.period_end'](),
      },
      productId: params.product.productId,
      buttonText:
        isCurrent || hasPaidPlan
          ? m['common.pricing.manage_plan']()
          : providerQuery.isLoading
            ? m['common.loading']()
            : !paymentsAvailable
              ? m['common.pricing.payments_unavailable']()
              : isStarter
                ? m['common.pricing.upgrade_starter']()
                : m['common.pricing.upgrade_pro'](),
    };
  }

  const groups: PricingGroup[] = [
    {
      key: 'monthly',
      label: m['landing.pricing.monthly'](),
      plans: [
        freePlan('monthly'),
        paidPlan({
          tier: 'starter',
          group: 'monthly',
          product: starterMonthly,
          interval: m['common.pricing.per_month'](),
        }),
        paidPlan({
          tier: 'pro',
          group: 'monthly',
          product: proMonthly,
          interval: m['common.pricing.per_month'](),
        }),
      ],
    },
    {
      key: 'yearly',
      label: m['landing.pricing.yearly'](),
      note: m['landing.pricing.save_20'](),
      plans: [
        freePlan('yearly'),
        paidPlan({
          tier: 'starter',
          group: 'yearly',
          product: starterYearly,
          originalPrice: displayCents(
            starterMonthly.priceInCents * 12,
            starterMonthly.currency,
            locale
          ),
          interval: m['common.pricing.per_year'](),
        }),
        paidPlan({
          tier: 'pro',
          group: 'yearly',
          product: proYearly,
          originalPrice: displayCents(
            proMonthly.priceInCents * 12,
            proMonthly.currency,
            locale
          ),
          interval: m['common.pricing.per_year'](),
        }),
      ],
    },
  ];

  const comparisonSections: PricingComparisonSection[] = [
    {
      label: m['landing.pricing.comparison.section_ai'](),
      rows: [
        { key: 'models', label: m['landing.pricing.comparison.models']() },
        {
          key: 'fallback',
          label: m['landing.pricing.comparison.fallback'](),
        },
        {
          key: 'previews',
          label: m['landing.pricing.comparison.previews'](),
        },
        { key: 'review', label: m['landing.pricing.comparison.review']() },
      ],
    },
    {
      label: m['landing.pricing.comparison.section_rendering'](),
      rows: [
        { key: 'credits', label: m['landing.pricing.comparison.credits']() },
        { key: 'renders', label: m['landing.pricing.comparison.renders']() },
        { key: 'video', label: m['landing.pricing.comparison.video']() },
        { key: 'python', label: m['landing.pricing.comparison.python']() },
        {
          key: 'expiration',
          label: m['landing.pricing.comparison.expiration'](),
        },
      ],
    },
  ];

  const checkoutMutation = useMutation({
    mutationFn: ({
      plan,
      provider,
    }: {
      plan: PricingPlan;
      provider: PaymentProvider;
    }) =>
      apiPost<{ checkout_url?: string }>('/api/payment/checkout', {
        product_id: plan.productId,
        payment_provider: provider,
        redirect: localizeHref('/creator'),
        cancel_redirect: localizeHref('/pricing'),
      }),
    onSuccess: (data) => {
      if (!data?.checkout_url) {
        toast.error(m['common.pricing.checkout_failed']());
        setLoadingPlanId(null);
        setLoadingProvider(null);
        return;
      }
      window.location.href = data.checkout_url;
    },
    onError: () => {
      toast.error(m['common.pricing.checkout_failed']());
      setLoadingPlanId(null);
      setLoadingProvider(null);
    },
  });

  function startCheckout(plan: PricingPlan, provider: PaymentProvider) {
    setLoadingPlanId(plan.id);
    setLoadingProvider(provider);
    checkoutMutation.mutate({ plan, provider });
  }

  function handleCheckout(plan: PricingPlan) {
    if (!plan.productId) {
      router.push('/creator');
      return;
    }
    if (!session?.user) {
      router.push('/sign-in?callbackUrl=%2Fpricing');
      return;
    }
    if (viewerTier !== 'free') {
      router.push('/settings/billing');
      return;
    }
    if (!paymentsAvailable) {
      toast.error(m['common.pricing.payments_unavailable']());
      return;
    }

    const selectEnabled = configs.select_payment_enabled === 'true';
    const configuredDefault = providerQuery.data?.defaultProvider as
      | PaymentProvider
      | undefined;
    const defaultProvider =
      configuredDefault && enabledProviders.includes(configuredDefault)
        ? configuredDefault
        : enabledProviders[0];
    if (!defaultProvider) {
      toast.error(m['common.pricing.payments_unavailable']());
      return;
    }

    if (selectEnabled && enabledProviders.length > 1) {
      setPendingPlan(plan);
      setModalOpen(true);
      return;
    }
    startCheckout(plan, defaultProvider);
  }

  return (
    <section
      id="pricing"
      className="border-border relative overflow-hidden border-t px-4 py-24 sm:py-32"
    >
      <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_78%)] opacity-35" />
      <div className="curvg-dotmatrix pointer-events-none absolute top-24 right-[7%] size-64 opacity-20" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-14 text-center sm:mb-16">
          <p className="text-primary font-mono text-[10px] font-semibold tracking-[0.18em] uppercase">
            {m['landing.pricing.eyebrow']()}
          </p>
          <h1 className="mt-5 font-serif text-4xl font-normal tracking-tight sm:text-6xl">
            {title ?? m['landing.pricing.title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl leading-7">
            {m['landing.pricing.description']()}
          </p>
        </div>
        <PricingTable
          groups={groups}
          onCheckout={handleCheckout}
          loadingPlanId={loadingPlanId}
          comparisonEyebrow={m['landing.pricing.comparison.eyebrow']()}
          comparisonTitle={m['landing.pricing.comparison.title']()}
          comparisonDescription={m['landing.pricing.comparison.description']()}
          comparisonSections={comparisonSections}
          billingPeriodLabel={m['landing.pricing.billing_period']()}
          includedLabel={m['landing.pricing.comparison.included']()}
          notIncludedLabel={m['landing.pricing.comparison.not_included']()}
          disabledPlanIds={
            checkoutMutation.isPending
              ? [
                  'free-monthly',
                  'starter-monthly',
                  'pro-monthly',
                  'free-yearly',
                  'starter-yearly',
                  'pro-yearly',
                ]
              : (tierLoading ||
                    providerQuery.isLoading ||
                    providerQuery.isError ||
                    !paymentsAvailable) &&
                  viewerTier === 'free'
                ? [
                    'starter-monthly',
                    'pro-monthly',
                    'starter-yearly',
                    'pro-yearly',
                  ]
                : []
          }
        />

        <div className="border-border mt-20 border-t pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
              {m['landing.pricing.eyebrow']()}
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              {m['landing.pricing.factors_title']()}
            </h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            {[
              {
                title: m['landing.pricing.factor_render_title'](),
                description: m['landing.pricing.factor_render_description'](),
              },
              {
                title: m['landing.pricing.factor_capacity_title'](),
                description: m['landing.pricing.factor_capacity_description'](),
              },
              {
                title: m['landing.pricing.factor_storage_title'](),
                description: m['landing.pricing.factor_storage_description'](),
              },
            ].map((factor) => (
              <div
                key={factor.title}
                className="border-border bg-card rounded-2xl border p-6"
              >
                <h3 className="font-semibold tracking-tight">{factor.title}</h3>
                <p className="text-muted-foreground mt-3 text-sm leading-6">
                  {factor.description}
                </p>
              </div>
            ))}
          </div>
          <div className="text-muted-foreground mx-auto mt-8 max-w-2xl text-center text-sm leading-6">
            <p>{m['landing.pricing.note']()}</p>
            <Link
              href="/blog/ai-manim-animation-workflow"
              className="text-foreground mt-3 inline-flex font-medium underline underline-offset-4"
            >
              {m['landing.pricing.workflow_link']()}
            </Link>
          </div>
        </div>
      </div>

      <PaymentProviderModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open && !checkoutMutation.isPending) {
            setPendingPlan(null);
            setLoadingPlanId(null);
            setLoadingProvider(null);
          }
        }}
        providers={enabledProviders}
        loadingProvider={loadingProvider}
        onSelect={(provider) => {
          if (pendingPlan) startCheckout(pendingPlan, provider);
        }}
        planName={pendingPlan?.name}
        price={pendingPlan?.price}
      />
    </section>
  );
}
