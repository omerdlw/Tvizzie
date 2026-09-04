# Account

`modules/account`, Auth oturumu hazır olduğunda current account state'ini ve profile subscription'larını yönetir. Transport, cache ve realtime ayrıntıları adapter'a; ekran tasarımı domain bileşenlerine aittir.

## Sınır

| Dosya         | Sorumluluk                                               |
| ------------- | -------------------------------------------------------- |
| `adapter.js`  | Adapter doğrulama ve method forwarding client'ı          |
| `provider.js` | Current account bootstrap, state, action ve subscription |
| `profile.js`  | Username çözümü ve public/private profile subscription'ı |
| `index.js`    | Public facade                                            |

Auth credential'ları, authorization policy'si ve domain'e özgü account alanlarının anlamı bu modülün dışında kalır.

## Kurulum

`AccountProvider`ı Auth provider'ın altında bir kez mount edin:

```jsx
<AuthProvider>
  <AccountProvider config={{ adapter: accountAdapter }}>{children}</AccountProvider>
</AuthProvider>
```

## API seçimi

| İhtiyaç                      | API                                           |
| ---------------------------- | --------------------------------------------- |
| Adapter'ı doğrulamak         | `createAccountAdapter`                        |
| Provider'a uygun client      | `createAccountClient`                         |
| Current account state'i      | `useAccountState` veya `useCurrentAccount`    |
| Current account mutation'ı   | `useAccountActions`                           |
| Birleşik facade              | `useAccount`                                  |
| Adapter/config erişimi       | `useAccountClient`, `useAccountConfig`        |
| Username veya id ile profile | `useResolvedAccountUser`, `useAccountProfile` |

## Kullanım

Adapter yalnız kullandığınız method'ları uygulamak zorundadır. Eksik bir method, çağrıldığı anda açıklayıcı hata üretir:

```js
const accountAdapter = createAccountAdapter({
  getAccount: (userId) => loadAccount(userId),
  updateAccount: (payload) => updateAccount(payload),
  subscribeToAccount: (userId, onChange) => subscribe(userId, onChange),
});
```

Current account ekranı dar hook'ları seçer:

```jsx
function AccountEditor() {
  const { currentAccount, isLoading, isReady } = useAccountState();
  const { updateCurrentAccount } = useAccountActions();

  if (!isReady || isLoading) return <AccountSkeleton />;
  return <Editor account={currentAccount} onSave={updateCurrentAccount} />;
}
```

Server snapshot'ı olan public profile önce identity'yi, sonra subscription'ı çözer:

```jsx
function PublicProfile({ initialProfile, username }) {
  const identity = useResolvedAccountUser({ username, initialResolvedUserId: initialProfile?.id });
  const profile = useAccountProfile({
    username,
    resolvedUserId: identity.resolvedUserId,
    initialProfile,
  });

  if (identity.isResolvingProfile || !profile.hasLoadedProfile) return <ProfileSkeleton />;
  return <ProfileView profile={profile.profile} />;
}
```

## Lifecycle ve kurallar

- Auth hazır olmadan bootstrap başlatılmaz
- Anonymous durum current account state'ini temizler
- Config/adaptor değişince eski subscription kapanır
- Stale callback'ler cleanup sonrasında state yazamaz
- `initialProfile`, çözümlenen user id ile eşleşmezse hydrate edilmez

Transport veya realtime kodunu provider'a taşımayın. Yalnız gerekli state/action hook'unu seçin; her consumer için `useAccount()` aggregate'ini kullanmayın.

## Doğrulama

```bash
npx prettier --check modules/account/*.js modules/docs/account.md
npx eslint modules/account/*.js
node --import ./scripts/register-alias.mjs --test tests/modules.test.js
```
