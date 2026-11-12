import { render } from '@react-email/components';

import type {
  EmailConfigs,
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from '.';

/** The Worker `send_email` binding (Cloudflare Email Service), when deployed. */
type SendEmailBinding = {
  send(message: Record<string, unknown>): Promise<{ messageId?: string }>;
};

/**
 * Cloudflare Email Service provider configs. Either `apiToken` + `accountId`
 * (REST API) or a `binding` (the Worker's `send_email` binding, no token).
 * @docs https://developers.cloudflare.com/email-service/get-started/send-emails/
 */
export interface CloudflareEmailConfigs extends EmailConfigs {
  apiToken?: string;
  accountId?: string;
  binding?: SendEmailBinding;
  defaultFrom?: string;
}

/**
 * The `EMAIL` send_email binding stashed by `src/server.ts`, or null outside
 * Workers / when wrangler.jsonc has no `send_email` binding.
 */
export function getCloudflareEmailBinding(): SendEmailBinding | null {
  const binding = (globalThis as any).__CF_ENV__?.EMAIL;
  return binding && typeof binding.send === 'function' ? binding : null;
}

/**
 * Cloudflare Email Service from the config table: the REST API when a token
 * and account are set, else the Worker binding. Null when neither is there
 * or no sender address is configured.
 */
export function cloudflareEmailFromConfigs(
  configs: Record<string, string>
): CloudflareEmailProvider | null {
  const from = configs.cloudflare_email_sender_email;
  if (!from) return null;
  const apiToken = configs.cloudflare_email_api_token;
  const accountId = configs.cloudflare_email_account_id;
  if (apiToken && accountId) {
    return new CloudflareEmailProvider({
      apiToken,
      accountId,
      defaultFrom: from,
    });
  }
  const binding = getCloudflareEmailBinding();
  if (binding) {
    return new CloudflareEmailProvider({ binding, defaultFrom: from });
  }
  return null;
}

/** "CurvG <hello@curvg.com>" → { email, name }; a bare address stays a string. */
function bindingAddress(
  value: string
): string | { email: string; name: string } {
  const match = value.match(/^\s*(.+?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/);
  return match
    ? { email: match[2], name: match[1].replace(/^"|"$/g, '') }
    : value.trim();
}

/**
 * Cloudflare Email Service provider implementation.
 * REST: POST /client/v4/accounts/{account_id}/email/sending/send
 * Binding: env.EMAIL.send({ to, from, subject, html, text })
 */
export class CloudflareEmailProvider implements EmailProvider {
  readonly name = 'cloudflare';
  configs: CloudflareEmailConfigs;

  constructor(configs: CloudflareEmailConfigs) {
    this.configs = configs;
  }

  async sendEmail(email: EmailMessage): Promise<EmailSendResult> {
    try {
      const from = email.from || this.configs.defaultFrom || '';
      const to = Array.isArray(email.to) ? email.to[0] : email.to;

      let html = email.html;
      if (email.react) {
        html = await render(email.react);
      }

      if (this.configs.binding) {
        const message: Record<string, unknown> = {
          from: bindingAddress(from),
          to,
          subject: email.subject,
        };
        if (html) message.html = html;
        if (email.text) message.text = email.text;
        if (!html && !email.text) message.text = '';
        const result = await this.configs.binding.send(message);
        return {
          success: true,
          messageId: result?.messageId,
          provider: this.name,
        };
      }

      const body: Record<string, any> = {
        from,
        to,
        subject: email.subject,
      };

      if (html) body.html = html;
      if (email.text) body.text = email.text;
      if (!html && !email.text) body.text = '';

      const url = `https://api.cloudflare.com/client/v4/accounts/${this.configs.accountId}/email/sending/send`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.configs.apiToken}`,
        },
        body: JSON.stringify(body),
      });

      const data: any = await resp.json().catch(() => ({}));

      if (!resp.ok || data.success === false) {
        const errMsg =
          data?.errors?.[0]?.message ||
          data?.messages?.[0] ||
          `Request failed (${resp.status})`;
        return {
          success: false,
          error: errMsg,
          provider: this.name,
        };
      }

      return {
        success: true,
        messageId: data?.result?.delivered?.[0] || undefined,
        provider: this.name,
      };
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: code ? `${code}: ${message}` : message,
        provider: this.name,
      };
    }
  }
}

/**
 * Create Cloudflare Email provider with configs
 */
export function createCloudflareEmailProvider(
  configs: CloudflareEmailConfigs
): CloudflareEmailProvider {
  return new CloudflareEmailProvider(configs);
}
