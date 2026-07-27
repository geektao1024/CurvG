import { createFileRoute } from '@tanstack/react-router';
import { Clock3, Gauge, HardDrive } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { buttonVariants } from '@/components/ui/button';

export const Route = createFileRoute('/pricing')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['landing.pricing.meta_title']({}, { locale }),
      description: m['landing.pricing.meta_description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale, title, description } = loaderData;
    const urlFor = (loc: string) =>
      localizeUrl(`${envConfigs.app_url}/pricing`, {
        locale: loc as any,
      }).href;
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: urlFor(locale) },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
    };
  },
  component: PricingPage,
});

function PricingPage() {
  const pricingFactors = [
    {
      icon: Clock3,
      title: m['landing.pricing.factor_render_title'](),
      description: m['landing.pricing.factor_render_description'](),
    },
    {
      icon: Gauge,
      title: m['landing.pricing.factor_capacity_title'](),
      description: m['landing.pricing.factor_capacity_description'](),
    },
    {
      icon: HardDrive,
      title: m['landing.pricing.factor_storage_title'](),
      description: m['landing.pricing.factor_storage_description'](),
    },
  ];

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center px-4 py-20 sm:px-6 sm:py-28">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
            {m['landing.pricing.eyebrow']()}
          </p>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-6xl">
            {m['landing.pricing.title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-8">
            {m['landing.pricing.description']()}
          </p>
          <Link
            href="/sign-up"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'mt-9 h-12 rounded-full px-8 font-semibold'
            )}
          >
            {m['landing.pricing.cta']()}
          </Link>

          <div className="mt-16 text-left">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              {m['landing.pricing.factors_title']()}
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {pricingFactors.map(({ icon: Icon, title, description }) => (
                <article key={title} className="bg-card rounded-xl border p-6">
                  <Icon className="text-primary size-5" aria-hidden />
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">
                    {description}
                  </p>
                </article>
              ))}
            </div>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-sm leading-6">
              {m['landing.pricing.note']()}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
