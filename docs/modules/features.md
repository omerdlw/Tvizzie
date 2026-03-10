# Features

Bir konfigürasyon nesnesine dayalı olarak UI'ın belirli bölümlerini koşullu şekilde etkinleştiren ya da devre dışı bırakan feature flag sistemi. Provider, bireysel bayrakları kontrol eden hook'lar ve bildirimsel koşullu render için sarmalayıcı bileşenler (`<Feature>`, `<FeatureOff>`) sunar.

`app/providers.js` içinde `<FeaturesProvider config={PROJECT_CONFIG}>` olarak bağlanır. Bir özelliğin yalnızca belirli ortamlar veya kullanıcı segmentleri için render edilmesi gerektiği her yerde kullanılır.

---

Olası kullanım örnekleri:

1. "Yalnızca flag açık olduğunda bir beta bileşen render etmek için": `<Feature name="new_dashboard"><NewDashboard /></Feature>`
2. "Flag kapalıyken alternatif içerik göstermek için": `<FeatureOff name="new_dashboard"><OldDashboard /></FeatureOff>`
3. "Hook içinde flag'e göre koşullu mantık çalıştırmak için": `const isEnabled = useFeature('analytics_v2'); if (isEnabled) { track() }`
4. "Tüm mevcut feature flag'lerini okumak için": `const features = useFeatures()`
5. "Admin panelini flag'in arkasına almak için": `<Feature name="admin_panel"><AdminPanel /></Feature>`

---

### useRegistry ile Kullanım

`features` modülü için doğrudan bir `useRegistry` plugin'i yoktur. Konfigürasyon `config/project.config.js` dosyasında statik olarak tanımlanır ve `<FeaturesProvider>` tarafından okunur.
