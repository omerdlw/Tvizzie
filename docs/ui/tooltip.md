# Tooltip

## Ne ise yarar

`Tooltip`, bir elementin uzerine gelindiginde kisa aciklama metni gosterir.

## Nasil calisir

- Radix `TooltipPrimitive` ile gecikmeli acilim (`delayMs`) destekler.
- Icerik portal uzerinden render edilir.
- Stil girisi `className` ile yapilir:
  - string: tooltip icerik kok stili
  - object: slot bazli (`trigger`, `content`, `arrow`, `root`)

## Kullanim ornekleri

### 1) Basit tooltip

```jsx
import { Tooltip } from '@/ui/elements'

<Tooltip text='Kaydet' className='rounded bg-black px-2 py-1 text-xs text-white'>
  <button type='button'>💾</button>
</Tooltip>
```

### 2) Slot bazli tooltip stili

```jsx
<Tooltip
  text='Bu alan zorunludur'
  delayMs={150}
  className={{
    content: 'rounded-md border bg-zinc-900 px-2 py-1 text-xs text-white',
    arrow: 'fill-zinc-900'
  }}
>
  <InfoIcon />
</Tooltip>
```
