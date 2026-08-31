# Registry

Registry, sayfa ve uygulama katmanları arasındaki geçici UI durumunun ortak
yayınlama katmanıdır. Provider tek store'u tutar; config handler'ları sayfa
konfigürasyonunu kayda çevirir; resolver'lar aynı anahtardaki kayıtların
sonucunu belirler.

Registry type, key, resolver ve varsayılan lifecycle kuralları
`REGISTRY_DEFINITIONS` içinde merkezî olarak tanımlıdır. Uygulama genelindeki
standart anahtarlar `REGISTRY_KEYS`, kaynak adları ise `REGISTRY_SOURCES` ile
alınmalıdır.

## Önerilen kullanım

Sayfa birden fazla özelliği birlikte kaydediyorsa `usePageRegistry` kullanılır:

```js
import { usePageRegistry } from '@/modules/registry';

usePageRegistry({
  registry: { source: 'media-page', priority: 220 },
  nav: { path: '/movie/1', title: 'Movie' },
  loading: { isLoading },
});
```

Tekrar kullanılan route descriptor'ları için page metadata açıkça tanımlanabilir:

```js
import { defineRegistryConfig, usePageRegistry } from '@/modules/registry';

const registryConfig = defineRegistryConfig(
  { nav: { path: '/account', title: 'Account' } },
  { source: 'account-shell', priority: 180 },
);

usePageRegistry(registryConfig);
```

Tek bir özellik kaydediliyorsa typed adapter tercih edilir:

```js
import { useNavRegistration } from '@/modules/registry';

useNavRegistration(
  { path: '/account', title: 'Account', icon: 'solar:user-circle-bold' },
  { source: 'static', priority: 100 },
);
```

Mevcut `useRegistry` API'si geriye dönük uyumluluk için korunur. Yeni tüketiciler
Registry type değerlerini ve düşük seviye `register` çağrılarını bilmemelidir.

Uygulama başlangıcındaki değişmeyen kayıtlar Provider'a `initialEntries` olarak
verilebilir. Bu kayıtlar ilk render snapshot'ında hazır olur; sonradan çalışan
effect'e veya ilk paint sonrasındaki bir bootstrap adımına bağlı kalmaz:

```jsx
<RegistryProvider initialEntries={APP_REGISTRY_ENTRIES}>{children}</RegistryProvider>
```

## Metadata sözleşmesi

`registry` alanı feature seviyesinde veya sayfa seviyesinde kullanılabilir.
Sayfa seviyesi varsayılandır; feature seviyesindeki değer aynı alanı ezebilir.

| Alan             | Anlamı                                                             |
| ---------------- | ------------------------------------------------------------------ |
| `source`         | Kayıt sahibinin sabit kimliği; aynı sahip kendi kaydını günceller. |
| `priority`       | Aynı anahtardaki kayıtların önceliği; büyük değer kazanır.         |
| `lifecycle`      | `immediate`, `graceful`, `persistent` veya `route`.                |
| `cleanupDelayMs` | Unmount sonrası temizleme gecikmesi. Negatif değerler geçersizdir. |
| `validation`     | `warn` (varsayılan) veya geçersiz payload'ı reddeden `strict`.     |

Kaynak öncelikleri için tanımlı sabitler `REGISTRY_SOURCES` ve
`REGISTRY_SOURCE_PRIORITY` üzerinden takip edilir. Açık `priority` her zaman
varsayılan kaynağın önceliğini geçersiz kılar.

Varsayılan lifecycle davranışı mevcut davranışı korur:

- background, context menu ve modal: `immediate`
- loading: `graceful`, varsayılan 600 ms
- nav: `route`, varsayılan 600 ms

`persistent` açıkça seçilirse component unmount olduğunda kayıt kaldırılmaz.
Bu seçenek yalnızca uygulama yaşam döngüsü boyunca kalması istenen kayıtlar için
kullanılmalıdır.

Typed payload validation varsayılan olarak warning üretir ve mevcut legacy
davranışı korur. Yeni veya kritik kayıtlar fail-closed çalıştırılmak istenirse
`registry: { validation: 'strict' }` kullanılabilir. Geçersiz strict kayıtlar
store'a yazılmaz ve `rejected` handle döner.

## Kayıt handle'ları ve abonelikler

Düşük seviye `register` ve typed action `register` çağrıları callable bir handle
döndürür. Eski disposer fonksiyonu davranışı korunurken handle üzerinden kayıt
durumu ve kontrollü güncelleme de görülebilir:

```js
const handle = register('/movie/1', { title: 'Movie' });
handle.active;
handle.update({ title: 'Updated movie' });
handle.dispose();
```

`batch` içindeki `queue.register` da aynı handle'ı döndürür ve tek atomik commit
sonrasında dispose edilebilir. Etkisiz veya geçersiz kayıtlar no-op handle
üretir.

Key tabanlı selector hook'ları yalnızca ilgili key değiştiğinde bilgilendirilir;
`useRegistryEntries(type)` ise type kapsamındaki değişiklikleri dinler. Böylece
bir sayfadaki bağımsız modal veya nav kayıtları birbirlerinin render akışını
gereksiz yere uyandırmaz.

## Resolver davranışı

- Modal, loading, background ve context menu kayıtlarında en yüksek öncelikli
  kayıt kazanır.
- Nav ve nav runtime kayıtları düşük öncelikten yüksek önceliğe merge edilir.
  Nested `style` alanları da deterministik biçimde merge edilir.
- Eşit priority ve source durumunda provider'ın monotonic registration sequence
  değeri kullanılır; aynı milisaniyedeki kayıtların sonucu rastgele değildir.
- Component instance'ı kendi kaydını temizler. Disposer veya instance-scoped
  unregister kardeş instance'ların kayıtlarına dokunmaz.

## Okuma ve tanılama

Tam snapshot yerine yalnızca ihtiyaç duyulan alan için
`useRegistrySelector(type, key, selector, isEqual)` kullanılabilir. Yaygın tipler
için `useNavValue`, `useModalValue` ve `useContextMenuValue` yardımcıları vardır.

Development ortamında son Registry işlemleri sınırlı bir buffer'da tutulur:

```js
import { getRegistryDiagnostics } from '@/modules/registry';

const events = getRegistryDiagnostics();
```

React tabanlı bir development inspector için aynı snapshot sözleşmesine sahip
`useRegistryDiagnostics()` hook'u kullanılabilir.

Production'da diagnostics kayıtları no-op'tur. Diagnostics hiçbir zaman store
işlemini veya render akışını değiştirmemelidir.

Diagnostics olayları `register`, `unregister`, `dispose`, `ignore`, `reject` ve
`error` aksiyonlarını; mümkün olduğunda `type`, `key`, `source`, `instanceId`,
`reason`, `phase` ve validation `issues` alanlarını içerir. Bu alanlar değer
payload'ının kendisini taşımaz.

## Kurallar

1. Yeni tüketiciler typed adapter veya `usePageRegistry` kullanır.
2. `source` özelliği component adıyla değil, kayıt sahibinin lifecycle sınırıyla
   seçilir.
3. Aynı key için birden fazla instance mümkünse instance-scoped cleanup korunur.
4. Registry payload'ına `registry` metadata'sı dışında kontrol alanı eklenmez;
   feature payload'ı resolver'ın beklediği sözleşmeye uyar.
5. Yeni lifecycle veya resolver davranışı eklenirse önce contract testi ve bu
   dosyadaki kural güncellenir.
