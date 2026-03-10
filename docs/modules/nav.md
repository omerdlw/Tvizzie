# Nav

Bir konfigürasyon nesnesinden navigasyon menüsü oluşturan ve yöneten sistem. Aktif rota tespiti, Firebase destekli dinamik nav öğeleri, polling tabanlı nav güncellemeleri, korumalı rotalar için guard'lar ve öğe düzeyinde event'ler gibi özellikleri kapsar. Nav durumunu okuyup mutate etmek için hook'lar sunar.

`app/layout.js` içinde `<Nav>` ve `app/providers.js` içinde `<NavigationProvider>` ile yönetilir.

---

Olası kullanım örnekleri:

1. "Config dosyasına yeni bir nav öğesi eklemek için": `config/nav.config.js` dosyasında `{ label, href, icon }` formatında bir giriş tanımlanır
2. "Nav öğesini kimlik doğrulamayla korumak için**: nav öğesi konfigürasyonuna `guard` özelliği eklenir
3. "Aktif nav öğesini bir bileşende okumak için": `const { activeItem } = useNavState()`
4. "Firebase'den çalışma zamanında dinamik nav öğeleri enjekte etmek için**: `useFirebaseNav` ilgili koleksiyon yoluyla konfigüre edilir
5. "Nav öğesi tıklama event'lerini global dinlemek için**: `useNavEvents` ile abone olunur

---

### useRegistry ile Kullanım

```javascript
useRegistry({
  nav: {
    name: 'Sayfa Adı',
    icon: 'lucide:home',
    path: '/sayfa-yolu'
  }
})
```

Sayfa navigasyon listesinde aktif konumunu bildirir; sayfa unmount edildiğinde otomatik olarak kaldırılır.
