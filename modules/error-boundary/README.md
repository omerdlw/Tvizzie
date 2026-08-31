# Error Boundary

`modules/error-boundary`, React render hatalarını, tarayıcı çalışma zamanı
hatalarını ve raporlama hedeflerini tek bir hata akışı altında birleştirir.
Modülün amacı yalnızca fallback göstermek değildir; hatayı güvenli biçimde
yakalamak, uygulama içi hata bildirimini yayınlamak, gözlemlenebilirlik
handler'larına aktarmak ve kullanıcıya toparlanma yolu sunmaktır.

Bu belge mevcut davranış ve public API sözleşmesine göre hazırlanmıştır.
Ürüne özgü hata mesajları, rota politikaları veya raporlama sağlayıcısı
kuralları bu modülün içine taşınmamalıdır.

## Sorumluluk sınırı

Error Boundary şu katmanları sahiplenir:

- React component tree içindeki render ve lifecycle hatalarını yakalamak
- `window.onerror` ve `unhandledrejection` olaylarını dinlemek
- Hataları normalize edilmiş bir report şekline dönüştürmek
- Sampling, fingerprint ve deduplication uygulamak
- Console ve Sentry gibi hedefleri handler adapter'larıyla izole etmek
- `APP_ERROR` olayıyla uygulama içi hata bildirimini yayınlamak
- Fallback ve reset davranışını yönetmek

Şunlar bu modülün sorumluluğu değildir:

- Server-side exception middleware'i
- API hata sözleşmelerini tanımlamak
- Hata ekranının ürün veya domain tasarımını belirlemek
- Hataları otomatik olarak yeniden denemek
- Kullanıcıya ait domain state'ini yönetmek

## Mimari akış

```text
React render/lifecycle hatası
  -> ErrorBoundaryCore.componentDidCatch

Tarayıcı runtime hatası
  -> GlobalErrorListener
     -> window.error / unhandledrejection

Her iki kaynak
  -> getErrorReporter()
     -> normalize context
     -> sampling
     -> fingerprint + deduplication
     -> beforeSend
     -> console / Sentry / custom handlers

Boundary ve listener
  -> globalEvents.emit(EVENT_TYPES.APP_ERROR)
     -> Nav status / uygulama içi hata bildirimi
```

Raporlama hatası, boundary fallback'inin veya global listener akışının
bozulmasına izin verilmemesi için izole edilir. Handler'lardan biri hata verse
bile diğer handler'lar çalışmaya devam eder.

## Dosya haritası

### `index.js`

Modülün tek public giriş noktasıdır. Uygulama kodu mümkün olduğunca aşağıdaki
facade üzerinden import yapmalıdır:

```js
import {
  ComponentError,
  GlobalError,
  GlobalErrorListener,
  ModuleError,
  createConsoleHandler,
  createSentryHandler,
  getErrorReporter,
} from '@/modules/error-boundary';
```

Implementasyon dosyalarından doğrudan import etmek, yalnızca modülün kendi
katmanları veya hedefli unit/characterization testleri için uygundur.

### `boundary.js`

React tabanlı boundary çekirdeğini ve üç public preset'i içerir:

- `ErrorBoundaryCore`: ortak state, fallback, reset, event ve reporting akışı
- `GlobalError`: uygulama seviyesinde hata görünümü
- `ModuleError`: bağımsız modül veya surface çevresinde hata izolasyonu
- `ComponentError`: küçük veya inline component alanlarında hata izolasyonu

### `reporter.js`

React'ten bağımsız raporlama pipeline'ıdır. Context ve tag state'ini, report
üretimini, sampling'i, fingerprint/dedupe işlemini ve handler fan-out'unu
yönetir.

### `listener.js`

Tarayıcı global error listener'ıdır. `error` ve `unhandledrejection`
olaylarını normalize eder, beklenen gürültüyü filtreler ve ortak reporter ile
uygulama event kanalına aktarır.

## Uygulama kabuğuna yerleştirme

Global observability kurulumu uygulama kökünde bir kez yapılır. Mevcut kabukta
`ObservabilityBootstrap` ve `GlobalErrorListener`, `AppProviders` içinde
mount edilir; böylece home, legal, auth, media ve account rotaları aynı
kapsama girer.

