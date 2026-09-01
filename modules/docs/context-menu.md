# Module: Context Menu

> Native `contextmenu` olayını Registry adaylarına çevirir, en uygun menüyü seçer ve erişilebilir portal yüzeyi olarak render eder.

## 1. Genel bakış

`modules/context-menu`, sağ tık veya klavye ile açılan bağlamsal menülerin
selection, item normalization, konumlandırma ve browser lifecycle'ını yönetir.
Domain action'ları menü config'inden callback olarak gelir; modül bu action'ların
iş kuralını bilmez.

## 2. Sorumluluklar

### Sahip olduğu kararlar

- Native `contextmenu` event'ini yakalamak ve Registry adaylarını değerlendirmek
- Path, target, `when`, `enabled` ve `priority` kurallarını uygulamak
- Candidate skorlamak, context/payload üretmek ve page metadata eklemek
- Function-valued item alanlarını çözmek
- Hidden item'ları ayıklamak ve separator'ları compact etmek
- Menu'yu viewport içinde konumlandırmak
- Portal, focus, keyboard navigation, outside click, Escape ve scroll lock'ı yönetmek
- Pop/content/item/press motion token'larını yayınlamak

### Sahip olmadığı kararlar

- Menu item callback'lerinin domain davranışı
- Registry kaydının ne zaman veya hangi feature tarafından yapılacağı
- Navigation state'in değiştirilmesi
- Menü içeriğinin backend veya server state'i

## 3. Dosya sahipliği

| Dosya         | Sahip olduğu implementasyon                                            | Public mi? |
| ------------- | ---------------------------------------------------------------------- | ---------- |
| `index.js`    | Facade, header/item render'ı, portal ve `ContextMenuGlobal`            | Evet       |
| `resolver.js` | Candidate selection, item/header normalization ve position helper'ları | Dolaylı    |
| `runtime.js`  | Provider, native event listener ve open/close lifecycle                | Dolaylı    |
| `motion.js`   | Context menu motion ve transition token'ları                           | Dolaylı    |

## 4. Kurulum

Registry provider'ın altında bir `ContextMenuProvider` ve tek bir global
renderer mount edilir:

```jsx
<RegistryProvider>
  <ContextMenuProvider>
    {children}
    <ContextMenuGlobal />
  </ContextMenuProvider>
</RegistryProvider>
```

`ContextMenuGlobal`, runtime listener ve renderer'ı birlikte kurar. Aynı global
listener'ı route layout'larında tekrar mount etmeyin.

## 5. Public interface

### 5.1 Runtime export'ları

| Export                   | Kullanım                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| `ContextMenuProvider`    | Menu state/action context'lerini kurar                                                           |
| `ContextMenuGlobal`      | Native listener ve portal renderer'ı mount eder                                                  |
| `ContextMenuRenderer`    | Açık menu yüzeyini render eder                                                                   |
| `useContextMenu`         | `menuConfig`, `menuContext`, `menuItems`, `position`, `isOpen`, `openMenu`, `closeMenu` döndürür |
| `useContextMenuListener` | Native listener'ı ayrı mount etmek isteyen advanced tüketiciler içindir                          |

### 5.2 Resolver ve motion export'ları

Resolver export'ları: `CONTEXT_MENU_LAYOUT`, `extractNodeText`, `isObject`,
`resolveContextMenu`, `resolveMenuItems`.

Motion export'ları: `CONTEXT_MENU_CONTENT_VARIANTS`,
`CONTEXT_MENU_ICON_TRANSITION_CLASS`, `CONTEXT_MENU_ITEM_TAP`,
`CONTEXT_MENU_ITEM_VARIANTS`, `CONTEXT_MENU_ITEM_TRANSITION_CLASS`,
`CONTEXT_MENU_MICRO_SPRING`, `CONTEXT_MENU_POP_VARIANTS`, `menuContentVariants`,
`menuItemVariants`, `menuPopVariants`.

## 6. Sözleşmeler ve kullanım örnekleri

### 6.1 Registry menu kaydı

```jsx
import { useContextMenuRegistration } from '@/modules/registry';

export function MediaContextMenuRegistration({ openMedia, removeMedia }) {
  useContextMenuRegistration(
    {
      target: '[data-media-card]',
      priority: 10,
      items: ({ target }) => [
        { key: 'open', label: 'Open', icon: 'ArrowUpRight', onSelect: openMedia },
        'separator',
        { key: 'remove', label: 'Remove', danger: true, onSelect: removeMedia },
      ],
    },
    { source: 'media-feature', priority: 100 },
  );

  return null;
}
```

Config alanları:

