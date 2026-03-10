# Select

## Ne ise yarar

`Select`, tekli veya coklu secim senaryolari icin acilir menu tabanli secim bilesenidir.

## Nasil calisir

`Select` `variant` prop'una gore farkli davranislar sunar:

- `default`: klasik tekli secim
- `searchable`: menude arama kutusu
- `async`: secenekleri asenkron yukleme
- `multi`: coklu secim + checkbox
- `combobox`: input tabanli arama + secim

Stil girisi tek prop ile yapilir: `className`.

- string: kok tetikleyici stilini etkiler
- object: slot bazli stil

Sik kullanilan slotlar:

- ortak: `root`, `trigger`, `value`, `menu`, `optionsList`, `option`, `optionActive`, `icon`, `indicator`
- `searchable`/`async`/`combobox`: ek olarak `searchWrapper`, `noResults`, `input`
- `multi`: ek olarak `optionDisabled`, `optionLabel`, `footer`, `checkbox`

`input` ve `checkbox` gibi nested slotlar da object olabilir.

## Kullanim ornekleri

### 1) Default select

```jsx
import { Select } from '@/ui/elements'

<Select
  value={status}
  onChange={setStatus}
  options={[
    { value: 'draft', label: 'Taslak' },
    { value: 'published', label: 'Yayinda' }
  ]}
  className={{
    trigger: 'h-10 w-full rounded-md border px-3',
    menu: 'rounded-md border bg-white p-1 shadow-lg',
    option: 'px-2 py-1.5 rounded',
    optionActive: 'bg-zinc-100'
  }}
/>
```

### 2) Searchable select

```jsx
<Select
  variant='searchable'
  value={country}
  onChange={setCountry}
  options={countryOptions}
  className={{
    trigger: 'h-10 rounded-md border px-3',
    searchWrapper: 'p-2 border-b',
    input: {
      wrapper: 'rounded border px-2',
      input: 'h-8 w-full outline-none'
    },
    option: 'px-2 py-1.5 rounded',
    optionActive: 'bg-blue-50 text-blue-700'
  }}
/>
```

### 3) Multi select

```jsx
<Select
  variant='multi'
  value={tags}
  onChange={setTags}
  options={tagOptions}
  maxSelect={3}
  className={{
    trigger: 'h-10 rounded-md border px-3',
    menu: 'rounded-md border bg-white p-2 shadow-lg',
    option: 'px-2 py-2 rounded',
    optionActive: 'bg-zinc-100',
    checkbox: {
      box: 'h-4 w-4 rounded border',
      boxActive: 'bg-black text-white'
    }
  }}
/>
```
