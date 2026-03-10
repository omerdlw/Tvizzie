# Modal

Kayıtlı herhangi bir modal bileşenini portal aracılığıyla render eden global modal sistemi. Çoklu konumu (merkez, üst, alt, sol, sağ, dört köşe), kenar boşluklarını ve border radii'yi kaldıran `full` modunu, Framer Motion ile animasyonlu açılma/kapanmayı, klavye erişilebilirliğini (Escape ile kapanma, Tab trap) ve modal başına hata boundary izolasyonunu destekler.

`app/providers.js` içinde `<ModalProvider>` ile bağlanır. Modal bileşenleri Registry modülü üzerinden kaydedilir. `useModal` ile her yerden tetiklenir.

---

Olası kullanım örnekleri:

1. "Nav butonundan ayarlar modalını açmak için": `useModal().openModal('SETTINGS_MODAL', { title: 'Ayarlar' })`
2. "Merkezde onay dialogu açmak için": `openModal('CONFIRM_MODAL', { title: 'Emin misiniz?', position: 'center' })`
3. "Sağ taraftan panel kaydırmak için": `openModal('DETAIL_PANEL', { position: 'right', full: true })`
4. "Sağ üst köşede bildirim tarzı modal göstermek için**: `openModal('TOAST_MODAL', { position: 'top-right' })`
5. "Aktif modalı programatik olarak kapatmak için": `useModal().closeModal()`

---

### useRegistry ile Kullanım

```javascript
useRegistry({
  modals: {
    'CUSTOM_MODAL': CustomModalComponent
  }
})
```

Sayfa içinde tanımlanan modal bileşenleri, sayfa aktifken registry'ye eklenir ve unmount edildiğinde otomatik temizlenir. Ardından `openModal('CUSTOM_MODAL')` ile açılabilir.
