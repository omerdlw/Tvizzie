# Module: Account

> Auth oturumu hazır olduktan sonra mevcut account state'ini, account action'larını ve private/public profile lifecycle'ını yönetir.

## 1. Genel bakış

`modules/account`, görsel bir ekran değil; Auth ile account verisi arasındaki
React runtime modülüdür. Account transport, cache ve realtime ayrıntılarını
adapter'a bırakır; provider ise bootstrap, state, action ve subscription
yaşam döngüsünü tek yerde yönetir.

Modül iki kullanım biçimini birlikte destekler:

- authenticated viewer için mevcut account'ı yüklemek ve güncellemek
- bir username veya user id üzerinden private/public profile okumak

## 2. Sorumluluklar

### Sahip olduğu kararlar

- Account adapter interface'ini doğrulamak ve client facade'ı üretmek
- Auth session ve session-ready durumuna göre bootstrap başlatmak
- Current account state, loading/error flag'leri ve mutation action'larını yönetmek
- Account subscription'ını kurmak, güncellemek ve cleanup etmek
- Username'i account identity'sine çözümlemek
- Server snapshot'ını profile state'ine hydrate etmek
- Görünürlük durumuna göre subscription polling aralığını seçmek

### Sahip olmadığı kararlar

- Auth credential, session veya authorization policy'si
- Account verisinin HTTP, database, cache veya realtime implementasyonu
- Account ekranının veya profile kartının görsel tasarımı
- Domain'e özgü account alanlarının anlamı

Auth davranışı `modules/auth`; domain adapter implementasyonu consuming
application içindeki account client katmanında kalır.

## 3. Dosya sahipliği

| Dosya         | Sahip olduğu implementasyon                                         | Public mi? |
| ------------- | ------------------------------------------------------------------- | ---------- |
| `index.js`    | Tek public facade; dış tüketiciler yalnızca buradan import eder     | Evet       |
| `adapter.js`  | Adapter doğrulama ve method forwarding client'ı                     | Dolaylı    |
| `provider.js` | Current account context'leri, bootstrap, subscription ve action'lar | Dolaylı    |
| `profile.js`  | Username resolution ve private/public profile subscription'ları     | Dolaylı    |

`view.js` veya ayrı bir `config.js` yoktur. Account görsel bir surface
olmadığından state ve profile lifecycle'ı gerçek sahiplik dosyalarında tutulur.

## 4. Kurulum

Account provider, Auth provider'ın altında ve account adapter ile birlikte bir
kez mount edilmelidir:

```jsx
import { AccountProvider } from '@/modules/account';
import { AuthProvider } from '@/modules/auth';

export function AppProviders({ children, accountAdapter }) {
  return (
    <AuthProvider>
      <AccountProvider config={{ adapter: accountAdapter }}>{children}</AccountProvider>
    </AuthProvider>
  );
}
```

Gerekli provider sırası:

```text
AuthProvider
  -> AccountProvider
     -> feature components
```

`AccountProvider` adapter verilmeden render edilebilir; ancak account client
çağrısı gereken action'lar, ilgili method yapılandırılmamışsa açıklayıcı bir
configuration error üretir.

## 5. Public interface

### 5.1 Export grupları

| Grup            | Export'lar                                                                | Ne zaman kullanılır?                                     |
| --------------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| Adapter         | `createAccountAdapter`, `createAccountClient`                             | Domain client'ını provider'a bağlarken                   |
| Provider        | `AccountProvider`                                                         | Uygulama kabuğunda tek kez                               |
| Current account | `useAccount`, `useAccountState`, `useAccountActions`, `useCurrentAccount` | Viewer account state/action tüketirken                   |
| Config/client   | `useAccountConfig`, `useAccountClient`                                    | Adapter veya config seviyesinde entegrasyon gerektiğinde |
| Profile         | `useResolvedAccountUser`, `useAccountProfile`                             | Username veya user id ile profile okurken                |

### 5.2 Current account hook'ları

`useAccountState()` aşağıdaki alanları sunar:

```js
{
  currentAccount: object | null,
  error: Error | null,
  isBootstrapping: boolean,
  isLoading: boolean,
  isReady: boolean,
  lastUpdatedAt: number | null,
}
```

`useAccountActions()` şu action'ları sunar:

- `ensureCurrentAccount()`: mevcut account'ı yoksa bootstrap eder
- `refreshCurrentAccount()`: account verisini yeniden yükler
- `updateCurrentAccount(payload)`: current account'ı günceller
- `syncCurrentAccountEmail(email)`: Auth email değişimini account'a yansıtır
- `clearError()`: account error state'ini temizler

`useAccount()` state, action, config ve account client'ı tek aggregate object
olarak birleştirir. Yalnızca okuma veya yalnızca action gerekiyorsa daha dar
hook'ları tercih edin.

### 5.3 Profile hook'ları

`useResolvedAccountUser({ authUserId, username, initialResolvedUserId, initialResolveError })`
şunları döndürür:

```js
{
  isResolvingProfile: boolean,
  resolveError: string | null,
  resolvedUserId: string | null,
}
```

`useAccountProfile({ resolvedUserId, username, initialProfile, onError })`
şunları döndürür:

```js
{
  hasLoadedProfile: boolean,
  profile: object | null,
  setProfile: React.Dispatch,
}
```

`username` verilirse public profile subscription'ı; verilmezse resolved user id
üzerinden private/current profile subscription'ı kullanılır.

## 6. Sözleşmeler ve kullanım örnekleri

### 6.1 Adapter oluşturma

