# Nav

Nav modülü, uygulamanın alt merkezli kart navigasyonunu ve bu kartın runtime sırasında değişen içerik, aksiyon, overlay ve durumlarını yönetir. Statik nav öğelerini `config/nav.config.js` içinden alır, sayfa bazlı dinamik alanları ise `useRegistry({ nav: ... })` ile birleştirir.

`app/layout.js` içinde `<DynamicNav />`, `app/providers.js` içinde `<NavigationProvider>` ile çalışır.

## Sorumluluklar

- Aktif route’u Nav içinde öne çıkarmak
- Statik ve dinamik nav payload’larını tek kayıt üzerinde birleştirmek
- Kartın standart görünümünü, status overlay’lerini, confirmation overlay’lerini ve mask render modunu çözmek
- Sağ üst `actions` ikonlarını ve alt bölümdeki `action` alanını yönetmek
- Kart yüksekliğini içerik yüksekliğine göre dinamik hesaplamak
- Arama, expand/collapse, keyboard navigation ve parent/child stack davranışlarını yürütmek

## Veri Kaynakları

Nav verisi iki kaynaktan gelir:

1. `config/nav.config.js`
2. `useRegistry({ nav: ... })`

Registry tarafında Nav kayıtları `REGISTRY_TYPES.NAV` namespace’ine yazılır ve aynı `path` için merge edilir. Kaynak önceliği registry sistemi tarafından yönetilir; bu sayede statik kayıt, dinamik kayıt ve gerekirse `user` source override aynı anahtar üzerinde birleşebilir.

## useRegistry Sözleşmesi

Sayfa veya bileşen bazında Nav kartını güncellemek için:

```js
useRegistry({
  nav: {
    path: '/profile',
    title: 'Profile',
    description: 'Manage your account',
    icon: 'solar:user-circle-bold',
    actions: [
      {
        key: 'search',
        icon: 'solar:magnifer-linear',
        tooltip: 'Search',
        onClick: (event) => {
          event.stopPropagation()
        },
      },
    ],
    action: <ProfileAction />,
  },
})
```

Desteklenen başlıca alanlar:

- `path`: kaydın bağlandığı route anahtarı. Verilmezse mevcut pathname kullanılır.
- `title`: kart başlığı
- `description`: string veya React node
- `icon`: iconify adı, React node veya URL
- `style`: kart/icon/title/description/shortcutBadge bölümlerine uygulanacak stil nesnesi
- `isLoading`: skeleton görünümü
- `actions`: sağ üst icon aksiyonları
- `action`: kart altındaki action bölümü
- `confirmation`: built-in confirmation overlay payload’ı
- `mask`: standart body yerine render edilecek React node
- `hideSettings`, `hideScroll`, `mediaAction`: mevcut Nav davranışlarını ince ayarlayan yardımcı alanlar

## Render Modları

Nav aynı anda tek bir aktif öğe render eder; fakat o öğenin görünüm modu payload’a göre değişir.

Çözümleme önceliği:

1. `status`
2. `confirmation`
3. `mask`
4. `standard`

### Standard

Normal kart görünümüdür.

- `Icon`, `Title`, `Description` render edilir
- Sağ üst `actions` ikonları görünür
- Alt `action` bölümü varsa kartın altında render edilir

### Confirmation

`nav.confirmation` varsa aktif kart overlay moduna geçer.

- Kart aktif kalır, sayfa blur olur
- Aktif kartın arkasındaki stack görünmeye devam eder
- `Icon`, `Title`, `Description` aynı primitive’lerle render edilir
- Sadece layout değişir: body dikey akışa döner
- Alt bölümde built-in `confirmation-action` render edilir
- Sağ üst `actions` ikonları kapatılır

`confirmation` payload alanları:

```js
confirmation: {
  title: 'Delete item?',
  description: 'This action cannot be undone.',
  icon: 'solar:danger-triangle-bold',
  confirmText: 'Delete',
  cancelText: 'Cancel',
  isDestructive: true,
  tone: 'danger', // opsiyonel
  onConfirm: async () => {},
  onCancel: () => {},
}
```

Davranış:

- `onConfirm` sync ise işlem sonrası confirmation kapanır
- `onConfirm` promise dönerse confirm butonu pending olur, cancel disable olur
- promise reject olursa confirmation açık kalır
- dismissal instance bazlı anahtarla tutulur; aynı metin içeriğine sahip yeni confirmation’lar yanlışlıkla bastırılmaz

