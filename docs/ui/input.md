# Input

## Ne ise yarar

`Input`, kullanicidan tek satir metin/veri almak icin kullanilir.

## Nasil calisir

- Sol ve sag ikon alabilir (`leftIcon`, `rightIcon`).
- Stil girisi `className` ile yapilir:
  - string: dogrudan input alani
  - object: slot bazli (`wrapper`, `input`, `leftIcon`, `rightIcon`, `root`)

## Kullanim ornekleri

### 1) Basit input

```jsx
import { Input } from '@/ui/elements'

<Input
  placeholder='E-posta'
  className='w-full rounded-md border px-3 py-2'
/>
```

### 2) Ikonlu input (slot object)

```jsx
<Input
  leftIcon={<MailIcon />}
  placeholder='ornek@site.com'
  className={{
    wrapper: 'flex items-center gap-2 rounded-md border px-2',
    input: 'py-2 outline-none',
    leftIcon: 'text-zinc-500'
  }}
/>
```
