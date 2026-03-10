# Checkbox

## Ne ise yarar

`Checkbox`, ikili (true/false) secim durumlarini yonetmek icin kullanilir.

## Nasil calisir

- Radix `CheckboxPrimitive` uzerinden erisilebilirlik destegiyle calisir.
- Kontrollu (`checked`) ve kontrolsuz (`defaultChecked`) kullanimi destekler.
- Stil girisi `className` ile yapilir:
  - string: checkbox kutusu (root)
  - object: slot bazli (`wrapper`, `box`, `boxActive`, `indicator`, `label`, `labelActive`, `root`)

## Kullanim ornekleri

### 1) Basit checkbox

```jsx
import { Checkbox } from '@/ui/elements'

<Checkbox checked={terms} onCheckedChange={setTerms} className='h-5 w-5 rounded border' />
```

### 2) Etiketli checkbox

```jsx
<Checkbox
  id='newsletter'
  checked={newsletter}
  onCheckedChange={setNewsletter}
  className={{
    wrapper: 'inline-flex items-center gap-2',
    box: 'h-4 w-4 rounded border',
    boxActive: 'bg-green-600 text-white',
    label: 'text-sm text-zinc-700'
  }}
>
  Bultene kaydol
</Checkbox>
```
