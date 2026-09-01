# Module: Notification

> Kritik bildirimleri ve kısa süreli toast'ları state, persistence, event bridge ve erişilebilir overlay lifecycle'ıyla yönetir.

## 1. Genel bakış

`modules/notification`, üreticilerin yalnızca normalize edilmiş bir notification
veya toast interface'i kullanmasını sağlar. State, timer, browser storage,
portal, swipe-dismiss ve unauthorized event bridge tek provider ağacında birleşir.

## 2. Sorumluluklar

### Sahip olduğu kararlar

- Critical ve toast state'ini tutmak
- Critical bildirimleri refresh sonrasında hydrate etmek
- Toast message normalization, duration ve suppression policy'si
- Timer replacement, dedupe ve dismiss lifecycle'ı
- Portal overlay, action, close ve swipe interaction'ları
- `API_UNAUTHORIZED` event'ini session-expired notification'a çevirmek
- Motion variant ve interaction token'larını sunmak

### Sahip olmadığı kararlar

- Domain event'ini üretmek veya backend notification persistence'ı
- Auth/session state'ini yönetmek
- Navigation state'ini değiştirmek
- Ürün mesajlarının veya domain copy'sinin kaynağı olmak

## 3. Dosya sahipliği

| Dosya       | Sahip olduğu implementasyon                        | Public mi? |
| ----------- | -------------------------------------------------- | ---------- |
| `index.js`  | Overlay, container, listener ve public facade      | Evet       |
| `store.js`  | Provider, state, storage ve critical persistence   | Dolaylı    |
| `toast.js`  | `useToast`, duration, suppression ve dedupe policy | Dolaylı    |
| `motion.js` | Toast/content/drag/tap motion sözleşmesi           | Dolaylı    |

Görsel notification render'ı `index.js` içinde kalır; ayrıca `view.js` yoktur.
`NotificationBadgeListener` public compatibility hook'u olarak no-op'tur.

## 4. Kurulum

Provider, listener ve container uygulama kökünde birer kez mount edilmelidir:

```jsx
<NotificationProvider>
  <NotificationListener />
  <NotificationContainer />
  {children}
</NotificationProvider>
```

`NotificationListener` route layout'larında tekrar mount edilmemelidir; aksi
halde tek event birden fazla notification üretebilir. `NotificationBadgeListener`
mevcut feature layout'larında compatibility için mount edilebilir fakat state
veya listener kurmaz.

## 5. Public interface

| Grup            | Export'lar                                                                     |
| --------------- | ------------------------------------------------------------------------------ |
| Provider/render | `NotificationProvider`, `NotificationContainer`, `NotificationOverlay`         |
| Global bridge   | `NotificationListener`, `NotificationBadgeListener`                            |
| State/action    | `useNotificationState`, `useNotificationActions`                               |
| Toast           | `useToast`                                                                     |
| Tür/config      | `CRITICAL_TYPES`, `TOAST_TYPES`, `NOTIFICATION_CONFIG`                         |
| Storage         | `getStorageItem`, `setStorageItem`, `removeStorageItem`                        |
| Motion          | `toastVariants`, `notificationContentVariants` ve `NOTIFICATION_*` export'ları |

`useNotificationState()` normalized `notifications` ve hydration state'ini;
`useNotificationActions()` ise `showNotification` ve `dismissNotification`
başta olmak üzere store action'larını döndürür.

## 6. Sözleşmeler ve kullanım örnekleri

### 6.1 Bildirim türleri

Critical türler: `PERMISSION_DENIED`, `SESSION_EXPIRED`, `SERVER_ERROR`,
`OFFLINE`.

Toast türleri: `SUCCESS`, `WARNING`, `ERROR`, `INFO`.

Critical notification yalnızca `CRITICAL_TYPES` içindeyse storage'a yazılır;
toast'lar refresh sonrasında geri yüklenmez.

### 6.2 `useToast` kullanımı

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
        description: 'Try again in a moment.',
      });
    }
  }

  return <Button onClick={save}>Save</Button>;
}
```

Method'lar:

- `success(message, options)`: default 3000 ms
- `warning(message, options)`: default 4000 ms
- `error(message, options)`: default 4000 ms
- `info(message, options)`: default 3000 ms
- `show(type, message, options)`: caller duration'ı belirler

Toast options: `action`, `actions`, `allowInProduction`, `dedupeKey`, `description`,
`duration`, `id`, `title`, `icon`, `dismissible`, `theme` ve diğer notification
presentation alanlarıdır. `dedupeKey`, explicit `id` verilse bile önceliklidir.

Mesajlar `normalizeFeedbackText` ile normalize edilir. Boş mesajlar ve policy
tarafından bastırılan beklenen mesajlar gösterilmez. Production'da success/info
toast'ları varsayılan olarak bastırılır; gerekli durumlarda
`allowInProduction: true` verilir.

### 6.3 Düşük seviye notification

```jsx
import { CRITICAL_TYPES, useNotificationActions } from '@/modules/notification';
import { Button } from '@/ui/primitives';

