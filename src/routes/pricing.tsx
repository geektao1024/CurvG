import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { buttonVariants } from '@/components/ui/button';

export const Route = createFileRoute('/pricing')({
  loader: () => {
    const locale = getLocale();
    return {
      title: m['landing.pricing.title']({}, { locale }),
      description: m['landing.pricing.description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.title },
          { name: 'description', content: loaderData.description },
        ]
      : [],
  }),
  component: PricingPage,
});

function PricingPage() {
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
        </section>
      </main>
      <Footer />
    </div>
  );
}
