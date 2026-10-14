/// <reference types="vite/client" />
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { ThemeProvider } from 'next-themes';

import { usePathname } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { getQueryClient } from '@/lib/query-client';
import { 'common.error.message' as commonErrorMessage } from '@/paraglide/messages/common_error_message.js';
import { 'common.error.retry' as commonErrorRetry } from '@/paraglide/messages/common_error_retry.js';
import { 'common.error.title' as commonErrorTitle } from '@/paraglide/messages/common_error_title.js';
import { 'common.not_found.hint' as commonNotFoundHint } from '@/paraglide/messages/common_not_found_hint.js';
import { 'common.not_found.message' as commonNotFoundMessage } from '@/paraglide/messages/common_not_found_message.js';
import { getLocale } from '@/paraglide/runtime.js';
import { GoogleAnalytics } from '@/components/analytics/google-analytics';
import { Plausible } from '@/components/analytics/plausible';
import { CustomerService } from '@/components/customer-service';

import '@fontsource-variable/inter';
// Headings (Noto Serif SC), display numerals (Instrument Serif) and labels
// (JetBrains Mono); each file is fetched only when a page uses that face.
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/noto-serif-sc/500.css';
import '@fontsource/noto-serif-sc/600.css';
import '@/styles/globals.css';

const Toaster = lazy(() =>
  import('@/components/ui/sonner').then((module) => ({
    default: module.Toaster,
  }))
);
const GoogleOneTap = lazy(() =>
  import('@/components/google-one-tap').then((module) => ({
    default: module.GoogleOneTap,
  }))
);

// Analytics IDs live in the DB config (1h-cached service). Fetched via a
// server function so drizzle/db code never reaches the client bundle.
const getAnalyticsConfigs = createServerFn().handler(async () => {
  const { getAllConfigs } = await import('@/modules/config/service');
  const configs = await getAllConfigs();
  return {
    gaId: configs.google_analytics_id?.trim() || '',
    plausibleDomain: configs.plausible_domain?.trim() || '',
    plausibleSrc: configs.plausible_src?.trim() || '',
    crispWebsiteId:
      configs.crisp_enabled === 'true'
        ? configs.crisp_website_id?.trim() || ''
        : '',
    tawkPropertyId:
      configs.tawk_enabled === 'true'
        ? configs.tawk_property_id?.trim() || ''
        : '',
    tawkWidgetId:
      configs.tawk_enabled === 'true'
        ? configs.tawk_widget_id?.trim() || ''
        : '',
  };
});

export const Route = createRootRoute({
  loader: () => getAnalyticsConfigs(),
  head: () => {
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: envConfigs.app_name },
        { name: 'description', content: envConfigs.app_description },
      ],
      links: [
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    };
  },
  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function RootComponent() {
  const analytics = Route.useLoaderData();
  const pathname = usePathname();
  const isCreatorWorkspace = pathname === '/creator';
  // Wonder stages are full-bleed canvases; the support bubble would sit on them.
  const isWonderStage = pathname.startsWith('/wonders/');
  // Film frames for headless capture: no toasts, sign-in prompts or widgets.
  const isRender = pathname.startsWith('/render/');

  if (isRender) {
    return (
      <QueryClientProvider client={getQueryClient()}>
        <Outlet />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={getQueryClient()}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Outlet />
        <DeferredToaster />
        <Suspense fallback={null}>
          <GoogleOneTap />
        </Suspense>
        {analytics?.gaId ? (
          <GoogleAnalytics measurementId={analytics.gaId} />
        ) : null}
        {analytics?.plausibleDomain ? (
          <Plausible
            domain={analytics.plausibleDomain}
            src={analytics.plausibleSrc || undefined}
          />
        ) : null}
        {!isCreatorWorkspace && !isWonderStage && (
          <CustomerService
            crispWebsiteId={analytics?.crispWebsiteId || undefined}
            tawkPropertyId={analytics?.tawkPropertyId || undefined}
            tawkWidgetId={analytics?.tawkWidgetId || undefined}
          />
        )}
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

function DeferredToaster() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <Toaster position="top-center" richColors />
    </Suspense>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()} className="bg-background" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Status pages carry the full site chrome, so they load on demand and keep
// the root bundle small.
const StatusPage = lazy(() =>
  import('@/blocks/status-page').then((mod) => ({ default: mod.StatusPage }))
);

function NotFound() {
  return (
    <Suspense fallback={null}>
      <StatusPage
        code="404"
        title={commonNotFoundMessage()}
        message={commonNotFoundHint()}
      />
    </Suspense>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <Suspense fallback={null}>
      <StatusPage
        code="ERROR"
        title={commonErrorTitle()}
        message={commonErrorMessage()}
        action={
          <>
            <button
              type="button"
              onClick={reset}
              className="text-primary text-sm font-medium underline underline-offset-4"
            >
              {commonErrorRetry()}
            </button>
            {import.meta.env.DEV && error instanceof Error ? (
              <pre className="bg-muted mt-4 max-w-lg overflow-auto rounded p-4 text-left text-xs">
                {error.message}
              </pre>
            ) : null}
          </>
        }
      />
    </Suspense>
  );
}