function OfflineBridge() {
  const { showNotification, dismissNotification } = useNotificationActions();

  function showOffline() {
    showNotification(CRITICAL_TYPES.OFFLINE, {
      id: 'network-offline',
      message: 'You are currently offline',
      dismissible: true,
    });
  }

  return (
    <>
      <Button onClick={showOffline}>Show offline state</Button>
      <Button onClick={() => dismissNotification('network-offline')}>Dismiss</Button>
    </>
  );
}
```

`showNotification(type, data)` temel olarak `id`, `message`, `description`,
`duration`, `title`, `icon`, `actions`, `dismissible`, `theme` ve
`actionToneClass` alanlarını kabul eder. Bu düşük seviye interface toast
suppression policy'sini otomatik olarak uygulamaz.

### 6.4 Action descriptor

```js
{
  label: 'Retry',
  onClick: retryRequest,
  dismiss: true,
  className: 'custom-action-class',
}
```

`dismiss: false` verilirse action sonrası notification açık kalır.

### 6.5 Storage yardımcıları

```js
import { getStorageItem, removeStorageItem, setStorageItem } from '@/modules/notification';

const value = getStorageItem('feature-state', { ready: false });
setStorageItem('feature-state', { ready: true });
removeStorageItem('feature-state');
```

Yardımcılar SSR-safe'tir. Browser storage kullanılamazsa okuma fallback döner;
yazma/çıkarma exception fırlatmak yerine güvenli sonuç verir.

### 6.6 Motion

```js
import {
  NOTIFICATION_ACTION_TAP,
  NOTIFICATION_MICRO_SPRING,
  NOTIFICATION_WHILE_DRAG,
  toastVariants,
} from '@/modules/notification';
```

Motion değerlerini feature component'lerinde yeniden tanımlamayın.

## 7. Yaşam döngüsü

```text
useToast / useNotificationActions
  -> NotificationProvider
     -> normalize + dedupe + timer
     -> critical persistence
  -> NotificationContainer
     -> timestamp sort
     -> portal(document.body)
     -> AnimatePresence + drag
```

- İlk client render güvenli boş snapshot ile başlar.
- Storage hydrate edildikten sonra persistence effect'i etkinleşir.
- Aynı notification id mevcut kaydı günceller; `dedupeKey` stabil state key'idir.
- Auto-dismiss aktif ve notification dismissible ise yatay swipe kullanılabilir.
- Swipe 80 px offset veya 300 velocity eşiğini geçince dismiss olur.
- Auto-dismiss olmayan dismissible notification'da close button görünür.
- `NotificationListener`, `API_UNAUTHORIZED` ve `source: 'app'` event'ini
  session-expired critical notification'a dönüştürür.
- Listener cleanup sırasında global subscription kaldırılır.

## 8. Sınırlar, erişilebilirlik ve performans

- Container `aria-live="polite"`; overlay `role="alert"` ve `aria-atomic="true"` taşır.
- Notification container `document.body` içine portal edilir; page stacking context'lerinden ayrıdır.
- Critical storage anahtarı `critical_notifications`'tır.
- Bozuk JSON, geçersiz critical type ve boş kayıt güvenli biçimde temizlenir.
- State ve action context'leri ayrıdır.
- Secret, token ve gereksiz kişisel veri notification payload'ına konulmamalıdır.

## 9. Kurallar

1. Provider, container ve global listener'ı root'ta tek kez mount edin.
2. Normal kullanıcı feedback'i için `useToast`, kalıcı kritik durum için
   `showNotification` kullanın.
3. Tekrarlayan aynı iş akışlarında stabil `dedupeKey` kullanın.
4. Domain event'lerini bu modülde üretmeyin; yalnızca event bridge olarak tüketin.
5. Action callback'lerinde notification state'ini doğrudan mutate etmeyin.
6. `NotificationBadgeListener`'ı gerçek state sahibiymiş gibi kullanmayın.
7. Yeni suppression, persistence veya interaction davranışını test ve bu belge
   ile birlikte güncelleyin.

## 10. Doğrulama

```bash
npx prettier --check modules/notification/*.js modules/docs/notification.md
npx eslint modules/notification/*.js
node --import ./scripts/register-alias.mjs --test \
  tests/characterization/notification-module.test.js \
  tests/characterization/motion-foundation.test.js
npm run build:webpack
```

Test kapsamı: hydration/persistence, bozuk storage, duration/timer replacement,
dedupe, production suppression, unauthorized source filtresi, listener cleanup,
dismiss/action/swipe interaction'ları ve public export'lar.
