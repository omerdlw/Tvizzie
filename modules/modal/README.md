# Modal

`modules/modal`, uygulamadaki geçici modal yüzeylerini tek bir stack, portal ve
erişilebilirlik akışı altında yönetir. Modül; modal açma/kapatma sözleşmesini,
header çözümlemesini, responsive konumlandırmayı, focus trap'i, scroll-lock'ı,
motion token'larını ve Registry üzerinden component çözümlemesini birlikte
sağlar.

Bu belge mevcut public API ve runtime davranışına göre hazırlanmıştır. Modal
modülü domain verisinin sahibi değildir; yalnızca kendisine verilen component ve
payload'ı yaşam döngüsüyle birlikte sunar.

## Sorumluluk sınırı

Modal şu sorumlulukları üstlenir:

- Açık modalları deterministik bir stack içinde tutmak
- Registry key'i üzerinden modal component'ini çözümlemek
- Portal, backdrop, z-index ve panel chrome davranışını yönetmek
- Center, edge ve side konumlarını responsive biçimde uygulamak
- Header, footer, close ve action slot'larını ortaklaştırmak
- Escape, backdrop, close action ve stacked modal geçişlerini yönetmek
- Üst modal için focus başlangıcı ve Tab focus trap sağlamak
- Smooth-scroll kilidini modal görünürlüğüyle senkron tutmak
- Ortak modal motion variant ve interaction token'larını yayınlamak

Şunlar bu modülün sorumluluğu değildir:

- Modal içeriğinin domain state'ini veya API çağrılarını yönetmek
- Modal component'lerini Registry'ye kaydetmek
- Route navigation veya authentication akışına karar vermek
- Her modal için özel ürün tasarımını genelleştirmek

## Dosya haritası

### `index.js`

Public facade, provider, hook'lar ve görsel modal katmanıdır. `Container`,
`Modal`, `ModalProvider`, motion export'ları ve uyumluluk alias'ları burada
kalır. Görünüm ayrı bir `view.js` dosyasına bölünmemiştir; modülün tüketicisi
tek bir giriş noktasını kullanır.

### `config.js`

Modal'ın data-only sözleşmesini içerir:

- `MODAL_POSITIONS`, `MODAL_CHROME`, breakpoint ve preset sabitleri
- Position class ve label haritaları
- Auth, follow list, list editor, notification ve review header resolver'ları
- `resolveModalHeader` öncelik kuralı

### `runtime.js`

Render üretmeyen runtime yardımcılarının sahibidir:

- Context fallback'leri ve başlangıç state'i
- Stack state derivation ve close finalization
- Responsive position normalization
- Focusable element keşfi ve focus trap
- Modal label ve position predicate'leri
- Smooth-scroll event adı

## Mimari akış

```text
Feature veya command
  -> useModal().openModal(type, position, config)
     -> preset + config merge
     -> header ve responsive position resolution
     -> modal stack state

ModalProvider
  -> Modal portal
     -> useModalRegistry().get(modalType)
     -> ModuleError
     -> ModalLayer + backdrop + focus trap

closeModal / closeAllModals
  -> stack update
  -> onClose callback
  -> openModal Promise resolve
```

Provider, uygulama kökünde bir kez mount edilir. Modal component'leri ayrıca
Registry'ye kaydedilir:

```jsx
<ModalProvider>{children}</ModalProvider>
```

Registry kaydı feature'ın lifecycle sınırında yapılmalıdır. Modal provider
Registry'de bulunmayan key'i görünür bir layer olarak render etmez; bu nedenle
key ile component kaydının aynı lifecycle içinde hazır olması gerekir.

## Public API

```js
import { Container, ModalProvider, MODAL_POSITIONS, useModal } from '@/modules/modal';
```

| İhtiyaç                     | Interface                                          |
| --------------------------- | -------------------------------------------------- |
| Provider                    | `ModalProvider`                                    |
| Birleşik state/action okuma | `useModal`                                         |
| Yalnızca action             | `useModalActions`                                  |
| Yalnızca state              | `useModalState`                                    |
| İçerik layout'u             | `Container` / `ModalContainer`                     |
| Konum ve chrome             | `MODAL_POSITIONS`, `MODAL_CHROME`                  |
| Header fallback'i           | `resolveModalHeader`                               |
| Motion                      | `MODAL_*` token'ları ve `getModalPositionVariants` |

## Modal açma ve kapatma

```js
const { openModal, closeModal } = useModal();

function openPreview(movie) {
  return openModal('PREVIEW_MODAL', 'center', {
    data: { movie },
    onClose: (result) => {
      // Modal kapanış sonucunu tüket
    },
  });
}
```

