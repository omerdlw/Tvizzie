# Button

## Ne ise yarar

`Button`, kullanicinin tiklama ile bir eylem tetiklemesini saglar.

## Nasil calisir

- Varsayilan modda normal `<button>` render eder.
- `variant='toggle'` verildiginde Radix `Toggle.Root` ile ac/kapa davranisi saglar.
- Stil girisi `className` ile yapilir:
  - string: kok buton class'i
  - object: slot bazli class'lar (`root`, `default`, `toggle`)

## Kullanim ornekleri

### 1) Basit buton

```jsx
import { Button } from '@/ui/elements'

<Button className='rounded-md px-4 py-2 bg-black text-white' onClick={save}>Kaydet</Button>
```

### 2) Toggle buton

```jsx
<Button
  variant='toggle'
  defaultActive={false}
  onToggle={(pressed) => setPinned(pressed)}
  className={{
    default: 'px-3 py-1 rounded border',
    toggle: 'bg-green-600 text-white'
  }}
>
  Sabitle
</Button>
```
