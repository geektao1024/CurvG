import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const appUrl = envConfigs.app_url.replace(/\/+$/, '');
        const body = [
          'User-Agent: *',
          'Allow: /',
          // Every locale prefix too: /zh/admin is the same page as /admin.
          ...['', '/zh'].flatMap((prefix) => [
            `Disallow: ${prefix}/admin`,
            `Disallow: ${prefix}/settings`,
            `Disallow: ${prefix}/render/`,
          ]),
          'Disallow: /api/',
          '',
          `Sitemap: ${appUrl}/sitemap.xml`,
          '',
        ].join('\n');
        return new Response(body, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
