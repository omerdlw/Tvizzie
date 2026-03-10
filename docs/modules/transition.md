# Transition

Framer Motion üzerine kurulu sayfa geçiş sistemi. Sayfa içeriklerini rota değişimlerinde animasyonlu açılıp kapanan `motion.div` öğelerine sarar. Adlandırılmış preset'ler (örn. `slideUp`, `fade`) sunar ve durumu dışarıya açarak diğer modüllerin (örn. `background`) animasyonlarını senkronize etmesini sağlar.

`app/providers.js` içinde `<TransitionProvider>` ile bağlanır. `<Transition>` bileşeni kullanılarak sayfa bazında uygulanır.

---

Olası kullanım örnekleri:

1. "Bir sayfayı slide-up geçişiyle sarmak için": `<Transition preset="slideUp">{children}</Transition>`
2. "Bir düzen bölümüne fade geçişi uygulamak için": `<Transition preset="fade"><Section /></Transition>`
3. "Geçişin o an aktif olup olmadığını kontrol etmek için": `const { isTransitioning } = useTransitionState()`
4. "Arka plan animasyonunu sayfa geçişiyle koordine etmek için": `background` modülü `useTransitionState`'ten `backgroundAnimation`'ı okur
5. "Birden fazla alt rotayı ortak AnimatePresence ile sarmak için**: `<TransitionWrapper>{children}</TransitionWrapper>`

---

### useRegistry ile Kullanım

```javascript
useRegistry({
  background: {
    transitionPreset: 'slideUp'
  }
})
```

Arka plan konfigürasyonunda `transitionPreset` belirtildiğinde geçiş animasyonu koordineli olarak çalışır.
