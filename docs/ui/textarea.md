# Textarea

## Ne ise yarar

`Textarea`, kullanicidan cok satirli metin almak icin kullanilir.

## Nasil calisir

- `value` degisikliginde yuksekligini icerige gore otomatik ayarlar.
- `maxHeight` ve `maxWidth` ile boyut siniri verilebilir.
- Stil girisi `className` ile yapilir:
  - string: textarea alani
  - object: slot bazli (`wrapper`, `textarea`, `root`)

## Kullanim ornekleri

### 1) Basit textarea

```jsx
import { Textarea } from '@/ui/elements'

<Textarea
  value={note}
  onChange={(e) => setNote(e.target.value)}
  className='w-full min-h-24 rounded-md border px-3 py-2'
/>
```

### 2) Slot object ile detayli stil

```jsx
<Textarea
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  maxHeight={240}
  className={{
    wrapper: 'rounded-md border p-2',
    textarea: 'w-full bg-transparent outline-none'
  }}
/>
```
