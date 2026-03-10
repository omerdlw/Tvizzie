# Error Boundary

Beklenmedik JavaScript hatalarını farklı kapsamlarda (global uygulama, bireysel modül, satır içi bileşen) yakalar ve sayfa çökmesi yerine bir fallback UI render eder. Takılabilir handler'larla (konsol, localStorage, webhook, Sentry, toplu) bir hata raporlama sistemi ve işlenmeyen promise redleri için global event listener sunar.

`app/providers.js` içinde `<GlobalError>` olarak tüm uygulamayı sarar.

---

Olası kullanım örnekleri:

1. "Tüm uygulamayı tam sayfa hata fallback'iyle sarmak için": `<GlobalError><App /></GlobalError>`
2. "İzole bir modülü sayfayı çökertmeden korumak için": `<ModuleError name="DataTable"><DataTable /></ModuleError>`
3. "Tek bir bileşeni satır içi hata mesajıyla sarmak için": `<ComponentError message="Grafik yüklenemedi"><Chart /></ComponentError>`
4. "Hataları Sentry'ye bildirmek için": `initErrorReporter({ handlers: [createSentryHandler({ dsn: '...' })] })`
5. "Hataları production debug için localStorage'a kaydetmek için": `initErrorReporter({ handlers: [createLocalStorageHandler()] })`

---

### useRegistry ile Kullanım

`error-boundary` modülü için doğrudan bir `useRegistry` plugin'i yoktur. Bileşenler `<GlobalError>`, `<ModuleError>` ve `<ComponentError>` ile JSX seviyesinde sarılır.
