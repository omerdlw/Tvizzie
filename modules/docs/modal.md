# Module: Modal

> Geçici modal yüzeylerini stack, portal, focus trap, responsive position ve kapanış sonucu sözleşmesiyle yönetir.

## 1. Genel bakış

`modules/modal`, modal component'lerini Registry üzerinden çözümler ve açık
modal'ları tek bir stack içinde render eder. Modal içeriğinin domain state'i
veya API çağrıları dışarıdaki component'e aittir; bu modül yalnızca içeriğin
yerleşimini ve yaşam döngüsünü yönetir.

## 2. Sorumluluklar

### Sahip olduğu kararlar

- Modal stack state ve üst modal seçimi
- Registry key'inden modal component'i çözümleme
- Portal, backdrop, z-index ve panel/bare chrome
- Center, top, bottom, left ve right responsive position'ları
- Header, footer, close ve action slot'ları
- Escape, backdrop, close button, `closeModal` ve `closeAllModals`
- Focus başlangıcı, Tab trap ve modal öncesi focus'a dönüş
- Smooth-scroll lock event lifecycle'ı
- Header fallback ve motion token'ları

### Sahip olmadığı kararlar

- Modal component'ini Registry'ye kaydetmek
- Modal içeriğinin domain state'i veya request'leri
- Authentication veya route navigation kararı
- Ürün-specific modal başlığı dışında genel fallback kuralları

## 3. Dosya sahipliği

| Dosya        | Sahip olduğu implementasyon                                         | Public mi? |
| ------------ | ------------------------------------------------------------------- | ---------- |
| `index.js`   | `Modal`, `Container`, `ModalProvider` composition ve renderer       | Evet       |
| `config.js`  | Position/chrome/preset/header config ve fallback resolver'lar       | Dolaylı    |
| `runtime.js` | Stack state, open/close Promise'leri, focus ve responsive lifecycle | Dolaylı    |
| `motion.js`  | Modal variant, spring, tap ve class token'ları                      | Dolaylı    |

## 4. Kurulum

Provider Registry provider'ın altında uygulama kökünde bir kez mount edilir:

```jsx
<RegistryProvider>
  <ModalProvider>{children}</ModalProvider>
</RegistryProvider>
```

Modal component kayıtları feature lifecycle'ında yapılır. `ModalProvider`,
Registry'de component bulunmayan key'i görünür layer olarak render etmez.

## 5. Public interface

### 5.1 Runtime ve layout

| Export                         | Kullanım                                     |
| ------------------------------ | -------------------------------------------- |
| `ModalProvider`                | Modal action/state context'leri ve renderer  |
| `Modal`                        | Aktif stack entry'sini render eden ana yüzey |
| `Container` / `ModalContainer` | Ortak header/body/footer layout primitive'i  |
| `useModal`                     | State ve action aggregate'i                  |
| `useModalActions`              | `openModal`, `closeModal`, `closeAllModals`  |
| `useModalState`                | Stack/state read-only facade'ı               |

### 5.2 Config ve motion

Config export'ları `MODAL_POSITIONS`, `MODAL_POSITION_CLASSES`, `MODAL_CHROME`,
`MODAL_BREAKPOINTS`, `MODAL_PRESETS`, `MODAL_LABELS`,
`resolveAuthVerificationHeader`, `resolveModalHeader`'dır.

Motion export'ları `ACTION_BUTTON_CLASS`, `CANCEL_BUTTON_CLASS`,
`MODAL_BACKDROP_VARIANTS`, `MODAL_CONTENT_STAGGER`,
`MODAL_CONTENT_VARIANTS`, `MODAL_FOOTER_VARIANTS`, `MODAL_HEADER_VARIANTS`,
`MODAL_LIST_ITEM_VARIANTS`, `MODAL_LIST_VARIANTS`, `MODAL_MICRO_SPRING`,
`MODAL_MICRO_TAP`, `MODAL_MICRO_TAP_SCALE`, `MODAL_PANEL_SPRING`,
`MODAL_POSITION_VARIANTS`, `MODAL_STACK_OVERLAY_CLASS`,
`getModalPositionVariants`, `getModalTransition` ve `modalBackdropVariants`'tır.

## 6. Sözleşmeler ve kullanım örnekleri

### 6.1 Modal açma ve kapatma

```jsx
import { useModal } from '@/modules/modal';
import { Button } from '@/ui/primitives';

function PreviewButton({ movie }) {
  const { openModal } = useModal();

  async function openPreview() {
    const result = await openModal('PREVIEW_MODAL', 'center', {
      data: { movie },
      header: { title: movie.title, showClose: true },
      onClose: (closeResult) => {
        console.log('preview closed', closeResult);
      },
    });

    if (result?.confirmed) refreshMovie(movie.id);
  }

  return <Button onClick={openPreview}>Preview</Button>;
}
```

`openModal(modalType, position, config)` Promise döndürür. Modal
`closeModal(result)` veya `closeAllModals(result)` ile kapanınca Promise ve
`onClose` aynı result ile tamamlanır. `closeModal(result, modalId)` belirli bir
stack entry'sini kapatır; id verilmezse üst modal kapanır.

### 6.2 Responsive position

