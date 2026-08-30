'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { requestJson } from '@/shared';
import { AUTH_PURPOSE } from '@/domains/auth/utils/constants';
import {
  getCurrentPathWithSearch,
  isEmailIdentifier,
  resolvePostAuthRedirect,
} from '@/domains/auth/utils/routes';
import { resolveAuthErrorMessage } from '@/domains/auth/utils/errors';
import { getOAuthProviderLabel } from '@/domains/auth/utils/oauth';
import {
  AUTH_INPUT_CLASSNAMES,
  AUTH_PRIMARY_BUTTON_CLASSNAMES,
} from '@/domains/auth/ui/components/form-primitives';
import { OAuthProviderList } from '@/domains/auth/ui/components/form-primitives';
import { createMfaSetupSurfaceEntry } from './mfa-setup-surface';
import { AuthVerificationSurface } from './verification-surface';
import { createSignUpSurfaceEntry } from './sign-up-surface';
import { Button, Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { useAuth } from '@/modules/auth';
import { usePasskeySupport } from '@/modules/auth';
import { useToast } from '@/modules/notification';
import { NavSurfaceHeaderButton, useNavigationActions, useSurfaceHeader } from '@/modules/nav';
import { EVENT_TYPES, globalEvents } from '@/shared';
import { NAV_FADE_TRANSITION, textCrossfadeVariants } from '@/modules/nav';

export function createSignInSurfaceEntry(data = {}, config = {}) {
  return {
    component: SignInSurface,
    icon: 'solar:user-circle-bold',
    title: 'Sign In',
    description: 'Access your account',
    props: { data },
    ...config,
  };
}

export default function SignInSurface({ close, data }) {
  const auth = useAuth();
  const toast = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openSurface } = useNavigationActions();
  const setHeader = useSurfaceHeader();
  const [email, setEmail] = useState(() => String(data?.email || data?.identifier || '').trim());
  const [authMethod, setAuthMethod] = useState('methods');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOAuthProvider, setActiveOAuthProvider] = useState(null);
  const passkeySupported = usePasskeySupport();
  const postAuthRedirect = useMemo(
    () => resolvePostAuthRedirect(data?.next ?? getCurrentPathWithSearch(pathname, searchParams)),
    [data?.next, pathname, searchParams],
  );
  const isBusy = isSubmitting || Boolean(activeOAuthProvider);

  useEffect(() => {
    setHeader?.({
      icon: 'solar:user-circle-bold',
      title: 'Sign In',
      description: 'Choose how you want to sign in.',
      trailing: null,
      headerAction: (
        <NavSurfaceHeaderButton
          disabled={isBusy}
          onClick={() =>
            void openSurface(
              createSignUpSurfaceEntry({
                email: isEmailIdentifier(email) ? email : '',
                next: postAuthRedirect,
              }),
            )
          }
        >
          Sign Up
        </NavSurfaceHeaderButton>
      ),
    });
  }, [email, isBusy, openSurface, passkeySupported, postAuthRedirect, setHeader]);

  const finalizeSignIn = async (result) => {
    const session = result?.session || result;
    if (!result?.success && !session?.user) return;
    // auth.signIn() already emits AUTH_SIGN_IN for an immediate session. The
    // surface only completes pending verification/passkey flows here.
    if (result?.session?.user) {
      globalEvents.emit(EVENT_TYPES.AUTH_SIGN_IN, {
        session,
        source: result?.session ? 'login-verification' : 'passkey',
        user: session.user,
      });
    }
    let redirectUrl = postAuthRedirect;
    if (postAuthRedirect === '/account') {
      try {
        const payload = await requestJson('/api/account/me', { retryCount: 0 });
        if (payload?.profile?.username)
          redirectUrl = `/account/${encodeURIComponent(payload.profile.username)}`;
      } catch {}
    }
    close({ success: true });
    window.location.replace(redirectUrl);
  };

  const completeEmailVerification = async (result) => {
    const verification = await openSurface(AuthVerificationSurface, {
      header: { title: 'Login verification', description: 'Enter the code sent to your email' },
      data: {
        challenge: result.challenge || null,
        email: result.email || email,
        purpose: AUTH_PURPOSE.SIGN_IN,
      },
    });
    await finalizeSignIn(verification);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isBusy) return;
    setIsSubmitting(true);
    try {
      const result = await auth.signIn({ email: email.trim() });
      if (result?.requiresRedirect) return;
      if (result?.requiresMfa) {
        const verification = await openSurface(
          createMfaSetupSurfaceEntry({
            email: result.email || email,
            mode: 'sign-in-primary',
          }),
        );
        if (verification?.useEmailCode) {
          await completeEmailVerification(verification);
          return;
        }
        await finalizeSignIn(verification);
        return;
      }
      if (result?.requiresVerification) {
        await completeEmailVerification(result);
        return;
      }
      await finalizeSignIn(result);
    } catch (error) {
      toast.error(resolveAuthErrorMessage(error, 'Sign-in failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    if (isBusy) return;
    setActiveOAuthProvider(provider);
    let redirecting = false;
    try {
      const result = await auth.signIn({
        next: postAuthRedirect,
        oauthIntent: 'sign-in',
        provider,
      });
      if (result?.requiresRedirect) {
        redirecting = true;
        close({ success: true });
        return;
      }
      if (provider === 'passkey') {
        await finalizeSignIn(result);
        return;
      }
      close({ success: true });
      window.location.replace(postAuthRedirect);
    } catch (error) {
      toast.error(
        resolveAuthErrorMessage(error, `${getOAuthProviderLabel(provider)} sign-in failed`),
      );
    } finally {
      if (!redirecting) setActiveOAuthProvider(null);
    }
  };

  const handleMethodSelect = (provider) => {
    if (provider === 'email') {
      setAuthMethod('email');
      return;
    }

    return handleOAuthSignIn(provider);
  };

  return (
    <motion.div
      variants={textCrossfadeVariants}
      initial="hidden"
      animate="visible"
      transition={NAV_FADE_TRANSITION}
      className="flex flex-col gap-2.5"
    >
      {authMethod === 'methods' ? (
        <OAuthProviderList
          activeProvider={activeOAuthProvider}
          disabled={isBusy}
          includeEmail
          includePasskey={passkeySupported}
          mode="sign-in"
          onSelect={handleMethodSelect}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <Input
            id="surface-sign-in-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            classNames={AUTH_INPUT_CLASSNAMES}
          />
          <div className="flex w-full items-center gap-2.5">
            <Button
              type="button"
              disabled={isBusy}
              onClick={() => setAuthMethod('methods')}
              aria-label="Back to sign-in methods"
              classNames={{
                root: 'center size-11 shrink-0 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 text-white/70 hover:ring-transparent hover:bg-white hover:text-black cursor-pointer',
              }}
            >
              <Icon icon="material-symbols:arrow-back-rounded" size={20} />
            </Button>
            <Button type="submit" disabled={isBusy} classNames={AUTH_PRIMARY_BUTTON_CLASSNAMES}>
              {isSubmitting ? 'Sending code' : 'Continue with email'}
            </Button>
          </div>
        </form>
      )}
    </motion.div>
  );
}
