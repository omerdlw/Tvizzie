# Notification

`modules/notification`, uygulama içi bildirimleri tek bir state ve görünüm
akışı altında yönetir. Modül; kalıcı kritik bildirimleri, süreli toast'ları,
browser storage hydration'ını, global event bridge'lerini, erişilebilir
overlay'i ve bildirim hareket sözleşmesini birlikte sağlar.

Bu belge mevcut public interface ve runtime davranışına göre hazırlanmıştır.
Ürüne özgü mesajlar, domain event'leri ve sayfa içeriği Notification modülüne
taşınmamalıdır.

## Sorumluluk sınırı

Notification şu sorumlulukları üstlenir:

- Kritik bildirim ve toast state'ini tutmak
- Kritik bildirimleri refresh sonrasında geri yüklemek
- Toast mesajlarını normalize etmek ve ortak policy uygulamak
- Süreli bildirimlerin timer yaşam döngüsünü yönetmek
- Bildirimleri portal üzerinden sabit overlay olarak göstermek
- Close, action ve swipe-dismiss davranışlarını yürütmek
- `API_UNAUTHORIZED` gibi uygulama event'lerini bildirimlere dönüştürmek
- Motion variant ve interaction token'larını tek yerde sunmak

Şunlar bu modülün sorumluluğu değildir:

- Domain event'inin ne zaman üretileceğine karar vermek
- API veya authentication sözleşmesi tanımlamak
- Kullanıcı hesabı, session veya server notification verisini yönetmek
- Her toast için ayrı bir backend persistence mekanizması sağlamak
- Navigation state'ini değiştirmek

## Notification türleri

Modül iki bildirim ailesi kullanır:

| Aile   | Sabit            | Davranış                                              |
| ------ | ---------------- | ----------------------------------------------------- |
| Kritik | `CRITICAL_TYPES` | Storage'a yazılabilir, daha kalıcı ve kritik durumlar |
| Toast  | `TOAST_TYPES`    | Kısa süreli kullanıcı geri bildirimi                  |

Kritik türler:

- `PERMISSION_DENIED`
- `SESSION_EXPIRED`
- `SERVER_ERROR`
- `OFFLINE`

Toast türleri:

- `SUCCESS`
- `WARNING`
- `ERROR`
- `INFO`

Kritik bildirimler yalnızca tanımlı `CRITICAL_TYPES` değerlerinden birini
taşıyorsa persistence katmanına alınır. 404 benzeri beklenen not-found
mesajları kritik storage'a yazılmaz.

## Mimari akış

```text
Domain veya UI action
  -> useToast() / useNotificationActions().showNotification()

Global uygulama olayı
  -> NotificationListener
     -> API_UNAUTHORIZED

Her iki kaynak
  -> NotificationProvider
     -> normalized notification state
     -> timer lifecycle
     -> critical storage persistence

NotificationContainer
  -> timestamp sıralaması
  -> portal(document.body)
  -> AnimatePresence + drag
  -> NotificationOverlay
```

State tek bir `NotificationProvider` instance'ında tutulur. Görsel container ve
global listener provider'ın altında çalışır; böylece producer'lar doğrudan
overlay veya browser event listener yönetmek zorunda kalmaz.

## Dosya haritası

### `index.js`

Modülün public facade'ı ve görsel bildirim yüzeyidir. Uygulama kodu,
implementasyon dosyalarını bilmeden `@/modules/notification` üzerinden import
eder. `NotificationOverlay`, `NotificationContainer` ve global listener'lar da
bu dosyada bulunur; bu nedenle Notification modülünde ayrıca bir `view.js`
dosyası yoktur. Public export listesi burada bilinçli olarak görünür tutulur.

### `store.js`

Notification state'inin ve persistence katmanının sahibidir:

- browser storage yardımcıları
- `CRITICAL_TYPES`, `TOAST_TYPES`
- `NOTIFICATION_CONFIG`
- `NotificationProvider`
- `useNotificationActions`
- `useNotificationState`
- timer ve kritik bildirim filtreleme kuralları

