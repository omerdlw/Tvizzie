# Loading

Asenkron geçişler sırasında tam ekran yükleme overlay'i görüntüler. İsteğe bağlı özel bir skeleton bileşeni alır; hiçbiri belirtilmezse global `<Spinner>`'a geri döner. Overlay Framer Motion ile animasyonlu olarak açılıp kapanır.

`app/providers.js` içinde `<LoadingProvider>` ve `<LoadingOverlay>` ile bağlanır. `useLoadingActions` aracılığıyla her yerden tetiklenir.

---

Olası kullanım örnekleri:

1. "Ağır bir veri çekme işlemi öncesinde overlay'i göstermek için": `useLoading().show()`
2. "Veriler yüklendiğinde overlay'i gizlemek için": `useLoading().hide()`
3. "Varsayılan spinner yerine özel skeleton geçmek için": `useLoading().show({ skeleton: <DashboardSkeleton /> })`
4. "Rota değişimini yükleme durumuna sarmak için": `startLoading(); await router.push('/dashboard'); stopLoading()`
5. "Uygulamanın o an yüklenip yüklenmediğini kontrol etmek için": `const { isLoading } = useLoadingState()`

---

### useRegistry ile Kullanım

```javascript
useRegistry({
  loading: {
    enabled: true
  }
})
```

Sayfa mount edildiğinde yükleme overlay'i aktif hale gelir, unmount edildiğinde otomatik olarak devre dışı bırakılır.
