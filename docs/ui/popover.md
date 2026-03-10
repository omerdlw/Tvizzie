# Popover

## Ne ise yarar

`Popover`, bir tetikleyici elementten bagimsiz olarak acilan kucuk icerik paneli gosterir.

## Nasil calisir

- Radix `PopoverPrimitive` ile portal uzerinden render edilir.
- `triggerProps` ile tetikleyici `Button` ozellestirilebilir.
- Stil girisi `className` ile yapilir:
  - string: popover content kok stili
  - object: slot bazli (`content`, `arrow`, `root`)

Tetikleyici icin de ayni standart gecerli:

- `triggerProps.className` string veya object olabilir.

## Kullanim ornekleri

### 1) Basit popover

```jsx
import { Popover } from '@/ui/elements'

<Popover
  triggerProps={{ children: 'Detaylar' }}
  className={{
    content: 'rounded-md border bg-white p-3 shadow-lg'
  }}
>
  <p>Bu alan popover icerigidir.</p>
</Popover>
```

### 2) Tetikleyici ve icerik slot stilleri

```jsx
<Popover
  triggerProps={{
    children: 'Filtre',
    className: { default: 'rounded-md border px-3 py-2' }
  }}
  className={{
    content: 'min-w-64 rounded-md border bg-white p-4',
    arrow: 'fill-white stroke-zinc-200'
  }}
>
  <FilterPanel />
</Popover>
```
