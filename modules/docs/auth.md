# Module: Auth

> Browser auth session'ını, provider/capability modelini ve sign-in, sign-up, MFA, passkey, OAuth ve profile akışlarını yönetir.

## 1. Genel bakış

`modules/auth`, auth sağlayıcısının concrete SDK ayrıntılarını adapter arkasında
tutar ve uygulamaya normalize edilmiş bir session ile React interface'i sunar.
Modül passwordless auth, OAuth, passkey, MFA, provider linking, profile update,
session refresh ve authorization gate'lerini tek bir runtime altında birleştirir.

Sunucu tarafı verification, CSRF, cookie, audit ve route policy modülün içinde
değildir. Browser adapter'ı bu uygulama sözleşmelerini gerekli endpoint'ler
üzerinden tüketir.

## 2. Sorumluluklar

### Sahip olduğu kararlar

- Provider id, alias, label ve icon metadata'sını normalize etmek
- Canonical session modelini üretmek ve session state'ini korumak
- Role/capability authorization kararlarını vermek
- Auth adapter interface'ini doğrulamak
- Sign-in, sign-up, sign-out, refresh ve profile mutation flow'larını orkestre etmek
- OAuth intent, callback ve safe `next` path çözümlemek
- Passkey ve MFA feature/browser uygunluğunu sunmak
- Auth event, feedback ve error akışlarını yayınlamak
- Auth provider, state/action context'leri ve gate'leri sağlamak

### Sahip olmadığı kararlar

- Secret, service-role credential veya server session cookie yönetimi
- Concrete database, verification veya audit politikası
- Ürün ekranlarının görsel tasarımı
- Uygulamaya ait route ve endpoint seçimi; bunlar config/adapter üzerinden verilir

## 3. Dosya sahipliği

| Dosya        | Sahip olduğu implementasyon                                                    | Public mi? |
| ------------ | ------------------------------------------------------------------------------ | ---------- |
| `index.js`   | Tek public facade ve export sözleşmesi                                         | Evet       |
| `config.js`  | Provider metadata, session modeli, authorization ve safe redirect kararları    | Dolaylı    |
| `adapter.js` | Transport/SDK adapter'ı, canonical session cache, passkey browser yardımcıları | Dolaylı    |
| `flows.js`   | React state oluşturmadan auth flow orchestration                               | Dolaylı    |
| `runtime.js` | Provider, context'ler, hook'lar, gate'ler ve lifecycle                         | Dolaylı    |

## 4. Kurulum

Provider uygulama kabuğunda bir kez mount edilir. Concrete auth implementasyonu
adapter olarak verilir:

```jsx
import { AuthProvider, createSupabaseAuthAdapter } from '@/modules/auth';

const authAdapter = createSupabaseAuthAdapter({
  client: supabaseClient,
  endpoints: {
    account: '/api/auth/account',
    session: '/api/auth/session',
    signIn: '/api/auth/sign-in',
  },
  oauthCallbackPath: '/auth/callback',
  oauthDefaultNextPath: '/',
});

export function AppProviders({ children }) {
  return <AuthProvider config={{ adapter: authAdapter }}>{children}</AuthProvider>;
}
```

`initialSession`, `storageKey`, `clearSessionOnUnauthorized`,
`refreshOnWindowFocus`, `hydrateFromStorage`, `endpoints`,
`oauthCallbackPath`, `oauthDefaultNextPath` ve `debug` config alanları desteklenir.
Concrete endpoint'ler consuming application tarafından override edilebilir.

## 5. Public interface

### 5.1 Sabitler ve saf yardımcılar

| Grup                | Export'lar                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider kimlikleri | `GITHUB_PROVIDER_ID`, `GOOGLE_PROVIDER_ID`, `X_PROVIDER_ID`, `EMAIL_PROVIDER_ID`, `PASSKEY_PROVIDER_ID`                                                                                                                               |
| Provider metadata   | `OAUTH_PROVIDER_CONFIG`, `OAUTH_PROVIDER_KEYS`, `PASSKEY_PROVIDER_CONFIG`                                                                                                                                                             |
| Config/state        | `DEFAULT_AUTH_ENDPOINTS`, `DEFAULT_AUTH_CONFIG`, `DEFAULT_AUTH_STATE`, `AUTH_STATUS`                                                                                                                                                  |
| Provider helpers    | `normalizeOAuthProvider`, `isSupportedOAuthProvider`, `getOAuthProviderConfig`, `getAuthProviderConfig`, `getOAuthProviderId`, `getOAuthProviderLabel`, `normalizeProviderId`, `getEnabledOAuthProviderIds`, `resolvePrimaryProvider` |
| Session helpers     | `normalizeSession`, `mergeUserIntoSession`, `isSessionExpired`, `createAuthStorage`                                                                                                                                                   |
| Authorization       | `hasRole`, `hasAnyRole`, `hasCapability`, `hasAnyCapability`, `hasAllCapabilities`, `canAccess`, `resolveAuthCapabilities`                                                                                                            |
| Redirect/intent     | `normalizeOAuthIntent`, `resolveOAuthIntent`, `sanitizeAuthNextPath`, `buildOAuthCallbackUrl`, `uniqueStrings`                                                                                                                        |