### Mask

`nav.mask` varsa kart body’si tamamen mask içeriği ile değiştirilir.

- Container korunur
- Standart `title`, `description`, `icon` bölümü kaldırılır
- Sağ üst `actions` ikonları kapatılır
- Alt `action` bölümü çalışmaya devam eder

Bu mod, kart içine tamamen özel JSX yerleştirmek için kullanılır.

### Status

`useNavigationStatus()` tarafından üretilen overlay modudur. Global event’lerden beslenir.

Mevcut status tipleri:

- `ACCOUNT_DELETE`
- `LOGIN`
- `LOGOUT`
- `APP_ERROR`
- `API_ERROR`
- `OFFLINE`
- `ONLINE`

`STATUS_PRIORITY` yüksek olan düşük olanı ezer. Status overlay aktifken sayfa blur olur ve arka stack görünmeye devam eder.

Error status davranışı:

- `APP_ERROR` ve `API_ERROR` için alt `action` alanında `Retry` ve `Refresh`
- `APP_ERROR` ve `API_ERROR` için sağ üst `actions` tarafında `Info` ikonu
- Diğer status tiplerinde `action` ve `actions` görünmez

## Layout ve Yükseklik

Nav kartı sabit yükseklik yerine ölçüm tabanlı çalışır.

- Kart body yüksekliği `ResizeObserver` ile ölçülür
- Alt `action` yüksekliği ayrı ölçülür
- Toplam yükseklik: `body + card chrome + action + gap`
- Böylece confirmation, mask ve dinamik action içerikleri kartı doğru yükseklikte tutar

Bu mantık özellikle test sayfası ve çok satırlı confirmation açıklamalarında önemlidir.

## Stack Davranışı

Collapsed durumda Nav her zaman tek kart göstermez.

Arka stack’in gösterildiği durumlar:

- home route (`/`)
- hover
- confirmation overlay
- herhangi bir status overlay

Varsayılan görünür stack limiti `MAX_VISIBLE_STACKED_CARDS = 3`.

## Keyboard ve Etkileşim

Expanded Nav modunda:

- `ArrowUp/ArrowDown`: öğeler arasında gezinir
- `Enter`: odaklanan öğeye navigate eder
- `Escape`: expanded görünümü kapatır

Overlay aktifken keyboard navigation devre dışıdır; böylece alttaki Nav öğeleri confirmation/status sırasında tetiklenmez.

`useClickOutside` ile dış tıklama collapse yapar; ancak overlay modlarında dış tıklama Nav’ı kapatmaz.

## Hook’lar

Sık kullanılan hook’lar:

- `useNavigation()`: aktif item, display items, expand state ve navigation aksiyonları
- `useNavHeight()`: sayfa altında gerekli boşluğu bırakmak için Nav yüksekliği
- `useNavigationDisplay()`: aktif item + display çözümleme katmanı
- `useActionComponent()`: `action` payload’ını render node’a çevirir

Örnek:

```js
const { activeItem, expanded, navigationItems, setExpanded } = useNavigation()
const { navHeight } = useNavHeight()
```

## Global Event Entegrasyonu

Status overlay’leri `globalEvents` üzerinden tetiklenir.

Örnek event’ler:

- `EVENT_TYPES.API_ERROR`
- `EVENT_TYPES.APP_ERROR`
- `EVENT_TYPES.AUTH_SIGN_IN`
- `EVENT_TYPES.AUTH_SIGN_OUT`
- browser `online` / `offline`

Bu event’ler doğrudan `useNavigationStatus()` içinde Nav payload’ına dönüştürülür.

## Test ve Gözlem

`/nav-test` route’u Nav modülü için ayrılmış kapsamlı test yüzeyidir.

Bu sayfa ile şunlar test edilir:

- standart body
- dynamic action yüksekliği
- confirmation overlay
- mask render
- status priority
- registry merge
- stack görünümü
- blur/focus davranışı

## Dikkat Edilmesi Gerekenler

- `description` string olmak zorunda değildir; arama filtresi React node içeriğini de güvenli biçimde metne çevirir
- `confirmation` durumunda consumer tarafının state’i gerçekten temizlemesi tavsiye edilir; built-in dismissal yalnız görünürlüğü kontrol eder
- `mask` aktifken header `actions` görünmez
- status overlay’lerde action/icon görünürlüğü type bazlıdır; her status için otomatik açılmaz
