import { createFileRoute } from '@tanstack/react-router';

import { getPaymentProviderAvailability } from '@/modules/payment/service';
import { respData } from '@/lib/resp';

async function GET() {
  return respData(await getPaymentProviderAvailability(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export const Route = createFileRoute('/api/payment/providers')({
  server: { handlers: { GET } },
});
