# Auth

Projeden bağımsız kimlik doğrulama çekirdeği. Adapter tabanlı yapısı sayesinde herhangi bir backend veya auth sağlayıcısına bağlanabilir; React provider, hook ve guard yüzeyi üzerinden uygulamanın geri kalanına standart bir session / user modeli sunar.

`app/providers.js` içinde `<AuthProvider>` ile bağlanır. Varsayılan yapı `config/auth.config.js` üzerinden okunur.

Şu anki proje konfigürasyonunda Firebase Auth varsa öncelik ona verilir; yoksa generic HTTP adapter fallback olarak kullanılabilir.

---

## Sağladıkları

- normalize edilmiş `session` ve `user` modeli
- adapter tabanlı `signIn`, `signUp`, `signOut`, `refreshSession`
- provider-native veya localStorage tabanlı session persistence
- API isteklerine otomatik bearer token enjeksiyonu
- capability / role tabanlı erişim kontrolü
- `AuthGate`, `AnonymousGate`, `useAuthorization`
- `API_UNAUTHORIZED` event'inde session temizleme

---

## Ana Kullanım

```javascript
import { useAuth } from '@/modules/auth'

export default function SignInButton() {
  const { signIn, isAuthenticated, user } = useAuth()

  if (isAuthenticated) {
    return <span>{user?.name}</span>
  }

  return (
    <button
      onClick={() =>
        signIn({
          email: 'user@example.com',
          password: 'secret',
        })
      }
    >
      Sign In
    </button>
  )
}
```

Firebase Email/Password ile:

```javascript
await signIn({
  email: 'user@example.com',
  password: 'secret',
})

await signUp({
  email: 'user@example.com',
  password: 'secret',
  name: 'Omer',
})
```

Firebase Google ile:

```javascript
await signIn({
  provider: 'google',
})
```

Google akışında ayrı bir `signUp` çağrısı gerekmez. Firebase kullanıcı yoksa ilk girişte hesabı oluşturur.

---

## Adapter Sözleşmesi

Bir adapter en azından isim taşımalıdır. Aşağıdaki metodların tamamı opsiyoneldir; yalnızca desteklenenler implement edilir.

```javascript
createAuthAdapter({
  name: 'my-auth',
  getSession: async (context) => null,
  signIn: async (credentials, context) => session,
  signUp: async (payload, context) => session,
  signOut: async (context) => null,
  refreshSession: async (session, context) => session,
  updateProfile: async (payload, context) => sessionOrUser,
  requestPasswordReset: async (payload, context) => result,
  confirmPasswordReset: async (payload, context) => result,
  onAuthStateChange: (listener, context) => unsubscribe
})
```

Adapter context:

- `config`
- `storage`
- `session`

---

## API Adapter

Hazır gelen `createApiAuthAdapter`, generic bir HTTP auth servisinin üstüne oturur.

```javascript
import { createApiAuthAdapter } from '@/modules/auth'

const adapter = createApiAuthAdapter({
  baseUrl: process.env.NEXT_PUBLIC_AUTH_API_URL,
  endpoints: {
    session: '/session',
    signIn: '/sign-in',
    signUp: '/sign-up',
    signOut: '/sign-out',
    refresh: '/refresh',
    profile: '/profile'
  }
})
```

Beklenen response esnek tutulmuştur. Aşağıdaki formlar otomatik normalize edilir:

```javascript
{ session: { accessToken, refreshToken, expiresAt, user } }
```

veya

```javascript
{ accessToken, refreshToken, expiresAt, user }
```

`user` içinde `roles`, `permissions`, `capabilities` alanları opsiyoneldir.

---

## Firebase Adapter

Hazır gelen `createFirebaseAuthAdapter`, Firebase Web Auth SDK üstüne oturur.

```javascript
import { createFirebaseAuthAdapter } from '@/modules/auth'
import { auth, googleAuthProvider } from '@/services/firebase.service'

const adapter = createFirebaseAuthAdapter({
  auth,
  providers: {
    google: googleAuthProvider,
  },
})
```

Desteklenen akışlar:

- `signIn({ email, password })`
- `signUp({ email, password, name })`
- `signIn({ provider: 'google' })`
- `requestPasswordReset({ email })`
- `confirmPasswordReset({ oobCode, newPassword })`
- `updateProfile({ name, photoURL, email, newPassword })`

Firebase custom claims içinde `roles`, `permissions`, `capabilities` varsa modül bunları normalize ederek `session.user` içine taşır.

---

## Erişim Kontrolü

```javascript
import { AuthGate, useAuthorization } from '@/modules/auth'

function FavoritePanel() {
  const { isAllowed } = useAuthorization({
    capabilities: ['favorites:write'],
  })

  if (!isAllowed) return null

  return <div>Favorite actions</div>
}

function CommentComposer() {
  return (
    <AuthGate
      capabilities={['comments:write']}
      fallback={<div>Sign in to comment</div>}
    >
      <textarea />
    </AuthGate>
  )
}
```

Bu capability isimleri örnektir. Modül kendi içinde proje-özel bir isimlendirme zorlamaz.

---

## useRegistry ile Kullanım

`auth` modülü için doğrudan bir `useRegistry` plugin'i yoktur. Auth, route bazlı registry yerine uygulama düzeyinde provider olarak çalışır.
