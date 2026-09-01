# Module: Registry

> Sayfa ve uygulama katmanlarının geçici UI descriptor'larını priority, merge, lifecycle ve validation kurallarıyla yayınlar.

## 1. Genel bakış

`modules/registry`, feature'ların Nav, Background, Loading, Modal ve Context
Menu gibi modüllere declarative kayıt göndermesini sağlar. Provider tek bir
external store tutar; registration adapter'ları feature API'sini sadeleştirir;
resolver'lar aynı key'deki kayıtların effective value'sunu üretir.

## 2. Sorumluluklar

### Sahip olduğu kararlar

- Registry type, key, source ve metadata sözleşmesi
- Register/unregister/batch operation'ları
- Priority resolver ve Nav merge resolver'ı
- Immediate, graceful, persistent ve route lifecycle'ları
- Warn/strict typed validation
- Instance-scoped handle disposal ve update
- Key/type selector subscription'ları
- Initial entries bootstrap ve bounded diagnostics

### Sahip olmadığı kararlar

- Kayıt payload'ının domain iş kuralı
- Nav, Modal veya Background'ın kendi render davranışı
- Transport, persistence veya server data lifecycle'ı
- Feature'ın ne zaman kayıt üretmesi gerektiği

## 3. Dosya sahipliği

| Dosya              | Sahip olduğu implementasyon                                 | Public mi? |
| ------------------ | ----------------------------------------------------------- | ---------- |
| `index.js`         | Public facade, config helper ve export composition          | Evet       |
| `contracts.js`     | Type/key/source/lifecycle/validation sözleşmeleri           | Dolaylı    |
| `provider.js`      | External store, Provider, action ve selector hook'ları      | Dolaylı    |
| `operations.js`    | Pure register/unregister/batch/resolve operation'ları       | Dolaylı    |
| `handlers.js`      | Page config'ini typed registration operation'larına çevirme | Dolaylı    |
| `registrations.js` | Feature-facing typed registration hook'ları                 | Dolaylı    |
| `bootstrap.js`     | Initial/route registry bootstrap yardımcıları               | Dolaylı    |
| `diagnostics.js`   | Development diagnostics buffer ve subscriber'ları           | Dolaylı    |
| `stabilization.js` | Config diff ve stable selector yardımcıları                 | İç         |

## 4. Kurulum

Registry provider, Registry tüketen tüm provider'ların üstünde bir kez mount
edilmelidir:

```jsx
<RegistryProvider initialEntries={APP_REGISTRY_ENTRIES}>
  <BackgroundProvider>
    <LoadingProvider>
      <ModalProvider>{children}</ModalProvider>
    </LoadingProvider>
  </BackgroundProvider>
</RegistryProvider>
```

Değişmeyen başlangıç kayıtları `initialEntries` ile verilirse ilk render
snapshot'ında hazır olur; effect veya ilk paint sonrası bootstrap beklenmez.

## 5. Public interface

### 5.1 Type, key ve metadata

| Export grubu | Export'lar                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Types        | `REGISTRY_TYPES`, `REGISTRY_DEFINITIONS`, `getRegistryDefinition`                                          |
| Keys         | `REGISTRY_KEYS`                                                                                            |
| Sources      | `DEFAULT_SOURCE`, `DYNAMIC_SOURCE`, `REGISTRY_SOURCES`, `REGISTRY_SOURCE_PRIORITY`, `REGISTRY_SOURCE_RANK` |
| Lifecycle    | `REGISTRY_LIFECYCLES`                                                                                      |
| Validation   | `REGISTRY_VALIDATION_MODES`, `validateRegistryValue`, `validateRegistryMetadata`                           |
| Resolution   | `REGISTRY_RESOLVERS`, `normalizeRegistryMetadata`, `normalizePageRegistryConfig`, `withRegistryMetadata`   |

Registry type'ları `CONTEXT_MENU`, `BACKGROUND`, `LOADING`, `MODAL`, `NAV` ve
`NAV_RUNTIME`'dır. Default key'ler `CONTEXT_MENU_CURRENT`, `BACKGROUND`,
`LOADING` ve `NAV_RUNTIME` için tanımlıdır.