```jsx
<CoreShellProviders>
  <ObservabilityBootstrap />
  <GlobalErrorListener />
  {/* diğer uygulama provider ve katmanları */}
  <GlobalError>{children}</GlobalError>
</CoreShellProviders>
```

`GlobalErrorListener` route layout'larında tekrar mount edilmemelidir. Aynı
listener'ın birden fazla instance'ı aynı browser hatasını birden fazla kez
event ve report olarak yayınlayabilir.

`GlobalError`, uygulama ağacını sarmalayan son kullanıcı toparlanma sınırıdır.
`ModuleError` ve `ComponentError`, bunun altında daha dar fallback alanları
oluşturmak için kullanılabilir.

## Boundary API'si

### `GlobalError`

```jsx
<GlobalError onReset={handleReset} fallback={fallback}>
  {children}
</GlobalError>
```

Props:

| Prop       | Tür                     | Anlamı                             |
| ---------- | ----------------------- | ---------------------------------- |
| `children` | `ReactNode`             | Korunan uygulama içeriği           |
| `fallback` | `ReactNode \| function` | İsteğe bağlı özel fallback         |
| `onReset`  | `function`              | Kullanıcı retry yaptığında çalışır |

`GlobalError`, pathname'i otomatik olarak `resetKey` olarak kullanır. Rota
değiştiğinde boundary hata state'i temizlenir.

### `ModuleError`

```jsx
<ModuleError name="Comments" fallback={fallback}>
  <CommentsPanel />
</ModuleError>
```

Ek props:

- `name`: fallback başlığını `${name} Error` biçiminde üretir
- `fallback`: module fallback'i
- `onReset`: retry sonrası callback

### `ComponentError`

```jsx
<ComponentError message="Preview yüklenemedi">
  <Preview />
</ComponentError>
```

Ek props:

- `message`: inline fallback mesajı
- `fallback`: özel fallback
- `onReset`: retry sonrası callback

### Fallback function sözleşmesi

`fallback` function olarak verildiğinde aşağıdaki değerleri alır:

```jsx
<ComponentError
  fallback={({ error, resetError }) => <RetryPanel error={error} onRetry={resetError} />}
>
  <Widget />
</ComponentError>
```

Fallback function render sırasında hata üretmemelidir. Fallback'in kendi
render'ı da hata üretebilecekse onu daha üst seviyedeki bağımsız bir boundary
ile koruyun.

### `ErrorBoundaryCore`

Preset'lerin ortak implementasyonudur ve gerektiğinde daha özel bir boundary
sözleşmesi için kullanılabilir.

```jsx
<ErrorBoundaryCore
  title="Editor Error"
  message="Editor could not be loaded"
  variant="module"
  resetKey={documentId}
  silent={false}
  onError={(error, errorInfo, context) => {
    // Domain'e özel ek tanı bilgisi
  }}
>
  <Editor documentId={documentId} />
</ErrorBoundaryCore>
```

Önemli props:

| Prop       | Tür                              | Anlamı                                         |
| ---------- | -------------------------------- | ---------------------------------------------- |
| `children` | `ReactNode`                      | Korunan içerik                                 |
| `fallback` | `ReactNode \| function`          | Hata state'inde render edilecek içerik         |
| `title`    | `string`                         | Varsayılan fallback başlığı                    |
| `message`  | `string`                         | Varsayılan fallback mesajı                     |
| `variant`  | `string`                         | Report context içindeki boundary türü          |
| `resetKey` | `unknown`                        | Değiştiğinde hata state'ini temizleyen anahtar |
| `silent`   | `boolean`                        | `APP_ERROR` event'ini yayınlamayı kapatır      |
| `onError`  | `(error, info, context) => void` | Boundary hatası yakalandığında çalışır         |
| `onReset`  | `() => void`                     | Retry veya reset sonrasında çalışır            |

`onError` ve reporting callback'leri uygulama akışını bozmayacak şekilde
izole edilir. Bu callback'ler içinde UI state geçişi gerekiyorsa callback'i
kısa tutun ve yan etkileri kontrollü biçimde başlatın.

## Reporter API'si

### Reporter instance'ı alma

```js
import { getErrorReporter } from '@/modules/error-boundary';

const reporter = getErrorReporter({
  enabled: true,
  sampleRate: 1,
  deduplicateWindow: 60000,
});
```

