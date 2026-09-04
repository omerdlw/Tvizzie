# Registry

`modules/registry`, feature'ların geçici UI descriptor'larını yayınladığı external store'dur. Nav, Background, Controls, Loading, Modal ve Context Menu bu descriptor'ları kendi davranışına göre tüketir.

## Sınır

Registry type/key/source metadata'sını, validation'ı, priority çözümünü ve registration cleanup'ını yönetir. Payload'ın domain anlamını veya tüketen modülün görünümünü yönetmez.

| Dosya              | Sorumluluk                                             |
| ------------------ | ------------------------------------------------------ |
| `contracts.js`     | Type, key, source, lifecycle ve validation sözleşmesi  |
| `operations.js`    | Register, unregister, batch ve effective value çözümü  |
| `provider.js`      | External store, provider, action ve selector hook'ları |
| `registrations.js` | Feature-facing typed registration hook'ları            |
| `bootstrap.js`     | Initial ve route kayıtları                             |
| `diagnostics.js`   | Development diagnostics buffer'ı                       |
| `index.js`         | Public facade                                          |

## Kurulum

Registry'yi onu tüketen provider'ların üstünde bir kez kurun. Değişmeyen başlangıç kayıtlarını `initialEntries` ile verin:

```jsx
<RegistryProvider initialEntries={appEntries}>
  <BackgroundProvider>
    <LoadingProvider>
      <ModalProvider>{children}</ModalProvider>
    </LoadingProvider>
  </BackgroundProvider>
</RegistryProvider>
```

## API seçimi

| İhtiyaç                          | API                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bir sayfanın birden çok tanımı   | `usePageRegistry`                                                                                                                                            |
| Tek feature tanımı               | `useNavRegistration`, `useBackgroundRegistration`, `useControlsRegistration`, `useLoadingRegistration`, `useContextMenuRegistration`, `useModalRegistration` |
| Store action veya batch          | `useRegistryActions`                                                                                                                                         |
| Bir effective value okumak       | `useRegistryValue` veya typed read hook                                                                                                                      |
| Bir type'ın kayıtlarını okumak   | `useRegistryEntries`                                                                                                                                         |
| Özel selector                    | `useRegistrySelector`                                                                                                                                        |
| Store'u React dışında test etmek | `createRegistryStore`                                                                                                                                        |

Raw `register` çağrısını feature bileşenlerine yaymak yerine typed hook veya `usePageRegistry` kullanın.

## Kullanım

Bir sayfanın ilişkili descriptor'larını tek lifecycle altında yayınlayın:

```jsx
function MediaPageRegistry({ media, isLoading }) {
  usePageRegistry({
    registry: { source: 'media-page', priority: 220 },
    nav: { path: `/movie/${media.id}`, title: media.title },
    background: { image: media.backdropUrl, overlay: true },
    loading: { isLoading, minDuration: 300 },
  });

  return null;
}
```

Tek bir sorumluluk için typed hook daha okunaklıdır:

```jsx
function EditorModalRegistration() {
  useModalRegistration(
    { EDITOR_MODAL: EditorModal },
    {
      source: 'editor-feature',
      validation: 'strict',
    },
  );
  return null;
}
```

`source`, lifecycle sahibini tanımlar. `priority` çakışan kayıtların sırasını belirler. `enabled: false`, `null` veya `undefined` payload kayıt oluşturmaz.

## Lifecycle, validation ve kurallar

- Background, Context Menu, Loading ve Modal için en yüksek priority kazanır
- Nav ve Nav Runtime kayıtları düşük priority'den yükseğe merge edilir
- `warn` varsayılandır ve issue raporlar; `strict` geçersiz payload'ı store'a yazmaz
- Graceful kayıt cleanup gecikmesi boyunca son değeri koruyabilir
- Handle dispose işlemi yalnız kendi source/instance kaydını kaldırır
- Diagnostics production'da no-op'tur

`persistent` kaydı explicit unregister edilene kadar bırakmayın. Aynı key'de birden çok instance varsa handle veya `instanceId` ile cleanup kapsamını koruyun. Metadata dışı control alanlarını payload'a eklemeyin.

## Doğrulama

```bash
npx prettier --check modules/registry/*.js modules/docs/registry.md
npx eslint modules/registry/*.js
node --import ./scripts/register-alias.mjs --test tests/modules.test.js
```