### 5.2 Provider, hook, operation ve registration export'ları

| Grup               | Export'lar                                                                                                                                                                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider/store     | `RegistryProvider`, `createRegistryStore`, `useRegistryActions`                                                                                                                                                                                                                                                             |
| Page config        | `usePageRegistry`, `defineRegistryConfig`, `applyRegistryConfig`                                                                                                                                                                                                                                                            |
| Typed registration | `useNavRegistration`, `useBackgroundRegistration`, `useLoadingRegistration`, `useContextMenuRegistration`, `useModalRegistration`                                                                                                                                                                                           |
| Read               | `useRegistry`, `useRegistryValue`, `useRegistryEntries`, `useRegistrySelector`                                                                                                                                                                                                                                              |
| Typed read         | `useNavValue`, `useNavRegistry`, `useNavRegistryActions`, `useNavRuntimeValue`, `useNavRuntimeRegistry`, `useModalValue`, `useModalRegistry`, `useBackgroundValue`, `useLoadingValue`, `useContextMenuValue`, `useContextMenuRegistry`                                                                                      |
| Operations         | `applyOperation`, `createInitialRegistries`, `createResolverCache`, `createRecordKey`, `createRegisterOperation`, `createUnregisterOperation`, `hasOperationEffect`, `isRegistryType`, `isValidRegistryTarget`, `removeSourceRecord`, `resolveEffectiveOperations`, `resolveEntryValue`, `runScopedBatch`, `toSourceRecord` |
| Diagnostics        | `getRegistryDiagnostics`, `clearRegistryDiagnostics`, `subscribeRegistryDiagnostics`, `useRegistryDiagnostics`                                                                                                                                                                                                              |
| Bootstrap          | `RegistryBootstrap`, `createRouteRegistry`                                                                                                                                                                                                                                                                                  |

## 6. Sözleşmeler ve kullanım örnekleri

### 6.1 Sayfa seviyesinde kayıt

```jsx
import { usePageRegistry } from '@/modules/registry';

export function MediaPageRegistry({ media, isLoading }) {
  usePageRegistry({
    registry: { source: 'media-page', priority: 220 },
    nav: { path: `/movie/${media.id}`, title: media.title },
    background: { image: media.backdropUrl, overlay: true },
    loading: { isLoading, minDuration: 300 },
  });

  return null;
}
```

`usePageRegistry` aynı page config içinde `nav`, `background`, `loading`,
`modal`, `modals` ve `contextMenu` feature'larını işleyebilir.

### 6.2 Typed registration

```jsx
useNavRegistration(
  { path: '/account', title: 'Account', icon: 'User' },
  { source: 'account-feature', priority: 200, lifecycle: 'route' },
);

useLoadingRegistration(
  { isLoading: true, skeleton: <PageSkeleton /> },
  { source: 'account-feature', cleanupDelayMs: 600 },
);
```

Typed hook'lar Registry type ve key ayrıntısını tüketiciden gizler. `enabled:
false` veya `null` payload kayıt üretmez.

### 6.3 Metadata ve lifecycle

```js
const config = defineRegistryConfig(
  { nav: { path: '/settings', title: 'Settings' } },
  {
    source: 'settings-feature',
    priority: 180,
    lifecycle: 'route',
    cleanupDelayMs: 600,
    validation: 'strict',
  },
);
```

Metadata alanları `source`, `instanceId`, `priority`, `lifecycle`/`cleanup`,
`cleanupDelayMs`, `validation` ve optional `cleanup` callback'idir.

Default lifecycle:

| Type         | Key policy | Resolver | Default lifecycle |
| ------------ | ---------- | -------- | ----------------- |
| Background   | singleton  | priority | immediate         |
| Context menu | route      | priority | immediate         |
| Loading      | singleton  | priority | graceful          |
| Modal        | named      | priority | immediate         |
| Nav          | path       | merge    | route             |
| Nav runtime  | singleton  | merge    | persistent        |

`persistent` unmount sonrası kaydı bırakır. `graceful` cleanup gecikmesiyle
çıkar; `route` route transition lifecycle'ına bağlanır.

### 6.4 Priority ve merge

- Background, Context Menu, Loading ve Modal'da en yüksek priority kazanır.
- Nav ve Nav Runtime kayıtları düşük priority'den yükseğe merge edilir.
- Nested `style` alanları deterministik biçimde merge edilir.
- Eşit priority/source durumunda monotonic registration sequence kullanılır.

### 6.5 Validation

Warn default davranışıdır ve legacy payload'ı reddetmeden issue raporlar. Strict
mode fail-closed çalışır:

```js
useNavRegistration(navItem, {
  source: 'new-feature',
  validation: 'strict',
});
```

Geçersiz strict kayıt store'a yazılmaz ve `rejected` handle döner.

### 6.6 Handle ve batch

```js
const handle = register(REGISTRY_TYPES.NAV, '/settings', navItem, 'feature', {
  priority: 200,
});

