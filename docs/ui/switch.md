# Switch

## Ne ise yarar

`Switch`, acik/kapali durumunu gosteren toggle kontroludur.

## Nasil calisir

- Radix `SwitchPrimitive` ile klavye ve erisilebilirlik uyumlu calisir.
- Kontrollu (`checked`) ve kontrolsuz (`defaultChecked`) kullanimi destekler.
- Stil girisi `className` ile yapilir:
  - string: track (root)
  - object: slot bazli (`wrapper`, `track`, `trackActive`, `circle`, `circleActive`, `label`, `root`)

## Kullanim ornekleri

### 1) Basit switch

```jsx
import { Switch } from '@/ui/elements'

<Switch
  checked={enabled}
  onCheckedChange={setEnabled}
  className={{
    track: 'h-6 w-11 rounded-full bg-zinc-300',
    trackActive: 'bg-blue-600',
    circle: 'h-5 w-5 translate-x-0 rounded-full bg-white',
    circleActive: 'translate-x-5'
  }}
/>
```

### 2) Etiketli switch

```jsx
<Switch
  id='dark-mode'
  checked={darkMode}
  onCheckedChange={setDarkMode}
  className={{
    wrapper: 'inline-flex items-center gap-2',
    label: 'text-sm'
  }}
>
  Karanlik mod
</Switch>
```