Client storage hydration tamamlanmadan persistence effect'i çalışmaz. Bu
sayede ilk boş render snapshot'ı, refresh sonrasında saklanan kritik
bildirimleri yanlışlıkla silemez.

### `toast.js`

Toast facade'ını ve hareket sözleşmesini içerir:

- `useToast`
- toast duration policy
- message normalization ve suppression policy
- dedupe id çözümleme
- enter/exit, drag ve press motion token'ları

Görsel render ve global event bridge davranışı `index.js` içinde tutulur:

- `NotificationOverlay`
- `NotificationContainer`
- `NotificationListener`
- `NotificationBadgeListener`

`NotificationBadgeListener` bugün public compatibility hook'u olarak no-op'tur.
Feature layout'larında mevcut mount sözleşmesini bozmadan ileride badge davranışı
eklenebilmesi için korunur.

## Uygulama kabuğuna yerleştirme

Provider, container ve unauthorized listener uygulama kökünde bir kez
oluşturulmalıdır:

```jsx
<CoreShellProviders>
  {/* CoreShellProviders içinde NotificationProvider bulunur */}
  <NotificationListener />
  {/* diğer global katmanlar */}
  <NotificationContainer />
  {children}
</CoreShellProviders>
```

Mevcut uygulama kabuğunda `NotificationProvider`, `NotificationListener` ve
`NotificationContainer` `AppProviders` ağacında yer alır. `NotificationListener`
route layout'larına tekrar eklenmemelidir; aksi hâlde tek bir unauthorized
event'i birden fazla bildirim üretebilir.

`NotificationBadgeListener`, account/media gibi feature layout'larında mevcut
uyumluluk noktası olarak kalabilir. Bu hook bildirim state'ini veya global
listener'ı kendisi kurmaz.

## Public API

```js
import {
  NotificationContainer,
  NotificationProvider,
  TOAST_TYPES,
  useNotificationActions,
  useNotificationState,
  useToast,
} from '@/modules/notification';
```

Public interface grupları:

| İhtiyaç                    | Interface                                                                     |
| -------------------------- | ----------------------------------------------------------------------------- |
| Provider                   | `NotificationProvider`                                                        |
| State okuma                | `useNotificationState`                                                        |
| Düşük seviye action        | `useNotificationActions`                                                      |
| Mesaj odaklı toast         | `useToast`                                                                    |
| Overlay render             | `NotificationContainer`, `NotificationOverlay`                                |
| Global unauthorized bridge | `NotificationListener`                                                        |
| Kritik türler              | `CRITICAL_TYPES`                                                              |
| Toast türleri              | `TOAST_TYPES`                                                                 |
| Görünüm varsayılanları     | `NOTIFICATION_CONFIG`                                                         |
| Motion sözleşmesi          | `toastVariants`, `notificationContentVariants` ve `NOTIFICATION_*` token'ları |

## Düşük seviye notification action'ları

Provider altında state veya altyapı davranışı gerektiğinde düşük seviye action
facade'ı kullanılabilir:

```jsx
import { CRITICAL_TYPES, useNotificationActions } from '@/modules/notification';
import { Button } from '@/ui/primitives';

function OfflineBridge() {
  const { showNotification, dismissNotification } = useNotificationActions();

  function showOffline() {
    showNotification(CRITICAL_TYPES.OFFLINE, {
      message: 'You are currently offline',
    });
  }

  return <Button onClick={showOffline}>Show offline state</Button>;
}
```

`showNotification(type, data)` şu temel alanları kabul eder:

| Alan              | Anlamı                                          |
| ----------------- | ----------------------------------------------- |
| `id`              | State key'i; aynı id mevcut bildirimi günceller |
| `message`         | Ana bildirim metni                              |
| `description`     | İkincil açıklama                                |
| `duration`        | Pozitif milisaniye ise otomatik kapanma süresi  |
| `title`           | Overlay başlığını açıkça belirler               |
| `icon`            | String icon adı veya render edilebilir icon     |
| `actions`         | Action descriptor listesi                       |
| `dismissible`     | `false` ise close ve swipe davranışı kapatılır  |
| `theme`           | Hazır semantic theme descriptor'ı               |
| `actionToneClass` | Action button görünüm sınıfı                    |

