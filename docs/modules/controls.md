# Controls

Uygulama düzeninin üstünde render edilen yüzen bir araç çubuğu. Sol ve sağ slot'lara herhangi bir React içeriği yerleştirilebilir; rota değişikliklerinde animasyonlu olarak açılıp kapanır. Mevcut yüksekliğini dışarıya açarak düzen bileşenlerinin kendini offset etmesini sağlar.

`app/layout.js` içinde `<Controls />` olarak bağlanır. Slot'lar `useControlsActions` ile sayfa veya modül bazında doldurulur.

---

Olası kullanım örnekleri:

1. "Controls çubuğunun sol slot'una sayfa başlığı koymak için": `setLeftControls(<h1>{pageTitle}</h1>)`
2. "Sağ slot'a ayarlar butonu eklemek için": `setRightControls(<SettingsButton />)`
3. "Sayfadan çıkıldığında controls çubuğunu temizlemek için": `useEffect(() => { clearControls() }, [])`
4. "Sticky bir öğeyi controls yüksekliğine göre offset etmek için": `const { controlsHeight } = useControlsState(); style={{ top: controlsHeight }}`
5. "Yalnızca iç rotalarda geri butonu göstermek için": `setLeftControls(isNested ? <BackButton /> : null)`

---

### useRegistry ile Kullanım

```javascript
useRegistry({
  controls: {
    left: <PageTitle />,
    right: <SettingsButton />
  }
})
```

Sayfa mount edildiğinde slot'lar otomatik olarak dolar, unmount edildiğinde temizlenir.
