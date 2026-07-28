import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Code2, RefreshCw, Sparkles } from 'lucide-react';
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
  type PricingGroup,
  type PricingPlan,
} from '@/components/pricing-table';

const SUPPORTED_PROVIDERS: PaymentProvider[] = ['stripe', 'creem', 'paypal'];

interface PaymentProviderAvailability {
  providers: string[];
  defaultProvider: string | null;
}

function displayPrice(product: PricingProduct, locale: string) {
  return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: product.priceInCents % 100 === 0 ? 0 : 2,
  }).format(product.priceInCents / 100);
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
  // purchasing Pro. If Yunwu's catalog is temporarily unavailable, the
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
  const proMonthly = getPricingProduct('pro_monthly')!;
  const proYearly = getPricingProduct('pro_yearly')!;

  const freeFeatures = [
    { icon: Sparkles, label: m['landing.pricing.feature_free_model']() },
    { icon: Check, label: m['landing.pricing.feature_scene_plans']() },
    { icon: Code2, label: m['landing.pricing.feature_code_export']() },
  ];
  const proFeatures = [
    { icon: Sparkles, label: m['landing.pricing.feature_pro_models']() },
    { icon: RefreshCw, label: m['landing.pricing.feature_auto_failover']() },
    { icon: Check, label: m['landing.pricing.feature_everything_free']() },
  ];

  function freePlan(group: string): PricingPlan {
    return {
      id: `free-${group}`,
      name: m['landing.pricing.free'](),
      description: m['landing.pricing.free_desc'](),
      price: '$0',
      features: freeFeatures,
      buttonText: !session?.user
        ? m['common.pricing.start_free']()
        : viewerTier === 'free'
          ? m['common.pricing.current_plan']()
          : m['common.pricing.open_creator'](),
    };
  }

  function proPlan(params: {
    group: string;
    productId: string;
    price: string;
    originalPrice?: string;
    interval?: string;
  }): PricingPlan {
    return {
      id: `pro-${params.group}`,
      name: m['landing.pricing.pro'](),
      description: m['landing.pricing.pro_desc'](),
      price: params.price,
      originalPrice: params.originalPrice,
      interval: params.interval,
      featured: true,
      badge: m['landing.pricing.popular'](),
      features: proFeatures,
      productId: params.productId,
      buttonText:
        viewerTier === 'pro'
          ? m['common.pricing.manage_plan']()
          : providerQuery.isLoading
            ? m['common.loading']()
            : !paymentsAvailable
              ? m['common.pricing.payments_unavailable']()
              : m['common.pricing.upgrade_pro'](),
    };
  }

  const groups: PricingGroup[] = [
    {
      key: 'monthly',
      label: m['landing.pricing.monthly'](),
      plans: [
        freePlan('monthly'),
        proPlan({
          group: 'monthly',
          productId: proMonthly.productId,
          price: displayPrice(proMonthly, locale),
          interval: m['common.pricing.per_month'](),
        }),
      ],
    },
    {
      key: 'yearly',
      label: m['landing.pricing.yearly'](),
      plans: [
        freePlan('yearly'),
        proPlan({
          group: 'yearly',
          productId: proYearly.productId,
          price: displayPrice(proYearly, locale),
          interval: m['common.pricing.per_year'](),
        }),
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
    if (viewerTier === 'pro') {
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
      className="border-border border-t px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h1 className="font-serif text-4xl font-normal tracking-tight sm:text-5xl">
            {title ?? m['landing.pricing.title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl">
            {m['landing.pricing.description']()}
          </p>
        </div>
        <PricingTable
          groups={groups}
          onCheckout={handleCheckout}
          loadingPlanId={loadingPlanId}
          disabledPlanIds={
            checkoutMutation.isPending
              ? ['free-monthly', 'pro-monthly', 'free-yearly', 'pro-yearly']
              : (tierLoading ||
                    providerQuery.isLoading ||
                    providerQuery.isError ||
                    !paymentsAvailable) &&
                  viewerTier !== 'pro'
                ? ['pro-monthly', 'pro-yearly']
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