handle.active;
handle.status;
handle.update({ title: 'Updated settings' });
handle.dispose();
```

`batch` içindeki `queue.register` aynı handle sözleşmesini korur ve tek atomik
commit sonrasında dispose edilebilir. Instance-scoped unregister kardeş
instance'ların kayıtlarını silmez.

### 6.7 Selector ve diagnostics

```jsx
const title = useRegistrySelector(REGISTRY_TYPES.NAV, '/settings', (entry) => entry?.title);
```

Key selector yalnız ilgili key değişince render'ı uyandırır; type entries hook'u
ilgili type'ın tamamını izler. Development diagnostics `register`,
`unregister`, `dispose`, `ignore`, `reject` ve `error` olaylarını bounded
buffer'da tutar. Payload değerinin kendisi diagnostics içine yazılmaz.

## 7. Yaşam döngüsü

```text
feature config / typed registration
  -> metadata normalization
  -> typed value validation
  -> register operation
  -> external store snapshot
  -> resolver effective value
  -> typed consumer hook
  -> unregister/dispose + lifecycle cleanup
```

- Provider initial entries'i ilk snapshot'a hydrate eder.
- Component unmount'ı source/instance scope'unda cleanup başlatır.
- Graceful kayıt cleanup delay boyunca son değeri koruyabilir.
- Persistent kayıt explicit unregister edilene kadar kalır.
- Aynı immutable entry identity için resolver cache kullanılabilir.
- Unrelated key/type değişimleri selector equality ile elenir.

## 8. Sınırlar, performans ve hata davranışı

- Registry yalnız descriptor publication katmanıdır; payload semantiğini çözmez.
- Warn mode backward-compatible; strict mode yeni/critical kayıtlar içindir.
- Geçersiz target, key veya payload no-op/rejected handle ile kontrollü kalır.
- Diagnostics production'da no-op'tur ve render/store sonucunu değiştirmez.
- Unregister source/instance scope'una uymuyorsa sibling kayıt korunur.
- Subscription cleanup provider ve component lifecycle'ına bağlıdır.

## 9. Kurallar

1. Yeni tüketiciler için typed registration veya `usePageRegistry` kullanın.
2. Registry type/key ve raw `register` çağrısını feature UI'sına yaymayın.
3. `source` değerini component adı değil lifecycle sahibi olarak seçin.
4. Aynı key'de birden fazla instance varsa `instanceId`/handle cleanup kullanın.
5. Registry payload'ına metadata dışı control alanı eklemeyin.
6. Strict validation'ı yeni veya kritik kayıtlar için tercih edin.
7. Yeni resolver/lifecycle/validation davranışını contract test ve bu belgeyle
   aynı değişiklikte güncelleyin.

## 10. Doğrulama

```bash
npx prettier --check modules/registry/*.js modules/docs/registry.md
npx eslint modules/registry/*.js
node --import ./scripts/register-alias.mjs --test \
  tests/characterization/registry-store.test.js
npm run build:webpack
```

Test kapsamı: typed validation, priority/merge resolver, source/instance
cleanup, handle update/dispose, batch atomicity, selector equality, lifecycle
delay, initial entries ve diagnostics isolation.