`openModal` bir Promise döndürür. Modal `closeModal(result)` veya
`closeAllModals(result)` ile kapandığında Promise, verilen result ile çözülür.
`onClose` callback'i aynı kapanışta çalışır.

Aynı `modalType` zaten stack'in en üstündeyse yeni bir modal açılmaz ve `null`
ile çözülen bir Promise döner. Aynı type stack'in daha altında varsa eski kayıt
temizlenir ve yeni kayıt en üste eklenir. Farklı modal type'ları stack'e eklenir;
üst modal kapanınca alttaki modal yeniden aktif olur.

`closeModal(result, modalId)` belirli bir stack entry'sini kapatabilir.
Parametre verilmezse üst modal kapanır. Backdrop, Escape ve close button yalnızca
üst modalı kapatır.

## Config sözleşmesi

```js
openModal(
  'LIST_EDITOR_MODAL',
  {
    mobile: 'bottom',
    desktop: 'center',
  },
  {
    data: { initialData },
    header: {
      title: 'Edit list',
      showClose: true,
    },
  },
);
```

İkinci parametre string position veya `{ mobile, desktop }` responsive position
descriptor'ı olabilir. `config.responsivePosition` verilirse position
descriptor'ına göre önceliklidir.

Önemli config alanları:

- `data`: Modal component'ine `data` prop'u olarak iletilen payload
- `header`: `title`, `actions`, `showClose` ve slot override'ları
- `title`, `actions`, `showClose`: header için kısa form alanları
- `chrome`: `MODAL_CHROME.PANEL` veya `MODAL_CHROME.BARE`
- `onClose`: kapanış result'ını alan callback
- `responsivePosition`: viewport'a göre position override'ı

`data` verilmezse mevcut geriye dönük davranış korunur ve config nesnesi
component'e payload olarak iletilir. Yeni çağrılarda kontrol alanları ile
domain payload'ını ayırmak için `data` kullanılması önerilir.

Header önceliği şöyledir:

```text
config.header alanı -> config kısa form alanı -> modal type fallback'i
```

Örneğin auth verification purpose, list editor `initialData.id` ve review
subject bilgisi otomatik başlık üretiminde kullanılır.

## Container layout'u

`Container`, modal içeriğini ortak header/body/footer bölgelerine ayırır:

```jsx
<Container
  header={{ title: 'Preview', showClose: true }}
  footer={{ right: <Button>Save</Button>, sticky: true }}
  bodyClassName="p-4"
  close={close}
>
  {children}
</Container>
```

Header ve footer `left`, `center`, `right`, `sticky` slot'larını destekler.
Header React node olarak verilirse özel header kabul edilir. `header={false}`
header'ı tamamen kapatır; `footer={false}` footer'ı kapatır.

## Erişilebilirlik ve yaşam döngüsü

- Modal layer `role="dialog"` taşır.
- Başlık varsa `aria-labelledby` otomatik bağlanır.
- Üst modal `aria-modal="true"` olur; alttaki layer'lar pasif kalır.
- Üst modal açıldığında ilk focusable element focus alır.
- Tab ve Shift+Tab, modal içindeki focusable elementler arasında döner.
- Escape yalnızca üst modalı kapatır.
- Modal görünürken smooth scroll provider'a `source: 'modal'` lock event'i
  gönderilir.
- Body'nin modal öncesi inline `overflow` değeri korunur ve modal tamamen
  kapandığında geri yüklenir.

Modal içeriği kendi içinde hata üretirse `ModuleError` ile izole edilir; bu,
diğer uygulama katmanlarının modal render hatası nedeniyle kaybolmasını önler.

## Motion ve performans

Motion sabitleri `MOTION_EASINGS` ve `MOTION_SPRINGS` temelinden türetilir.
Public `MODAL_*` variant'ları feature component'lerinde tekrar tanımlanmamalıdır.
Portal yalnızca client mount sonrasında oluşturulur; server render sırasında
`document.body` okunmaz.

Stack state tek bir provider'da tutulur. Modal layer'ları yalnızca Registry'de
component'i bulunan entry'ler için render edilir. Responsive viewport değişimi
tek bir `matchMedia` aboneliğiyle izlenir ve eski `addListener` API'si de
desteklenir.

## Kurallar

1. Yeni tüketiciler `@/modules/modal` facade'ından import eder.
2. Modal component'i ve Registry key'i feature lifecycle'ında birlikte yönetilir.
3. Domain payload'ı `data` altında taşınır; header/position/chrome kontrol alanları
   payload'a karıştırılmaz.
4. Aynı modal type'ını yeniden açmak yerine mevcut Promise ve stack davranışı
   dikkate alınır.
5. Yeni header fallback'i veya public motion token'ı eklenirse contract testi ve
   bu dokümandaki API tablosu birlikte güncellenir.
