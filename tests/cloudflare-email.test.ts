import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cloudflareEmailFromConfigs,
  CloudflareEmailProvider,
} from '../src/core/email/cloudflare';

type Sent = Record<string, unknown>;

function withBinding<T>(
  binding: unknown,
  run: () => Promise<T> | T
): Promise<T> {
  const g = globalThis as any;
  const previous = g.__CF_ENV__;
  g.__CF_ENV__ = binding === undefined ? undefined : { EMAIL: binding };
  return Promise.resolve(run()).finally(() => {
    g.__CF_ENV__ = previous;
  });
}

test('no sender, or neither a token nor a binding: not configured', async () => {
  await withBinding(undefined, () => {
    assert.equal(cloudflareEmailFromConfigs({}), null);
    assert.equal(
      cloudflareEmailFromConfigs({
        cloudflare_email_sender_email: 'hello@curvg.com',
      }),
      null
    );
  });
  await withBinding({ send: async () => ({}) }, () => {
    assert.equal(
      cloudflareEmailFromConfigs({ cloudflare_email_api_token: 't' }),
      null,
      'a binding without a sender address is still not configured'
    );
  });
});

test('a REST token and account win over the binding', async () => {
  await withBinding({ send: async () => ({}) }, () => {
    const provider = cloudflareEmailFromConfigs({
      cloudflare_email_sender_email: 'hello@curvg.com',
      cloudflare_email_api_token: 'token',
      cloudflare_email_account_id: 'account',
    });
    assert.ok(provider);
    assert.equal(provider.configs.apiToken, 'token');
    assert.equal(provider.configs.binding, undefined);
  });
});

test('the binding sends with a display name split out of the sender', async () => {
  const sent: Sent[] = [];
  const binding = {
    send: async (message: Sent) => {
      sent.push(message);
      return { messageId: 'm-1' };
    },
  };
  await withBinding(binding, async () => {
    const provider = cloudflareEmailFromConfigs({
      cloudflare_email_sender_email: 'CurvG <hello@curvg.com>',
    });
    assert.ok(provider);
    const result = await provider.sendEmail({
      to: ['someone@example.com'],
      subject: 'Verify your email - CurvG',
      html: '<p>Hi</p>',
    });
    assert.deepEqual(result, {
      success: true,
      messageId: 'm-1',
      provider: 'cloudflare',
    });
  });
  assert.deepEqual(sent, [
    {
      from: { email: 'hello@curvg.com', name: 'CurvG' },
      to: 'someone@example.com',
      subject: 'Verify your email - CurvG',
      html: '<p>Hi</p>',
    },
  ]);
});

test('a binding error comes back as a failed result with its code', async () => {
  const provider = new CloudflareEmailProvider({
    defaultFrom: 'hello@curvg.com',
    binding: {
      send: async () => {
        throw Object.assign(new Error('domain not onboarded'), {
          code: 'E_SENDER_DOMAIN_NOT_AVAILABLE',
        });
      },
    },
  });
  const result = await provider.sendEmail({
    to: 'someone@example.com',
    subject: 's',
    text: 't',
  });
  assert.equal(result.success, false);
  assert.match(result.error ?? '', /^E_SENDER_DOMAIN_NOT_AVAILABLE: /);
});
