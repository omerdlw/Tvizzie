# useRegistry Hook

Sayfa veya component bazlı yapılandırma kaydı için kullanılan hook.

## Kullanım

```javascript
import { useRegistry } from '@core/lib/hooks'

useRegistry({
  nav: { ... },
  modals: { ... },
  background: { ... },
  controls: { ... },
  loading: { ... },
  theme: { ... },
  guard: { ... },
  notifications: { ... }
})
```

---

## Plugins

### nav
Navigasyon ayarları.
```javascript
nav: {
  name: 'Sayfa Adı',
  path: '/path',
  icon: 'lucide:home'
}
```

### modals
Modal component kayıtları.
```javascript
modals: {
  'settings': SettingsModal,
  'confirm': ConfirmModal
}
```

### background
Arkaplan ayarları.
```javascript
background: {
  transitionPreset: 'slideUp',
  opacity: 0.6
}
```

### controls
Sayfa kontrolleri.
```javascript
controls: {
  showBackButton: true,
  showSettings: false
}
```

### loading
Yükleme durumu.
```javascript
loading: {
  enabled: true
}
```

### theme
Tema ayarları.
```javascript
theme: {
  mode: 'dark'
}
```

### guard
Navigasyon koruması.
```javascript
guard: {
  when: hasUnsavedChanges,
  message: 'Kaydedilmemiş değişiklikler var',
  onBlock: () => console.log('Engellendi')
}
```

### notifications
Sayfa mount bildirimi.
```javascript
notifications: {
  onMount: {
    type: 'success',
    message: 'Yüklendi',
    duration: 3000
  }
}
```

---

## Tam Örnek

```javascript
'use client'

import { useState } from 'react'
import { useRegistry } from '@core/lib/hooks'
import SettingsModal from '@/extend/components/modals/settings-modal'

export default function MyPage() {
  const [hasChanges, setHasChanges] = useState(false)

  useRegistry({
    nav: { name: 'Ayarlar', icon: 'lucide:settings' },
    modals: { 'settings': SettingsModal },
    guard: {
      when: hasChanges,
      message: 'Değişiklikler kaybolacak!'
    }
  })

  return <div>İçerik</div>
}
```

---

## Notlar

- Tüm proplar **opsiyoneldir**
- Sadece ihtiyaç duyulan propları tanımlayın
- Component unmount olduğunda otomatik temizlenir
- `notifications.onMount` sadece ilk mount'ta çalışır
