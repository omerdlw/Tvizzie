# Registry

String anahtarları çalışma zamanında React bileşenlerine eşleyen merkezi bileşen registry'si. Modal ve Context Menu modülleri tarafından hardcoded import olmaksızın dinamik olarak kayıtlı bileşenleri arama ve render etmek için kullanılır. `REGISTRY_TYPES` aracılığıyla modal, nav öğeleri ve diğer tipler için ayrı namespace'leri destekler.

`app/providers.js` içinde `<RegistryProvider>` ile bağlanır. Bileşenler `<RegistryInjector>` ile bildirimsel olarak enjekte edilir.

Ayrıntılı kullanım kılavuzu için bakınız: [use-registry.md](./use-registry.md).

---

Olası kullanım örnekleri:

1. "Bir modal bileşeni anahtar ile kaydetmek için": `<RegistryInjector type={REGISTRY_TYPES.MODAL} items={{ SETTINGS_MODAL: SettingsModal }} />`
2. "Kayıtlı bir modalı tip anahtarıyla bulmak için": `const Component = useModalRegistry().get('SETTINGS_MODAL')`
3. "Çalışma zamanında özel bir tema kaydetmek için": `useRegistryActions().register(REGISTRY_TYPES.THEME, 'page-theme', { primary: '#ff0000' })`
4. "Herhangi bir bileşenden registry değerini okumak için": `const theme = useRegistryState().get(REGISTRY_TYPES.THEME, 'page-theme')`
5. "Tek bir injector çağrısıyla birden fazla modal kaydetmek için": `<RegistryInjector items={{ MODAL_A: A, MODAL_B: B }} />` şeklinde nesne geçilir

---

### useRegistry ile Kullanım

`useRegistry`, registry sisteminin tüm plugin'lerini tek bir hook üzerinden birleştiren ana kullanım yoludur. Detaylı örnekler için [use-registry.md](./use-registry.md) dosyasına bakınız.

```javascript
useRegistry({
  nav: { name: 'Sayfa', icon: 'lucide:home' },
  background: { image: '/hero.jpg' },
  controls: { left: <BackButton /> },
  modals: { 'MY_MODAL': MyModal },
  guard: { when: hasUnsavedChanges, message: 'Değişiklikler kaybolacak!' }
})
```
