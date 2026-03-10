# Notification

Ekranın sağ üst köşesinde birden fazla bildirimi üst üste yığan gelişmiş toast bildirim sistemi. Her bildirim Framer Motion'ın `popLayout` özelliği ile bağımsız olarak animasyonlanır. Bildirimler zaman damgasına göre sıralanır ve sürüklenerek (swipe) kapatılabilir.

Sistem, `app/providers.js` içinde `<NotificationProvider>`, `<NotificationContainer>` ve `<NotificationListener>` aracılığıyla tüm uygulamaya bağlanır. 

---

## 1. `useToast` Hook'u ile Klasik Kullanım (Manuel Tetikleme)
Bileşenleriniz, formlarınız veya buton tıklamalarınız içerisinde anlık bildirim göstermek için en çok kullanılan yöntemdir.

```javascript
import { useToast } from '@/modules/notification/hooks'

export default function MyComponent() {
  const toast = useToast()

  const handleSave = () => {
    toast.success('Ayarlar başarıyla kaydedildi.')
    toast.error('Veriler sunucuya gönderilirken bir hata oluştu.')
    toast.info('Yeni güncellemeler arka planda indiriliyor...')
    toast.warning('Bu işlemi geri alamazsınız!', {
      duration: 10000, 
    })
  }

  return <button onClick={handleSave}>Kaydet</button>
}
```

### Action Butonları ve Açıklama Ekleme
Her toast tipinde (success, error vb.) 3. parametre olarak genişletilmiş ayarlar (`options`) geçilebilir:
```javascript
toast.error('İşlem Başarısız', {
  title: 'Hata', // Başlığı ezer
  description: 'Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.', // Alt açıklama ekler
  duration: 8000, 
  actions: [
    {
      label: 'Tekrar Dene',
      onClick: () => retryConnection(),
      dismiss: true // Tıklanınca bildirimi anında kapatır
    }
  ]
})
```

---

## 2. Özel (Custom) Bildirimler Üretme
Eğer sabit kalıpların (`success`, `info` vb.) dışına çıkıp tamamen kendi ikon ve tasarımınızla bir bildirim oluşturmak isterseniz `toast.show` metodunu kullanabilirsiniz:

```javascript
toast.show('premium-upgrade', 'Tebrikler, yükseltme tamamlandı!', {
  title: 'Premium Hesap Aktif', 
  description: 'Artık tüm özelliklere sınırsız erişiminiz var.',
  icon: 'solar:star-bold', // İstediğiniz Iconify veya Solar ikonu
  colorClass: 'text-purple-500', // İkon ve Başlık için CSS veya Tailwind rengi
  duration: 6000,
  dismissible: true, // Kullanıcı sağa kaydırıp kapatabilsin mi? (varsayılan: true)
})
```

---

## 3. `useRegistry` ile Kullanım (Otomatik / On-Mount)
Sayfa ilk yüklendiğinde (mount) hiçbir etkileşim beklemeden kullanıcıyı karşılayacak olan global bildirimler için `useRegistry` sistemi kullanılır.

```javascript
import { useRegistry } from '@/lib/hooks/use-registry'

export default function DashboardPage() {
  useRegistry({
    notifications: {
      onMount: {
        type: 'success', // Toast tipi: success, error, warning, info
        message: 'Hoş geldiniz!',
        description: 'Son girişinizden bu yana 3 yeni mesajınız var.',
        duration: 5000, // 5 saniye
        actions: [
          {
            label: 'Mesajlara Git',
            onClick: () => window.location.href = '/messages',
          },
        ],
      }
    }
  })

  return <div>Dashboard İçeriği</div>
}
```

Özelleştirilmiş bir `useRegistry` bildirimi yapmak isterseniz yine standart tipler (`success`, `error`) yerine kendi rastgele tipinizi verip ikon ve renk geçerek özel bir karşılama bildirimi yaratabilirsiniz:
```javascript
useRegistry({
  notifications: {
    onMount: {
      type: 'welcome-back', 
      title: 'Harika!',
      message: 'Sizi yeniden aramızda görmek çok güzel.',
      icon: 'solar:hand-heart-bold',
      colorClass: 'text-pink-500'
    }
  }
})
```
