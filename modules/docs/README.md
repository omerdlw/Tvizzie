# Modules documentation

Bu klasör, `modules/*` altındaki modüller için tek ve standart teknik referans
yüzeyidir. Her modül belgesi aynı bilgi sırasını izler; böylece bir modülün
yeteneklerini, public interface'ini, entegrasyon koşullarını ve doğrulama
adımlarını başka bir belgeye geçmeden okuyabilirsiniz.

Modüller ürün markasından bağımsız tutulur. Ürün adı, ürün alanına ait route,
logo, analytics veya domain politikası doğrudan `modules/*` altında yer almaz;
bu tür kararlar consuming application katmanında kalır.

## Doküman standardı

Her modül belgesi aşağıdaki başlıkları aynı sırayla taşımalıdır:

1. **Genel bakış**: modülün ne çözdüğü ve hangi kullanıcıya hizmet ettiği
2. **Sorumluluklar**: modülün sahip olduğu ve sahip olmadığı kararlar
3. **Dosya sahipliği**: her dosyanın gerçek implementation rolü
4. **Kurulum**: provider, context, root placement ve gerekli ön koşullar
5. **Public interface**: export'ların grupları ve seçim rehberi
6. **Sözleşmeler ve kullanım örnekleri**: config, hook, callback ve tam akışlar
7. **Yaşam döngüsü**: state, cleanup, event sırası ve hata davranışı
8. **Sınırlar**: erişilebilirlik, performans, SSR ve bilinen kısıtlar
9. **Kurallar**: doğru kullanım ve anti-pattern'ler
10. **Doğrulama**: ilgili test, lint, format ve build komutları

Bir özellik public interface'i etkiliyorsa hem ilgili modül belgesindeki export
tablosu hem de kullanım örneği güncellenmelidir. Sadece implementation dosyasını
anlatmak yeterli değildir.

## Modül rehberleri

- [Account](./account.md)
- [Auth](./auth.md)
- [Background](./background.md)
- [Context Menu](./context-menu.md)
- [Error Boundary](./error-boundary.md)
- [Loading](./loading.md)
- [Modal](./modal.md)
- [Nav](./nav.md)
- [Notification](./notification.md)
- [Registry](./registry.md)

Dosya isimleri modül klasörleriyle aynı kebab-case sözleşmesini izler. Modül
klasörlerinde ayrı `README.md` dosyası tutulmaz; kaynak kod ile teknik referans
arasındaki sınır bu merkezde korunur.

## Ortak doğrulama

Belge veya public interface değişikliklerinden sonra:

```bash
npx prettier --check modules/**/*.js modules/docs/*.md
npx eslint modules
npm test
npm run build:webpack
```
