# Background

Uygulamanın tam ekran arka planını yönetir. Blur, overlay opaklığı ve oynatma seçenekleriyle birlikte statik görseller ve videolar desteklenir. Framer Motion ile geçişler animasyonlanır; `transition` modülüyle koordineli animasyon için entegre çalışır.

`app/providers.js` içinde `<BackgroundProvider>` ve `<BackgroundOverlay>` ile global olarak bağlanır. Sayfa bazında `useBackground` hook'u ile kontrol edilir.

---

Olası kullanım örnekleri:

1. "Ana sayfa için bir arka plan görseli ayarlamak için": `useBackground().setBackground({ image: '/hero.jpg' })`
2. "Bir bölümde döngüsel arka plan videosu oynatmak için": `useBackground().setBackground({ video: '/intro.mp4', videoOptions: { loop: true, muted: true } })`
3. "Görselin üstüne karanlık bir overlay eklemek için": `useBackground().setBackground({ image: '/hero.jpg', overlay: true, overlayOpacity: 0.6 })`
4. "Buzlu cam efekti için blur uygulamak için": `useBackground().setBackground({ image: '/hero.jpg', blur: 8 })`
5. "Sayfa unmount edildiğinde arka planı temizlemek için": `useEffect(() => { setBackground(null) }, [])`

---

### useRegistry ile Kullanım

```javascript
useRegistry({
  background: {
    image: '/hero.jpg',
    overlay: true,
    overlayOpacity: 0.5,
    blur: 4,
    transitionPreset: 'slideUp'
  }
})
```

Sayfa mount edildiğinde arka plan otomatik olarak ayarlanır, unmount edildiğinde temizlenir.