`getErrorReporter`, process/browser context'i içinde tek bir shared instance
döndürür. Constructor seçenekleri yalnızca ilk instance oluşturulurken
uygulanır; sonradan yapılan çağrılar mevcut instance'ı döndürür.

Desteklenen seçenekler:

| Seçenek             | Varsayılan | Davranış                                                                |
| ------------------- | ---------- | ----------------------------------------------------------------------- |
| `enabled`           | `true`     | `false` ise capture işlemleri no-op olur                                |
| `sampleRate`        | `1`        | `0..1` aralığına sıkıştırılır; `0` hiçbir report göndermez              |
| `beforeSend`        | `null`     | Handler'lara gitmeden önce report'u dönüştürür veya `null` döndürebilir |
| `deduplicateWindow` | `60000` ms | Aynı fingerprint'in yeniden gönderilmesini geçici olarak engeller       |

`sampleRate` ve `deduplicateWindow` geçersiz sayısal değerlerden korunur.
`deduplicateWindow: 0`, dedupe penceresini bilinçli olarak kapatır.

### State ve capture metotları

```js
reporter.setContext('feature', 'media').setTag('runtime', 'web');

reporter.captureError(error, {
  route: '/movie/123',
  source: 'media-player',
});

reporter.captureMessage('Playback stalled', 'warning', {
  route: '/movie/123',
});
```

Metotlar:

- `addHandler(handler)`: `handle(report)` fonksiyonuna sahip handler ekler
- `removeHandler(name)`: aynı ada sahip handler'ları kaldırır
- `setContext(key, value)`: ortak report context'ine değer ekler; en fazla 10
  key tutulur, mevcut key'ler limit doluyken de güncellenebilir
- `setTag(key, value)`: tag değerini string olarak saklar
- `captureError(error, extraContext)`: normalize eder, filtreler ve yayınlar
- `captureMessage(message, level, context)`: mesajı `Message` isimli Error'a
  dönüştürerek `captureError` üzerinden yayınlar

`extraContext`, reporter seviyesindeki context'i yalnızca o capture için
override eder. Context veya tag içine secret, access token, parola ya da
gereksiz kişisel veri koymayın.

### Normalize edilmiş report şekli

Handler'lara gönderilen report şu alanları taşır:

```js
{
  error: {
    message: '...',
    stack: '...',
    name: 'Error',
  },
  fingerprint: '...',
  timestamp: '2026-08-31T00:00:00.000Z',
  environment: {
    route: '/movie/123',
    userAgent: '...',
    platform: '...',
    language: 'tr-TR',
    online: true,
    url: 'https://example.test/movie/123',
  },
  componentStack: '...',
  context: {},
  tags: {},
}
```

Fingerprint; component stack'in ilk satırı, hata mesajının ilk 100 karakteri,
hata adı ve route üzerinden üretilir. `beforeSend` fingerprint'i değiştirirse
bu yalnızca gönderilen report'u etkiler; dedupe timer'ı capture anındaki
orijinal fingerprint anahtarını kullanmaya devam eder.

## Handler'lar

### Console handler

```js
reporter.addHandler(
  createConsoleHandler({
    level: 'warn',
    expanded: true,
  }),
);
```

`level` console metodunu, `expanded` ise compact veya group tabanlı çıktıyı
belirler. Handler log sırasında hata verse bile reporter diğer handler'ları
çalıştırmaya devam eder.

Client tarafında reporter'ın henüz handler'ı yoksa ilk capture sırasında
güvenli bir console handler oluşturulur. Bu, observability bootstrap effect'i
çalışmadan oluşan erken hataların tamamen kaybolmasını önler.

### Sentry handler

```js
const handler = createSentryHandler(window.Sentry);

if (handler.name === 'sentry') {
  reporter.addHandler(handler);
}
```

Sentry adapter'ının güvenli biçimde çalışması için SDK'da hem
`captureException` hem de `withScope` fonksiyonu bulunmalıdır. Geçersiz veya
eksik SDK console handler'a düşer ve uygulama akışını bozmaz.

Handler; fingerprint, tag, environment, custom context ve component stack
bilgilerini Sentry scope'una taşır.

### Custom handler

```js
reporter.addHandler({
  name: 'internal-monitoring',
  handle(report) {
    queueMonitoringEvent({
      fingerprint: report.fingerprint,
      message: report.error.message,
      route: report.environment.route,
    });
  },
});
```