```js
import { createAccountAdapter } from '@/modules/account';

const accountAdapter = createAccountAdapter({
  ensureAccount: ({ userId }) => loadAccount(userId),
  getAccount: (userId) => loadAccount(userId),
  getAccountByUsername: (username) => loadPublicProfile(username),
  getAccountIdByUsername: (username) => resolveUsername(username),
  searchAccounts: (query) => searchPublicAccounts(query),
  subscribeToAccount: (userId, onChange, options) =>
    subscribeToAccountRecord(userId, onChange, options),
  subscribeToAccountByUsername: (username, onChange, options) =>
    subscribeToPublicProfile(username, onChange, options),
  updateAccount: (payload) => updateAccountRecord(payload),
  syncAccountEmail: (email) => syncAccountRecordEmail(email),
  validateUsername: (username) => validateAccountUsername(username),
});
```

Adapter method'ları `undefined` bırakılabilir; fakat kullanılan method çağrı
anında bulunmuyorsa client açıklayıcı bir hata fırlatır. `primeAccount` ve
`primeAccountByUsername` isteğe bağlıdır; yoksa verilen snapshot fallback olarak
geri döndürülür.

### 6.2 Current account tüketimi

```jsx
import { useAccount } from '@/modules/account';

export function AccountSummary() {
  const { currentAccount, isLoading, isReady, refreshCurrentAccount, updateCurrentAccount } =
    useAccount();

  if (!isReady || isLoading) return <AccountSkeleton />;
  if (!currentAccount) return <EmptyAccount />;

  return (
    <AccountEditor
      account={currentAccount}
      onRefresh={refreshCurrentAccount}
      onSave={updateCurrentAccount}
    />
  );
}
```

### 6.3 Public profile akışı

```jsx
import { useAccountProfile, useResolvedAccountUser } from '@/modules/account';

export function PublicProfile({ username, initialProfile }) {
  const { isResolvingProfile, resolveError, resolvedUserId } = useResolvedAccountUser({
    username,
    initialResolvedUserId: initialProfile?.id,
  });
  const { hasLoadedProfile, profile } = useAccountProfile({
    username,
    resolvedUserId,
    initialProfile,
    onError: reportProfileError,
  });

  if (isResolvingProfile) return <ProfileSkeleton />;
  if (resolveError) return <ProfileNotFound message={resolveError} />;
  if (!hasLoadedProfile) return <ProfileSkeleton />;

  return <ProfileView profile={profile} />;
}
```

### 6.4 Server snapshot'ı hydrate etme

`initialResolvedUserId` ve `initialProfile` aynı profile aitse ilk browser
render'ında boş state gösterilmez. Profile hook snapshot'ı adapter cache'ine
prime eder ve subscription'ı `fetchOnSubscribe: false` ile başlatır.

```jsx
<PublicProfile username={params.username} initialProfile={serverProfile} />
```

## 7. Yaşam döngüsü

```text
Auth session değişir
  -> session ready beklenir
  -> authenticated user id çözülür
  -> ensureAccount / bootstrap
  -> account subscription veya tek seferlik getAccount
  -> state + actions context'leri yayınlanır
```

- Auth hazır değilken account loading state korunur.
- Anonymous durumda current account temizlenir.
- Adapter/config değişirse eski subscription kapatılır.
- Görünür durumda account polling aralığı 3 dakika, hidden durumda 15 dakikadır.
- Unmount sırasında subscription ve ilgili cleanup callback'i çalıştırılır.
- Eski subscription'dan geç gelen callback'ler state yazamaz.
- `isReady`, ilk bootstrap/subscription kararı tamamlandıktan sonra anlamlıdır.

## 8. Sınırlar ve hata davranışı

- Account module server credential veya service-role bilgisi taşımaz.
- Adapter error'ları `Error` biçimine normalize edilir; `status` ve `data`
  mümkün olduğunda korunur.
- `username` bulunamazsa `resolvedUserId` null, `resolveError` ise açıklayıcı
  bir değer olur.
- `initialProfile` yanlış user id'ye aitse hydrate edilmez.
- Profile subscription'ı yoksa veya callback error dönerse `onError` çağrılır;
  component lifecycle bozulmaz.
- State ve action context'leri ayrı olduğu için action-only tüketicileri account
  state değişimlerinde gereksiz render almaz.

## 9. Kurallar

1. Account provider'ı Auth provider'ın altında ve yalnızca bir kez mount edin.
2. Transport veya realtime kodunu provider'a taşımayın; adapter'da tutun.
3. Kullanıcıdan gelen email'i account adapter'a caller kimliği gibi vermeyin;
   authenticated viewer bilgisi Auth/session katmanından gelmelidir.
4. Public profile için önce username resolution, sonra profile subscription
   sırasını koruyun.
5. Server snapshot ile user id eşleşmiyorsa snapshot'ı kullanmayın.
6. Sadece gereken state/action hook'unu seçin; `useAccount()` aggregate'ini
   her feature'da varsayılan olarak kullanmayın.
7. Yeni adapter method'u eklenirse `adapter.js`, facade export'u ve bu belge
   birlikte güncellenmelidir.

## 10. Doğrulama

```bash
npx prettier --check modules/account/*.js modules/docs/account.md
npx eslint modules/account/*.js
node --import ./scripts/register-alias.mjs --test \
  tests/characterization/account-core.test.js
npm run build:webpack
```

Yeni davranış için en az şu durumlar test edilmelidir: Auth session hazır
değilken bootstrap, anonymous temizleme, adapter method eksikliği, snapshot
hydration, public/private subscription seçimi, hidden polling aralığı, cleanup
ve stale callback koruması.
