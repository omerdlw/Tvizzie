# Context Menu

Özel sağ tık menüsü sistemi. Tarayıcının native `contextmenu` olayını yakalar, Registry'den kayıtlı menü konfigürasyonunu arar ve konumlandırılmış bir menüyü React portal aracılığıyla render eder. Viewport içinde kalacak şekilde kendini otomatik ayarlar; dışarıya tıklama veya Escape tuşuyla kapanır.

`app/providers.js` içinde `<ContextMenuProvider>` ve `<ContextMenuGlobal>` ile global olarak bağlanır. Menü konfigürasyonları Registry modülü aracılığıyla kaydedilir.

---

Olası kullanım örnekleri:

1. "Dosya listesi için özel menü kaydetmek için": `useContextMenuRegistry().set('file-list', { items: [{ label: 'Sil', icon: 'trash', onClick: handleDelete, danger: true }] })`
2. "Menü öğeleri arasına ayraç eklemek için": öğeler dizisine `{ type: 'separator' }` eklenmesi yeterlidir
3. "Belirli bir konumda menüyü programatik olarak açmak için": `openMenu(config, x, y)`
4. "Menü öğelerine özel stil uygulamak için**: menü konfigürasyonuna `classNames` nesnesi geçilir
5. "Bileşen unmount olduğunda menü kaydını kaldırmak için": `useEffect(() => { return () => registry.remove('file-list') }, [])`

---

### useRegistry ile Kullanım

```javascript
useRegistry({
  context_menu: {
    items: [
      { key: 'edit', label: 'Düzenle', icon: 'pencil', onClick: handleEdit },
      { type: 'separator' },
      { key: 'delete', label: 'Sil', icon: 'trash', onClick: handleDelete, danger: true }
    ]
  }
})
```

Sayfa aktifken sağ tıklama menüsü otomatik olarak aktif olur; sayfa unmount edildiğinde kaldırılır.
