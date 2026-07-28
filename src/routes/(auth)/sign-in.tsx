import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

import { authClient, signIn, useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import { TextField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldSeparator } from '@/components/ui/field';

import { AuthPasswordField, AuthShell } from './-auth-shell';

function SignInPage() {
  const signInSchema = z.object({
    email: z.string().email(m['common.sign.email_placeholder']()),
    password: z.string().min(1),
  });

  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  // Set right before we navigate so the already-signed-in effect doesn't also fire.
  const navigatingRef = useRef(false);
  const [error, setError] = useState('');

  // redirect: client protocol, goes through auth-callback
  // callbackUrl: web page URL, goes directly after login
  const [redirectParam, setRedirectParam] = useState<string | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectParam(params.get('redirect'));
    setCallbackUrl(params.get('callbackUrl'));
  }, []);

  // Already signed in (visited /sign-in directly, or a stale callbackUrl looped
  // back here) → go home. The auth pages never gate themselves, so this can't loop.
  useEffect(() => {
    if (sessionPending || navigatingRef.current) return;
    if (session?.user) {
      navigatingRef.current = true;
      router.push('/');
    }
  }, [sessionPending, session?.user, router]);

  // Allow only same-site relative paths, and never an auth page (would loop).
  const safeCallbackUrl =
    callbackUrl &&
    callbackUrl.startsWith('/') &&
    !callbackUrl.startsWith('//') &&
    !/^\/(sign-in|sign-up|verify-email)(\/|\?|$)/.test(callbackUrl)
      ? callbackUrl
      : null;

  const afterLoginUrl = redirectParam
    ? `/auth-callback?redirect=${encodeURIComponent(redirectParam)}`
    : safeCallbackUrl || '/creator';

  // Carry callbackUrl/redirect across to sign-up so the destination survives the switch.
  const switchQuery = (() => {
    const p = new URLSearchParams();
    if (safeCallbackUrl) p.set('callbackUrl', safeCallbackUrl);
    if (redirectParam) p.set('redirect', redirectParam);
    const s = p.toString();
    return s ? `?${s}` : '';
  })();

  const configQuery = usePublicConfig();
  const configs = configQuery.data ?? {};

  const configsLoaded = configQuery.isSuccess;
  const emailEnabled = configs.email_auth_enabled !== 'false';
  const googleEnabled = configs.google_auth_enabled === 'true';
  const githubEnabled = configs.github_auth_enabled === 'true';
  const passwordResetEnabled = configs.password_reset_enabled === 'true';
  const hasSocial = googleEnabled || githubEnabled;
  const hasAnyMethod = emailEnabled || hasSocial;

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: signInSchema },
    onSubmit: async ({ value }) => {
      setError('');
      try {
        const result: any = await signIn.email({
          email: value.email,
          password: value.password,
        });
        if (result.error) {
          const status = result.error.status;
          const code = result.error.code;
          const msg = result.error.message || '';
          if (
            code === 'EMAIL_NOT_VERIFIED' ||
            (status === 403 && /not verified/i.test(msg))
          ) {
            const verifyPath = `/verify-email?sent=1&email=${encodeURIComponent(
              value.email
            )}&callbackUrl=${encodeURIComponent(afterLoginUrl)}`;
            void authClient.sendVerificationEmail({
              email: value.email,
              callbackURL: localizeHref(afterLoginUrl),
            });
            router.push(verifyPath);
            return;
          }
          setError(msg || m['common.sign.sign_in_failed']());
        } else {
          // Hard navigation so the destination reloads with a fresh session
          // cookie — a client push would let the guard read a stale (logged-out)
          // session store and bounce straight back to /sign-in.
          navigatingRef.current = true;
          window.location.assign(localizeHref(afterLoginUrl));
        }
      } catch (err: any) {
        setError(err.message || m['common.sign.sign_in_failed']());
      }
    },
  });

  async function handleSocial(provider: 'google' | 'github') {
    await signIn.social({ provider, callbackURL: afterLoginUrl });
  }

  return (
    <AuthShell
      brand={configs.app_name || envConfigs.app_name}
      title={m['common.sign.sign_in_title']()}
      description={m['common.sign.sign_in_description']()}
      switchPrompt={m['common.sign.no_account']()}
      switchLabel={m['common.sign.sign_up_title']()}
      switchHref={`/sign-up${switchQuery}`}
      belowCard={
        passwordResetEnabled ? (
          <Link
            href="/forgot-password"
            className="text-primary hover:text-foreground text-sm font-medium transition-colors"
          >
            {m['common.sign.forgot_password']()}
          </Link>
        ) : null
      }
    >
      {configsLoaded && !hasAnyMethod ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm font-medium">
            {m['common.sign.no_methods_title']()}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {m['common.sign.no_methods_description']()}
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            {error && (
              <div
                role="alert"
                className="border-destructive/20 bg-destructive/5 text-destructive rounded-md border px-3 py-2.5 text-sm"
              >
                {error}
              </div>
            )}

            {hasSocial && (
              <Field>
                <div
                  className={
                    googleEnabled && githubEnabled
                      ? 'grid grid-cols-2 gap-3'
                      : 'grid grid-cols-1 gap-3'
                  }
                >
                  {googleEnabled && (
                    <Button
                      variant="outline"
                      type="button"
                      className="hover:bg-secondary h-12 w-full gap-2 rounded-md text-[15px] transition-colors"
                      onClick={() => handleSocial('google')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="size-4"
                      >
                        <path
                          d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                          fill="currentColor"
                        />
                      </svg>
                      {m['common.sign.provider_google']()}
                    </Button>
                  )}
                  {githubEnabled && (
                    <Button
                      variant="outline"
                      type="button"
                      className="hover:bg-secondary h-12 w-full gap-2 rounded-md text-[15px] transition-colors"
                      onClick={() => handleSocial('github')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="size-4"
                      >
                        <path
                          d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                          fill="currentColor"
                        />
                      </svg>
                      {m['common.sign.provider_github']()}
                    </Button>
                  )}
                </div>
              </Field>
            )}

            {hasSocial && emailEnabled && (
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                {m['common.sign.or']()}
              </FieldSeparator>
            )}

            {emailEnabled && (
              <>
                <form.Field name="email">
                  {(field) => (
                    <TextField
                      field={field}
                      label={m['common.sign.email_title']()}
                      type="email"
                      required
                      placeholder={m['common.sign.email_placeholder']()}
                      className="h-12 rounded-md px-4 text-[15px]"
                    />
                  )}
                </form.Field>
                <form.Field name="password">
                  {(field) => (
                    <AuthPasswordField
                      field={field}
                      label={m['common.sign.password_title']()}
                      required
                      placeholder={m['common.sign.password_placeholder']()}
                    />
                  )}
                </form.Field>
                <Field>
                  <form.Subscribe selector={(s) => s.isSubmitting}>
                    {(isSubmitting) => (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="curvg-btn-primary focus-visible:outline-ring flex h-12 w-full items-center justify-center gap-2 text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting && (
                          <Loader2
                            aria-hidden="true"
                            className="size-4 animate-spin"
                          />
                        )}
                        {isSubmitting
                          ? m['common.sign.signing_in']()
                          : m['common.sign.sign_in_title']()}
                      </button>
                    )}
                  </form.Subscribe>
                </Field>
              </>
            )}
          </FieldGroup>
        </form>
      )}
    </AuthShell>
  );
}

export const Route = createFileRoute('/(auth)/sign-in')({
  component: SignInPage,
});