`showNotification` düşük seviye bir interface'tir; string normalization veya
toast suppression policy uygulamaz. Kullanıcıya gösterilecek mesajlarda
çoğunlukla `useToast` tercih edilmelidir.

## `useToast` kullanımı

```jsx
import { useToast } from '@/modules/notification';
import { Button } from '@/ui/primitives';

function SaveButton() {
  const toast = useToast();

  async function save() {
    try {
      await saveChanges();
      toast.success('Changes saved');
    } catch (error) {
      toast.error(error?.message || 'Changes could not be saved', {
        dedupeKey: 'save-changes-error',
      });
    }
  }

  return <Button onClick={save}>Save</Button>;
}
```

Methods:

- `success(message, options)` — varsayılan 3000 ms
- `warning(message, options)` — varsayılan 4000 ms
- `error(message, options)` — varsayılan 4000 ms
- `info(message, options)` — varsayılan 3000 ms
- `show(type, message, options)` — duration caller tarafından belirlenir

Toast options:

- `action`: tek action descriptor; `actions` yoksa listeye dönüştürülür
- `actions`: action descriptor listesi
- `allowInProduction`: production'da opsiyonel success/info toast'larını açar
- `dedupeKey`: state id'si için açık ve stabil anahtar
- `description`: ikincil metin
- `duration`: otomatik kapanma süresi
- `id`: `dedupeKey` yoksa kullanılacak explicit state id'si
- diğer görünüm alanları: `title`, `icon`, `dismissible`, `theme` vb.

Mesaj `normalizeFeedbackText` üzerinden normalize edilir. Boş mesajlar ve
private profile ile ilgili beklenen mesajlar gösterilmez. Production'da
`SUCCESS` ve `INFO` toast'ları varsayılan olarak bastırılır; gerçekten
kullanıcıya gösterilmesi gereken durumlarda `allowInProduction: true` verilir.

`dedupeKey`, aynı iş akışının tekrar tekrar toast üretmesini engeller. Açık
`id` ile birlikte verildiğinde `dedupeKey` önceliklidir.

## Kritik persistence davranışı

Provider yalnızca geçerli kritik türleri storage'a yazar. Toast'lar refresh
sonrasında geri yüklenmez.

```text
İlk client render
  -> boş güvenli snapshot
  -> browser storage okunur
  -> kritik kayıtlar doğrulanır
  -> hydration tamamlanır
  -> persistence effect çalışır
```

Storage anahtarı `critical_notifications` değeridir. Bozuk JSON, geçersiz
critical type veya tamamen boş kayıtlar güvenli biçimde temizlenir.

Storage yardımcıları SSR-safe'tir:

```js
import { getStorageItem, removeStorageItem, setStorageItem } from '@/modules/notification';
```

Storage yazma veya okuma başarısız olursa yardımcılar exception fırlatmak
yerine sırasıyla `false` veya fallback değer döndürür. Kritik state'e token,
parola veya gereksiz kişisel veri koymayın.

## Overlay ve interaction davranışı

`NotificationContainer` bildirimleri `timestamp` değerine göre eskiden yeniye
sıralar ve `document.body` içine portal eder. Bu, sayfa stacking context'leri
ile notification layer'ın birbirine karışmasını önler.

- Auto-dismiss aktifse ve bildirim dismissible ise yatay swipe kullanılabilir.
- Swipe, 80 px offset veya 300 velocity eşiğini geçtiğinde bildirimi kapatır.
- Auto-dismiss olmayan dismissible bildirimlerde close button görünür.
- `dismissible: false` close ve swipe davranışlarını kapatır.
- `role="alert"`, `aria-atomic="true"` ve container `aria-live="polite"`
  erişilebilir geri bildirim sağlar.
