# Modules documentation

Bu klasör, `modules/*` içindeki tekrar kullanılabilir çalışma zamanlarının teknik referansıdır. Ürün metinleri, route kararları ve domain politikaları modül belgelerine girmez.

## Rehberleri kullanma

Her belge şu soruları yanıtlar:

1. Modül hangi sorunu çözer ve hangi kararı almaz?
2. Uygulama kabuğunda nereye kurulur?
3. Hangi public API, hangi iş için seçilir?
4. Kayıt, cleanup ve hata sınırları nelerdir?

Dosya envanteri yalnız gerçek bir sahiplik sınırını açıklıyorsa yer alır. Her export'u tekrar listelemek veya JSX ayrıntılarını belgelemek yerine, facade'dan seçilecek API ve çalışan bir entegrasyon örneği verilir.

## Modül rehberleri

- [Account](./account.md)
- [Auth](./auth.md)
- [Background](./background.md)
- [Context Menu](./context-menu.md)
- [Controls](./controls.md)
- [Error Boundary](./error-boundary.md)
- [Loading](./loading.md)
- [Modal](./modal.md)
- [Nav](./nav.md)
- [Notification](./notification.md)
- [Registry](./registry.md)

Uygulama kodu `@/modules/<module>` facade'ından import eder. Modülün kendi implementasyonu ve hedefli testleri, gerektiğinde iç dosyalara doğrudan erişebilir.

## Değişiklik kontrolü

Public API veya lifecycle değiştiğinde ilgili rehberdeki seçim tablosunu, örneği ve kuralı aynı değişiklikte güncelleyin.

```bash
npx prettier --check modules/**/*.js modules/docs/*.md
npx eslint modules
npm test
npm run build:webpack
```