### 5.2 Adapter ve flow export'ları

| Grup            | Export'lar                                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adapter         | `AuthRequestError`, `requestAuthJson`, `createAuthAdapter`, `createSupabaseAuthAdapter`                                                                                      |
| Session cache   | `fetchCanonicalSessionPayload`, `clearCanonicalSessionPayloadCache`, `isCanonicalSessionAuthenticated`                                                                       |
| Passkey helpers | `isPasskeyFeatureEnabled`, `isPasskeyBrowserSupported`, `usePasskeySupport`                                                                                                  |
| Flow helpers    | `runAuthInitialize`, `runAuthProviderMutation`, `runAuthReauthenticate`, `runAuthRefreshSession`, `runAuthSignIn`, `runAuthSignOut`, `runAuthSignUp`, `runAuthUpdateProfile` |

### 5.3 Runtime interface'i

| İhtiyaç               | Interface                             |
| --------------------- | ------------------------------------- |
| Provider              | `AuthProvider`                        |
| Birleşik state/action | `useAuth`                             |
| Yalnız state          | `useAuthState`                        |
| Yalnız action         | `useAuthActions`                      |
| Config                | `useAuthConfig`                       |
| Session hazır olma    | `useAuthSessionReady(expectedUserId)` |
| Authorization         | `useAuthorization(rules)`             |
| Authenticated gate    | `AuthGate`                            |
| Anonymous gate        | `AnonymousGate`                       |

`useAuth()` state ve action'ları birleştirir. State içinde `session`, `user`,
`status`, `error`, `isReady`, `isAuthenticated`, `isAnonymous`, `capabilities`
ve `lastUpdatedAt`; action tarafında initialize, refresh, sign-in, sign-up,
sign-out, reauthenticate, profile, provider, passkey ve MFA işlemleri bulunur.

## 6. Sözleşmeler ve kullanım örnekleri

### 6.1 Generic adapter

```js
import { createAuthAdapter } from '@/modules/auth';

const adapter = createAuthAdapter({
  name: 'custom-auth',
  getSession: () => loadSession(),
  refreshSession: () => refreshSession(),
  signIn: (payload) => signIn(payload),
  signUp: (payload) => signUp(payload),
  signOut: (options) => signOut(options),
  onAuthStateChange: (callback) => subscribeToAuth(callback),
  updateProfile: (payload) => updateProfile(payload),
});
```

Adapter en az `name` alanına sahip bir object olmalıdır. `getSession`,
`refreshSession`, `signIn`, `signUp`, `signOut`, `onAuthStateChange`,
`updateProfile`, `reauthenticate`, provider linking, passkey ve MFA method'ları
kullanılan flow'a göre opsiyoneldir. Eksik method render sırasında değil, action
çağrısında kontrollü unsupported error üretir.

### 6.2 Sign-in, sign-up ve sign-out

```jsx
function AuthActions() {
  const { signIn, signUp, signOut } = useAuth();

  async function handleSignIn(email) {
    const result = await signIn({ email });
    // result: session, verification, MFA veya redirect sonucu olabilir.
    return result;
  }

  async function handleSignUp(payload) {
    return signUp({ email: payload.email, password: payload.password });
  }

  return <Button onClick={() => signOut({ redirect: false })}>Sign out</Button>;
}
```

Flow sonucu verification, MFA veya redirect bekliyorsa mevcut session korunur;
başarılı canonical session normalize edilmeden state'e yazılmaz.

### 6.3 Authorization

```jsx
import { AuthGate, useAuthorization } from '@/modules/auth';

function AdminPanel() {
  const authorization = useAuthorization({
    roles: ['admin'],
    capabilities: ['manage-account'],
  });

  if (authorization.isPending) return <PanelSkeleton />;
  if (!authorization.isAllowed) return <Forbidden />;
  return <Panel />;
}

function ProtectedRoute({ children }) {
  return (
    <AuthGate roles={['member']} loadingFallback={<PageSkeleton />} fallback={<SignInPrompt />}>
      {children}
    </AuthGate>
  );
}
```

`useAuthorization` `isPending`, `isAllowed`, `isAnonymous`,
`isAuthenticated`, `can` ve `auth` döndürür. `canAccess` rules içinde role,
capability, `anyRole`, `anyCapability`, `allCapabilities` ve authenticated
koşulları kullanılabilir.

### 6.4 OAuth ve provider linking