- `NotificationOverlay`, title/message/description alanlarını tekrar etmeyecek
  şekilde birleştirir.

Action descriptor örneği:

```js
{
  label: 'Retry',
  onClick: retryRequest,
  dismiss: true,
  className: '...',
}
```

Action callback'i bildirim state'ini doğrudan değiştirmemeli; gerekiyorsa
`onClick` içinden domain action'ını çağırmalı ve `dismiss: false` ile bildirimi
bilinçli olarak açık bırakmalıdır.

## Global event bridge

`NotificationListener`, yalnızca uygulama kaynaklı unauthorized event'lerini
session-expired critical notification'a çevirir:

```js
globalEvents.emit(EVENT_TYPES.API_UNAUTHORIZED, {
  source: 'app',
});
```

`source` verilip `app` değilse listener olayı yok sayar. Bu filtre, farklı
katmanların aynı unauthorized event'ini kullanıcıya tekrar tekrar göstermesini
önler.

Listener cleanup sırasında event subscription kaldırılır. Bu nedenle listener
component lifecycle'ına bağlı bir effect olarak kalmalı ve global module scope'a
manuel subscription taşınmamalıdır.

## Motion interface'i

Notification motion değerleri ortak motion foundation'dan türetilir:

```js
import {
  NOTIFICATION_ACTION_TAP,
  NOTIFICATION_MICRO_SPRING,
  NOTIFICATION_WHILE_DRAG,
  toastVariants,
} from '@/modules/notification';
```

Motion token'larını `index.js` içindeki görsel katman dışında yeniden
tanımlamayın. Yeni bir bildirim
interaction'ı gerekiyorsa önce `toast.js` içindeki ortak sözleşmeye ekleyin;
ardından `index.js` içindeki görsel katmana bağlayın.

## Kullanım kuralları

1. Uygulama kodu `@/modules/notification` facade'ından import eder.
2. `NotificationProvider`, `NotificationContainer` ve `NotificationListener`
   uygulama kökünde tek kez bulunur.
3. Normal kullanıcı geri bildirimi için `useToast`, kritik kalıcı durum için
   `showNotification` kullanılır.
4. Aynı iş akışına ait tekrar eden toast'lar için stabil `dedupeKey` verilir.
5. Domain event'lerini Notification modülünde üretmeyin; module yalnızca
   mevcut event'leri tüketir.
6. Toast veya critical payload'larına secret ve gereksiz kişisel veri koymayın.
7. Custom action callback'leri kısa ve tekrar capture üretmeyecek şekilde
   tasarlanır.
8. Motion değerlerini tüketen component'lerde kopyalamayın.
9. `NotificationBadgeListener` mevcut compatibility mount noktasıdır; gerçek
   badge davranışı eklenirse ayrı bir state sözleşmesiyle belgelenmelidir.
10. Yeni suppression, persistence veya interaction davranışı characterization
    testiyle korunmalıdır.

## Test ve doğrulama

Notification odaklı regresyon testleri:

```bash
node --import ./scripts/register-alias.mjs --test \
  tests/characterization/notification-module.test.js
```

Motion ve public export kontrolü:

```bash
node --import ./scripts/register-alias.mjs --test \
  tests/characterization/motion-foundation.test.js
```

Biçim ve lint:

```bash
npx prettier --check modules/notification/*.js modules/notification/README.md
npx eslint modules/notification/*.js
```

Production derlemesi:

```bash
npm run build:webpack
```

Yeni davranış eklenirken en az şu durumlar doğrulanmalıdır:

- Storage hydration tamamlanmadan persistence yapılmaması
- Bozuk storage verisinin güvenli temizlenmesi
- Critical bildirimlerin refresh sonrasında geri gelmesi
- Toast duration ve timer replacement davranışı
- `dedupeKey` ile explicit `id` önceliği
- Production success/info suppression policy'si
- Unauthorized event source filtresi
- Listener cleanup ve tekil mount
- Dismiss, action ve swipe interaction'ları
- Public facade export'larının korunması
