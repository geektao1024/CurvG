import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Code2, Film, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
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

function displayMonthlyEquivalent(product: PricingProduct, locale: string) {
  return displayCents(
    Math.round(product.priceInCents / 12),
    product.currency,
    locale
  );
}

export function Pricing({
  title,
  headingLevel: Heading = 'h1',
}: {
  title?: string;
  headingLevel?: 'h1' | 'h2';
} = {}) {
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
  // Model availability is informational, not a prerequisite for purchasing a
  // paid plan. The checkout endpoint performs the authoritative entitlement
  // check independently of the configured Kie credential.

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
    const cardFeatures = [
      ...freeFeatures,
      {
        icon: Film,
        label: m['landing.pricing.feature_no_render_credits'](),
      },
    ];

    return {
      id: `free-${group}`,
      name: m['landing.pricing.free'](),
      description: m['landing.pricing.free_desc'](),
      price: '$0',
      features: cardFeatures,
      comparison: {
        models: m['landing.pricing.comparison.three_models'](),
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
    const cardFeatures = [
      ...(isStarter ? starterFeatures : proFeatures),
      {
        icon: Film,
        label: m['landing.pricing.feature_render_credits']({
          credits: params.product.credits,
        }),
      },
      ...(isStarter
        ? [{ icon: Code2, label: m['landing.pricing.feature_video_export']() }]
        : []),
    ];

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
      features: cardFeatures,
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
          interval: m['common.pricing.per_month'](),
        }),
        paidPlan({
          tier: 'pro',
          group: 'yearly',
          product: proYearly,
          interval: m['common.pricing.per_month'](),
        }),
      ],
    },
  ];

  groups[1]!.plans[1]!.price = displayMonthlyEquivalent(starterYearly, locale);
  groups[1]!.plans[2]!.price = displayMonthlyEquivalent(proYearly, locale);

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
      className="curvg-pricing-shell relative overflow-hidden"
    >
      <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_82%)] opacity-30" />
      <div className="relative mx-auto w-full max-w-[1440px] px-5 sm:px-10">
        <div className="border-border bg-background/90 relative border-x">
          <div className="border-border relative flex min-h-[302px] flex-col items-center justify-center overflow-hidden border-b px-5 py-12 text-center sm:min-h-[388px] sm:px-10 sm:py-16">
            <div className="curvg-dotmatrix pointer-events-none absolute -top-12 left-[4%] size-60 opacity-20" />
            <div className="curvg-dotmatrix pointer-events-none absolute -right-10 bottom-1 size-56 opacity-15" />
            <span className="curvg-corner top-5 left-3 opacity-55" />
            <span className="curvg-corner right-3 bottom-5 rotate-180 opacity-55" />
            <p className="text-foreground relative font-mono text-xs font-medium tracking-normal">
              <span className="text-muted-foreground mr-2">《</span>
              <span className="text-primary">◎</span>{' '}
              {m['landing.pricing.eyebrow']()}
              <span className="text-muted-foreground ml-2">》</span>
            </p>
            <Heading className="relative mt-7 max-w-3xl text-[30px] leading-[1.05] font-normal tracking-[-0.035em] sm:text-[52px]">
              {title ?? m['landing.pricing.title']()}
            </Heading>
            <p className="text-muted-foreground relative mx-auto mt-6 max-w-xl text-base leading-6">
              {m['landing.pricing.description']()}
            </p>
          </div>
          <PricingTable
            groups={groups}
            onCheckout={handleCheckout}
            loadingPlanId={loadingPlanId}
            comparisonEyebrow={m['landing.pricing.comparison.eyebrow']()}
            comparisonTitle={m['landing.pricing.comparison.title']()}
            comparisonDescription={m[
              'landing.pricing.comparison.description'
            ]()}
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
                : []
            }
          />
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
