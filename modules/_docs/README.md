# Tvizzie Modül Dokümantasyonu

> **İnceleme tarihi:** 28 Ağustos 2026
>
> Bu dizindeki belgeler, `modules/` altındaki mevcut JavaScript/React implementasyonunun teknik referansıdır. Tasarım hedeflerini değil, çalışma ağacında bulunan davranışları ve public sözleşmeleri belgeler.

## Modül kataloğu

| Modül | Sorumluluk | Belge |
| --- | --- | --- |
| `account` | Kullanıcı hesabı bootstrap, profil çözümleme ve canlı/polling güncelleme | [ACCOUNT.md](./ACCOUNT.md) |
| `auth` | Oturum, kimlik doğrulama akışları, OAuth, passkey, MFA ve yetkilendirme | [AUTH.md](./AUTH.md) |
| `background` | Sayfa arka planı, görsel/video oynatma ve overlay | [BACKGROUND.md](./BACKGROUND.md) |
| `context-menu` | Rota/hedef farkındalıklı sağ tık menüsü | [CONTEXT-MENU.md](./CONTEXT-MENU.md) |
| `error-boundary` | React error boundary, global runtime listener ve raporlama | [ERROR-BOUNDARY.md](./ERROR-BOUNDARY.md) |
| `loading` | Registry tabanlı sayfa loading state'i ve overlay | [LOADING.md](./LOADING.md) |
| `modal` | Promise tabanlı modal stack, portal, focus ve responsive konum | [MODAL.md](./MODAL.md) |
| `nav` | Kart tabanlı global navigasyon, surface ve HUD çalışma zamanı | [NAV.md](./NAV.md) |
| `notification` | Kritik bildirimler, toast yaşam döngüsü ve persistence | [NOTIFICATION.md](./NOTIFICATION.md) |
| `registry` | Runtime configuration için kaynak/öncelik tabanlı external store | [REGISTRY.md](./REGISTRY.md) |

## Ortak okuma kuralları

- Provider'lar `app/providers.js` içindeki sırayla birlikte değerlendirilmelidir; tek başına okununca eksik görünen registry ve event entegrasyonları bu katmanda bağlanır.
- Public API için her modülün `index.js` barrel'ı, davranışın ayrıntısı için aynı dizindeki context/model dosyaları referans alınır.
- Bir sözleşme değiştiğinde ilgili belgedeki dosya envanteri, state/lifecycle bölümü, developer guide ve final diyagram birlikte güncellenmelidir.
- Belgelerdeki sayılar ve varsayılanlar kaynak koddan çıkarılmıştır; davranış değişirse bu belgeler otomatik olarak güncellenmez.

## Güncelleme kontrol listesi

1. Modülün provider/context ve public barrel dosyalarını kontrol et.
2. Registry türü, event adı, cleanup ve Promise sonuçlarını belgeye yansıt.
3. Client/server, erişilebilirlik, persistence ve hata davranışını ayrıca doğrula.
4. `npm run lint`, `npm run build` ve `git diff --check` çalıştır.