```js
const result = await auth.signIn({
  provider: 'google',
  intent: 'sign-in',
  nextPath: '/dashboard',
});

await auth.linkProvider({ provider: 'github', nextPath: '/account/security' });
await auth.unlinkProvider('github');
```

Provider alias'ları normalize edilir. `nextPath` yalnızca aynı-origin absolute
path kabul eder; callback, sign-in, sign-up ve benzeri blocked path'ler fallback
ile değiştirilir.

### 6.5 Passkey ve MFA

```jsx
import { usePasskeySupport } from '@/modules/auth';

function SecurityActions() {
  const auth = useAuth();
  const passkeySupported = usePasskeySupport();

  async function addPasskey() {
    if (!passkeySupported) return;
    await auth.registerPasskey({ name: 'My laptop' });
  }

  async function verifyMfa(code, factorId) {
    const challenge = await auth.challengeMfa({ factorId });
    return auth.verifyMfa({ challengeId: challenge.id, code });
  }

  return <SecurityPanel onAddPasskey={addPasskey} onVerifyMfa={verifyMfa} />;
}
```

Passkey action'ları `listPasskeys`, `registerPasskey`, `updatePasskey` ve
`deletePasskey`; MFA action'ları `listMfaFactors`, `enrollMfa`, `challengeMfa`,
`verifyMfa`, `unenrollMfa` ve `getMfaAssuranceLevel`'dır.

### 6.6 Session-ready kontrolü

```jsx
function AccountBootstrap({ userId }) {
  const isReadyForUser = useAuthSessionReady(userId);
  if (!isReadyForUser) return <AccountSkeleton />;
  return <AccountContent />;
}
```

`expectedUserId` verilmezse yalnızca auth initialization; verilirse hem
initialization hem de beklenen user id eşleşmesi gerekir.

## 7. Yaşam döngüsü

```text
AuthProvider mount
  -> config + storage + adapter
  -> initialize
     -> initialSession / storage / adapter session
     -> expired session refresh
     -> canonical session normalization
  -> state + actions contexts
  -> focus/visibility refresh + adapter subscription
```

- Auth state `idle`, `loading`, `refreshing`, `authenticated` veya `anonymous`
  durumlarından geçer.
- Auth event'leri `globalEvents` üzerinden sign-in, sign-up, update, refresh,
  sign-out, ready, error ve feedback olarak yayınlanır.
- Adapter auth-state subscription'ı unmount veya config değişiminde kaldırılır.
- Canonical session payload'ı 1500 ms TTL ile cache'lenir; eş zamanlı non-force
  istekler aynı promise'i paylaşır.
- Auth değişiminde canonical session cache temizlenir.
- `clearSessionOnUnauthorized` ile unauthorized sonucu anonymous state'e dönüş
  kontrol edilir.

## 8. Sınırlar ve hata davranışı

- `AuthRequestError` ve adapter error'ları mesaj, status, code ve data'yı
  mümkün olduğunca korur.
- `requestAuthJson`, `success: false` payload'larını da hata olarak ele alır.
- Unsupported adapter method'ları açıklayıcı error üretir; provider render'ı
  bozulmaz.
- Server credential'ları browser adapter'ına veya React state'ine koymayın.
- Session normalize edilmeden `user` veya capability kararlarına güvenmeyin.
- `AuthGate` pending durumda `loadingFallback`, yetkisiz durumda `fallback`
  render eder.
- `AnonymousGate`, auth initialization tamamlanana kadar loading fallback;
  authenticated kullanıcıda fallback render eder.

## 9. Kurallar

1. Uygulama kodu `@/modules/auth` facade'ından import etmelidir.
2. Adapter concrete SDK ve transport ayrıntılarını kapsamalıdır.
3. OAuth `nextPath` değerini doğrudan redirect URL'sine eklemeyin; helper kullanın.
4. Auth state'i elle mutate etmeyin; action veya adapter sözleşmesini kullanın.
5. Provider'ı route layout'larında tekrar tekrar mount etmeyin.
6. Passkey/MFA UI'sı unsupported action'ları önceden handle etmelidir.
7. Secret, token ve gereksiz kişisel veriyi event payload'larına koymayın.
8. Yeni adapter method'u eklenirse facade, flow/runtime ve bu belge birlikte
   güncellenmelidir.

## 10. Doğrulama

```bash
npx prettier --check modules/auth/*.js modules/docs/auth.md
npx eslint modules/auth/*.js
node --import ./scripts/register-alias.mjs --test \
  tests/characterization/auth-*.test.js
npm run build:webpack
```

Yeni davranış için provider initialization, canonical session cache, safe
redirect, adapter method eksikliği, auth event sırası, gate pending/fallback,
provider linking, passkey/MFA unsupported durumu ve cleanup test edilmelidir.
