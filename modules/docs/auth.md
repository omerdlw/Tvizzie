# Auth

`modules/auth`, browser auth session'ını adapter arkasında normalize eder ve sign-in, sign-out, OAuth, passkey, MFA ile authorization akışları için React facade sunar.

## Sınır

Server cookie, CSRF, verification, audit ve secret yönetimi bu modülün dışında kalır. `config.js` provider/session/redirect politikalarını, `adapter.js` transport ve SDK bağını, `flows.js` action orchestration'ını, `runtime.js` provider ve hook'ları içerir.

## Kurulum

Concrete implementasyonu adapter olarak verin ve provider'ı uygulama kabuğunda bir kez mount edin:

```jsx
const authAdapter = createAuthAdapter({
  name: 'app-auth',
  getSession: loadSession,
  signIn: signInRequest,
  signOut: signOutRequest,
  onAuthStateChange: subscribeToAuth,
});

function AppProviders({ children }) {
  return <AuthProvider config={{ adapter: authAdapter }}>{children}</AuthProvider>;
}
```

Kullanılmayan adapter method'ları eklemeyin. Bir flow'un ihtiyaç duyduğu method yoksa action çağrısı controlled unsupported error üretir.

## API seçimi

| İhtiyaç                              | API                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Birleşik session ve action facade'ı  | `useAuth`                                                                 |
| Yalnız state veya action             | `useAuthState`, `useAuthActions`                                          |
| Initialization ve beklenen kullanıcı | `useAuthSessionReady`                                                     |
| Role/capability kararı               | `useAuthorization`, `canAccess`                                           |
| Görünüm gate'i                       | `AuthGate`, `AnonymousGate`                                               |
| Provider/redirect saf yardımcıları   | `normalizeOAuthProvider`, `sanitizeAuthNextPath`, `buildOAuthCallbackUrl` |
| Adapter veya request hatası          | `createAuthAdapter`, `createSupabaseAuthAdapter`, `AuthRequestError`      |

## Kullanım

Sign-in sonucunu action'ın döndürdüğü haliyle ele alın. Sonuç session, verification, MFA veya redirect isteyebilir:

```jsx
function SignInForm() {
  const { signIn } = useAuthActions();

  async function submit(email) {
    const result = await signIn({ email });
    if (result?.verification) showVerification(result.verification);
  }

  return <EmailForm onSubmit={submit} />;
}
```

Authorization kararı pending state'i içerir. Gate veya hook içinde fallback'i açıkça render edin:

```jsx
function AdminPanel() {
  const authorization = useAuthorization({ roles: ['admin'] });

  if (authorization.isPending) return <PanelSkeleton />;
  if (!authorization.isAllowed) return <Forbidden />;
  return <AdminTools />;
}
```

OAuth dönüşü için kullanıcıdan gelen yolu doğrudan kullanmayın:

```js
const nextPath = sanitizeAuthNextPath(searchParams.next, '/');
const callbackUrl = buildOAuthCallbackUrl({
  callbackPath: '/auth/callback',
  nextPath,
  origin: window.location.origin,
  provider: 'google',
});
```

## Lifecycle ve kurallar

- Provider initial session, storage veya adapter üzerinden canonical session'ı çözer
- Expired session gerektiğinde refresh edilir
- Adapter subscription'ı config değişiminde ve unmount'ta temizlenir
- `useAuthSessionReady(expectedUserId)`, initialization ile kullanıcı eşleşmesini birlikte denetler
- `AuthGate` pending durumda loading fallback'ini, yetkisiz durumda fallback'i render eder

Session'ı elle mutate etmeyin. Secret veya token'ı event payload'ına koymayın. `nextPath` için her zaman helper kullanın.

## Doğrulama

```bash
npx prettier --check modules/auth/*.js modules/docs/auth.md
npx eslint modules/auth/*.js
node --import ./scripts/register-alias.mjs --test tests/modules.test.js
```