```jsx
import { useModalActions } from '@/modules/modal';
import { Button } from '@/ui/primitives';

function ListEditorTrigger({ initialData }) {
  const { openModal } = useModalActions();

  return (
    <Button
      onClick={() =>
        openModal(
          'LIST_EDITOR_MODAL',
          { mobile: 'bottom', desktop: 'center' },
          {
            data: { initialData },
            responsivePosition: { mobile: 'bottom', desktop: 'right' },
          },
        )
      }
    >
      Edit list
    </Button>
  );
}
```

Position string veya `{ mobile, desktop }` descriptor olabilir. Config içindeki
`responsivePosition`, ikinci parametredeki responsive descriptor'a göre
önceliklidir. Geçersiz position center'a normalize edilir.

### 6.3 Modal component kaydı

```jsx
import { useModalRegistration } from '@/modules/registry';
import { Button } from '@/ui/primitives';

function PreviewModal({ data, close }) {
  return <Button onClick={() => close({ confirmed: true })}>{data.movie.title}</Button>;
}

export function PreviewModalRegistration() {
  useModalRegistration(
    { PREVIEW_MODAL: PreviewModal },
    {
      source: 'media-feature',
      priority: 100,
    },
  );

  return null;
}
```

Registry kayıt lifecycle'ı ile `openModal` çağrısının lifecycle'ı aynı feature
sınırında tutulmalıdır.

### 6.4 Config alanları

```js
{
  data: { movie },
  header: {
    title: 'Preview',
    actions: ({ close }) => <HeaderActions onClose={() => close()} />,
    showClose: true,
  },
  title: 'Fallback title',
  actions: [],
  showClose: true,
  chrome: 'panel',
  responsivePosition: { mobile: 'bottom', desktop: 'center' },
  onClose: (result) => {},
}
```

`data`, modal component'ine payload olarak gider. `data` yoksa geriye dönük
uyumluluk için config object'i payload olarak iletilir. Header önceliği:

```text
config.header -> config kısa form alanları -> modal type fallback'i
```

Tanımlı fallback'ler auth verification purpose, follow list type, list editor
edit/create, notifications, social proof ve review editor başlıklarını çözer.

### 6.5 Container layout

```jsx
<Container
  header={{ title: 'Preview', showClose: true }}
  footer={{ left: <CancelButton />, right: <SaveButton />, sticky: true }}
  bodyClassName="p-4"
  close={close}
>
  {children}
</Container>
```

Header/footer `left`, `center`, `right`, `sticky` slot'larını destekler.
`header={false}` veya `footer={false}` ilgili bölgeyi kapatır. Header React node
olarak da verilebilir. Container explicit height constraint yoksa panel için
güvenli max-height uygular; side modal'lar full-height çalışır.

## 7. Yaşam döngüsü

```text
openModal(type, position, config)
  -> preset + config merge
  -> responsive position + header resolution
  -> stack entry + Promise
  -> Modal portal + Registry component
  -> closeModal(result)
  -> stack update + onClose + Promise resolve
```

- Aynı type üstteyse yeni modal açılmaz ve Promise `null` ile çözülür.
- Aynı type stack'in altında varsa eski entry kapanır, yeni entry üste alınır.
- Farklı type'lar stack'e eklenir; üst modal kapanınca alttaki aktive olur.
- Backdrop, Escape ve close button yalnızca üst modalı kapatır.
- Stack tamamen kapandığında smooth-scroll lock kaldırılır.
- Callback veya Promise reddi close lifecycle'ını bozmaz; hata güvenli biçimde raporlanır.

## 8. Sınırlar, erişilebilirlik ve performans

- Modal layer `role="dialog"`, üst modal `aria-modal="true"` taşır.
- Header title varsa `aria-labelledby` otomatik bağlanır.
- İlk focus modal içindeki focusable element'e gider; Tab/Shift+Tab trap edilir.
- Escape yalnızca üst modalı kapatır.
- Modal öncesi body overflow değeri korunur ve son modal kapanınca geri yüklenir.
- Portal target client mount sonrasında çözülür; SSR sırasında `document` okunmaz.
- Responsive viewport tek `matchMedia` lifecycle'ı ile izlenir.
- Modal içeriği `ModuleError` ile izole edilir.

## 9. Kurallar

1. Uygulama kodu `@/modules/modal` facade'ından import etmelidir.
2. Modal provider ve Registry provider sırasını koruyun.
3. Domain payload'ını `data` altında taşıyın; control alanlarını payload'a karıştırmayın.
4. Modal key'ini component kaydıyla aynı feature lifecycle'ında yönetin.
5. Aynı modal type'ını tekrar açma davranışının `null` sonucunu hesaba katın.
6. Header fallback'lerini domain action'larıyla karıştırmayın.
7. Yeni position, header veya motion export'u eklenirse facade ve bu belge
   birlikte güncellenmelidir.

## 10. Doğrulama

```bash
npx prettier --check modules/modal/*.js modules/docs/modal.md
npx eslint modules/modal/*.js
node --import ./scripts/register-alias.mjs --test \
  tests/characterization/nav-surface.test.js
npm run build:webpack
```

Test kapsamı: stack precedence, duplicate type, Promise/onClose result'i,
responsive position, Registry component resolution, header priority, focus
trap, Escape/backdrop close, smooth-scroll cleanup, portal SSR safety ve
content error isolation.