| Alan                         | Tür              | Anlamı                                                       |
| ---------------------------- | ---------------- | ------------------------------------------------------------ |
| `path`                       | `string`         | Tek route eşleşmesi                                          |
| `paths` / `pathnames`        | `string[]`       | Birden fazla route                                           |
| `pathMatcher`                | `function`       | Custom pathname kararı                                       |
| `priority`                   | `number`         | Aday önceliği                                                |
| `when` / `enabled`           | function/boolean | Aday veya menü kullanılabilirliği                            |
| `items`                      | array/function   | Menu item descriptor'ları                                    |
| `payload` / `resolvePayload` | value/function   | Callback payload'ı                                           |
| `resolveContext`             | function         | Callback context'i                                           |
| `header`                     | object/function  | Eyebrow, title, description ve icon                          |
| `showPageHeader`             | boolean          | Nav page metadata'sını header'a ekleme                       |
| `onOpen` / `onClose`         | callback         | Açılış/kapanış lifecycle callback'i                          |
| `classNames`                 | object           | Header, item, icon, separator ve wrapper class override'ları |

### 6.2 Item descriptor

```js
{
  key: 'archive',
  label: 'Archive',
  icon: 'Archive',
  shortcut: 'A',
  danger: false,
  disabled: ({ target }) => target?.dataset.archived === 'true',
  hidden: ({ target }) => !target?.dataset.canArchive,
  onSelect: (event, context) => archive(context),
  className: 'custom-item-class',
  itemIconClassName: 'custom-icon-class',
}
```

`label`, `icon`, `shortcut`, `disabled`, `hidden`, `visible`, `danger`,
`className` ve `itemIconClassName` context alanlarına göre function olabilir.
`'separator'` veya `{ type: 'separator' }` ayraç üretir; art arda gelen veya
listenin baş/sonundaki ayraçlar compact edilir.

### 6.3 Manuel open/close

Normal kullanım native listener üzerinden otomatik açılıştır. Advanced akışta:

```jsx
function ManualMenuTrigger({ config }) {
  const { openMenu, closeMenu, isOpen } = useContextMenu();

  function openAt(event) {
    openMenu(config, event.clientX, event.clientY);
  }

  return <Trigger onContextMenu={openAt} onClose={closeMenu} open={isOpen} />;
}
```

`openMenu(configOrState, x, y)` normalized config/state kabul eder.
`closeMenu()` aktif menüyü ve callback lifecycle'ını kapatır.

### 6.4 Header ve page metadata

```js
{
  header: {
    eyebrow: 'Movie',
    title: ({ target }) => target?.dataset.title,
    description: 'Actions for this item',
    icon: 'Film',
  },
  showPageHeader: true,
}
```

Page header metadata'sı mevcut Nav kayıtlarından gelir. Explicit menu header
alanları page metadata'sına göre önceliklidir.

## 7. Yaşam döngüsü

```text
contextmenu event
  -> Registry candidates
     -> path / target / when / enabled
     -> priority + route + target score
  -> context + page metadata + onOpen
  -> item normalization
  -> ContextMenuProvider state
  -> portal + focus + keyboard + motion
  -> item action / Escape / outside click / onClose
```

Aday skoru:

```text
priority * 10000 + routeScore * 100 + targetScore
```

Skor eşitse Registry sırasındaki ilk aday seçilir. `onOpen` false döndürürse
menu açılmaz; callback sonucu object ise context'e merge edilir. `onClose`
senkron karar akışını bozmadan çalışır; rejected Promise console'a raporlanır.

## 8. Sınırlar, erişilebilirlik ve hata davranışı

- Menu `role="menu"`, action'lar `role="menuitem"`, ayraçlar `role="separator"` kullanır.
- İlk focus menu yüzeyine gider; ArrowUp/ArrowDown disabled item'ları atlar.
- Enter/Space aktif action'ı çalıştırır; Escape kapatır.
- Outside click, overlay ve native yeni contextmenu kapanışı tetikleyebilir.
- Wheel, touchmove ve menü dışı scroll tuşları açık menu sırasında kilitlenir.
- Menü viewport dışına taşarsa position helper konumu içeri alır.
- Async item/open/close callback hataları unhandled rejection oluşturmadan raporlanır.
- `useContextMenu` provider dışında çağrılırsa açıklayıcı error fırlatır.

## 9. Kurallar

1. Global listener ve renderer'ı uygulama kökünde tek kez mount edin.
2. Feature action'larını item callback'lerinde tutun; resolver'a domain kuralı eklemeyin.
3. Her item'a stabil `key` verin.
4. Disabled item'ı `hidden` ile karıştırmayın: disabled görünür, hidden render edilmez.
5. Async callback'lerde error'ı kendiniz swallow etmeyin; rejected Promise'i
   güvenli callback akışına bırakın.
6. Menü config'ini component render'ında her seferinde yeni identity ile
   üretmeyin; Registry lifecycle'ına bağlayın.
7. Yeni item/config alanı eklenirse resolver, public facade, contract test ve
   bu belge birlikte güncellenmelidir.

## 10. Doğrulama

```bash
npx prettier --check modules/context-menu/*.js modules/docs/context-menu.md
npx eslint modules/context-menu/*.js
node --import ./scripts/register-alias.mjs --test \
  tests/characterization/nav-context-menu.test.js
npm run build:webpack
```

Test kapsamı: aday skorlaması, route/target filtreleri, item function alanları,
separator compacting, header metadata, open/close callback'leri, keyboard/focus,
viewport konumu, scroll lock, async error handling ve listener cleanup.