Custom handler yalnızca normalize edilmiş report'u tüketmelidir. Handler içinde
React state'i, global listener kurulumu veya tekrar `captureError` çağrısı
yapmayın; bunlar döngüsel reporting ve duplicate event üretebilir.

## Global listener politikası

`GlobalErrorListener` şu browser olaylarını dinler:

- `error` -> `event.error` veya `event.message`
- `unhandledrejection` -> `event.reason`

Beklenen gürültüyü azaltmak için aşağıdaki mesajlar filtrelenir:

- `ResizeObserver loop`
- `Network request failed`
- `Loading chunk`
- `Unexpected end of input`
- `Failed to fetch`
- `Script error`
- HTTP 404 ve `isNotFound()` ile tanınan hatalar

Ek korumalar:

- Aynı mesaj bir listener instance'ı içinde tekrar yayınlanmaz.
- İki saniyelik throttle uygulanır.
- Bir instance en fazla 10 global hata işler.
- Listener cleanup sırasında iki browser event listener'ı da kaldırılır.

Bu filtreler network/API hata sözleşmesinin yerine geçmez. Beklenen domain
hatası browser'a uncaught biçimde taşınıyorsa, onu burada geniş bir regex ile
gizlemek yerine hatanın üretildiği katmanda kontrollü biçimde ele alın.

## Uygulama içi hata event'i

Boundary ve global listener, kullanıcıya görünür hata durumlarının ortak
olayını yayınlar:

```js
globalEvents.emit(EVENT_TYPES.APP_ERROR, {
  message,
  error,
  errorInfo,
  resetError,
});
```

Nav status katmanı bu olayı retry veya fallback bildirimi üretmek için tüketir.
`silent` yalnızca `ErrorBoundaryCore` tarafındaki `APP_ERROR` yayını kapatır;
reporter'a gönderimi kapatmaz. Bir boundary'nin raporlanmasını da kapatmak
gerekiyorsa bunu `enabled`, sampling veya çağıran akışın kendi politikasıyla
çözün.

Next.js'nin `app/error.js` ve `app/global-error.js` dosyaları framework boundary
katmanlarıdır. Bunlar bu React preset'lerinin yerine geçmez; kendi özel reset
ve fullscreen fallback davranışlarını korurken aynı `getErrorReporter()`
pipeline'ını kullanabilir.

## Kullanım kuralları

1. Uygulama kodu `@/modules/error-boundary` facade'ından import eder.
2. `GlobalErrorListener` yalnızca uygulama kökünde bir kez mount edilir.
3. Uygulama ağacını `GlobalError` ile, bağımsız özellikleri `ModuleError` ile,
   küçük UI parçalarını `ComponentError` ile sarın.
4. Her boundary'ye ayrı global listener eklemeyin.
5. `onError` ve custom handler'ları kısa, güvenli ve yan etkileri sınırlı tutun.
6. `beforeSend` içinde secret veya kişisel veri loglamayın.
7. Aynı hatayı handler içinde tekrar capture etmeyin.
8. Fallback function'ın kendisini de hata verebilecek bir UI olarak değerlendirin.
9. Özel raporlama hedefleri için yeni adapter ekleyin; reporter pipeline'ını
   hedefe özel kodla kirletmeyin.
10. Yeni davranış değişikliklerini characterization veya contract testiyle
    koruyun.

## Test ve doğrulama

Error Boundary odaklı test:

```bash
node --import ./scripts/register-alias.mjs --test \
  tests/characterization/error-boundary.test.js
```

Biçim ve lint:

```bash
npx prettier --check modules/error-boundary/*.js modules/error-boundary/README.md
npx eslint modules/error-boundary/*.js
```

Production derlemesi:

```bash
npm run build:webpack
```

Yeni bir reporter veya listener davranışı eklenirken en az şu durumlar test
edilmelidir:

- Sampling `0`, `1` ve sınır dışı değerleri
- Dedupe penceresi ve `beforeSend` fingerprint dönüşümü
- Context limitinde mevcut key güncellemesi
- Geçersiz handler veya eksik Sentry SDK
- Handler hatasının diğer handler'ları durdurmaması
- Listener cleanup ve tekrar mount davranışı
- Boundary reset ve `resetKey` değişimi
