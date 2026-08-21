# Tvizzie - Proje Mimarisi ve Dosya Yapısı (AI & Geliştirici Kılavuzu)

Bu belge, **Tvizzie** projesinin mimari felsefesini, katmanlı klasör yapısını, veri akışını, temel tasarım kalıplarını ve tam dosya ağacını yapay zeka modellerinin (LLM/Agent) ve geliştiricilerin en yüksek verimle anlayabilmesi için detaylandırır.

---

## 1. Proje Özeti ve Teknoloji Yığını

**Tvizzie**, modern, yüksek performanslı ve sosyal odaklı bir Film, Dizi (TV) ve Kişi (Oyuncu/Yönetmen) takip ve inceleme platformudur (Letterboxd & Serializd benzeri).

### 🛠️ Ana Teknolojiler:
* **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) + **React 19** (React Compiler desteği ile)
* **Backend & Veritabanı:** [Supabase](https://supabase.com/) (`@supabase/ssr`, PostgreSQL, Row-Level Security, Realtime SSE/Broadcast)
* **Harici Medya Verisi:** [TMDB (The Movie Database) API](https://developer.themoviedb.org/docs) (Çok katmanlı sunucu önbellekleme ve arama sıralama motoru ile)
* **Dağıtım / Edge:** [Cloudflare Pages & Workers](https://developers.cloudflare.com/) (`@opennextjs/cloudflare` + `wrangler`)
* **Stil & Tasarım:** [Tailwind CSS v4](https://tailwindcss.com/) + Özel CSS Değişkenleri (`app/globals.css`)
* **Tipografi:** *Zuume* (Display/Başlıklar) & *OpenAISans* (Arayüz/Gövde Metinleri)
* **Animasyon & Arayüz:** [Framer Motion](https://www.framer.com/motion/), [Lenis](https://lenis.darkroom.engineering/) (Smooth Scroll), [Radix UI](https://www.radix-ui.com/) Primitives, [Lucide React](https://lucide.dev/) / Iconify

---

## 2. Mimari Prensipler ve Katman Hiyerarşisi

Proje **Domain-Driven Design (DDD)** ve **Clean Architecture** prensiplerine göre yapılandırılmıştır. Kod tabanı 6 ana sütuna ayrılmıştır:

```
Root (@/)
├── app/               # [Sunum & Yönlendirme] Next.js 16 App Router (Sayfalar, Route Groups, API Routes)
├── domains/           # [İş Mantığı & Alanlar] Domain-bazlı modüller (account, media, auth, reviews, social...)
├── infrastructure/    # [Dış Entegrasyonlar] HTTP motoru, Supabase, TMDB, SSE/Realtime, Job Queue
├── modules/           # [Uygulama İskeleti] Global Nav, Modal, Context Menu, Notification, Registry sistemleri
├── ui/                # [Tasarım Sistemi] Saf ve yeniden kullanılabilir atomik bileşenler (Button, Input, Select...)
├── public/            # [Statik Varlıklar] Fontlar (OpenAISans, Zuume), resimler, dokular
└── scripts/           # [Yardımcı Araçlar] DB Seed, Test ve Node Alias yardımcıları
```

### 📐 İçe Aktarma (Import) ve Katman Kuralları:
1. **Yol Takma Adı:** `@/*` proje kök dizinini (`./*`) temsil eder (`jsconfig.json` ve `package.json` imports tanımlı).
2. **Bağımlılık Yönü:**
   * `app/` ➔ `domains/`, `modules/`, `ui/`, `infrastructure/` kullanabilir.
   * `domains/` ➔ `modules/`, `ui/`, `infrastructure/` kullanabilir. Domainler arası doğrudan derin bağımlılıklar yerine gevşek bağlı yapılar tercih edilir.
   * `modules/` ➔ `ui/`, `infrastructure/` kullanabilir.
   * `infrastructure/` ➔ Dış servislere bağlanır; UI veya sayfa bağımlılığı içermez.
   * `ui/` ➔ Saf bileşen katmanıdır; iş mantığı veya domain verisi içermez.

---

## 3. Katmanların Derinlemesine Analizi

### 3.1. `app/` — Next.js 16 App Router
Sayfalar, yönlendirme grupları (`Route Groups`), API uç noktaları ve genel sayfa iskeletini barındırır.
* **`(home)`:** Ana keşif sayfası, öne çıkan içerikler ve trendler.
* **`(media)`:** Film (`movie/[id]`), Dizi (`tv/[id]`), Kişi (`person/[id]`) ve detaylı inceleme sayfaları.
* **`(account)`:** Kullanıcı profili (`account/[username]`), aktivite, izlenenler, izleme listesi, beğeniler, özel listeler ve profil düzenleme.
* **`(auth)`:** Giriş (`sign-in`), kayıt (`sign-up`), e-posta doğrulama ve OAuth callback sayfaları.
* **`(legal)`:** Gizlilik politikası ve kullanım şartları.
* **`_shell/`:** Genel navigasyon runtime'ı, geçiş yakalayıcıları ve etkileşim sınırları.
* **`api/`:** Sunucu tarafı REST/Edge API rotaları (Auth, TMDB proxy, Hesap işlemleri, Sosyal aktiviteler, Arama, SSE bildirimleri).
* **`globals.css` / `layout.js` / `providers.js`:** Kök sağlayıcılar (Auth, Navigation, Context Menu, Modal, Theme) ve global stiller.

#### 💡 Sunucu/İstemci Ayrımı Deseni (`page.js` + `client.js`):
Tüm sayfa rotalarında katı bir ayrım uygulanır:
* **`page.js` (Server Component):** Sayfa meta verilerini (`generateMetadata`) hazırlar, ilk SSR verilerini sunucudan çeker ve doğrudan `client.js` bileşenine aktarır.
* **`client.js` (Client Component - `"use client"`):** Etkileşimli UI durumunu, istemci hook'larını ve animasyonları yönetir.

---

### 3.2. `domains/` — İş Mantığı (Domain-Driven Modules)
Her domain kendi içinde bağımsız bir modül gibi davranır:

| Domain | Sorumluluk & İçerik |
| :--- | :--- |
| **`account`** | Kullanıcı profili, istatistikler, avatar yükleme, profil güncelleme, takipçi/takip edilen ilişkileri, listeler ve özel medya filtreleme. |
| **`auth`** | Supabase kimlik doğrulama, oturum yaşam döngüsü, Google OAuth, şifre sıfırlama, güvenlik token'ları ve audit logging. |
| **`home`** | Ana sayfa keşif akışı (`discover-feed`), IMDb Top 100 verisi ve öne çıkan içerik bölümleri. |
| **`legal`** | Yasal metinler, sözleşme içerikleri ve biçimlendirme. |
| **`media`** | Film/Dizi/Kişi detay kartları, ödüller (Oscars, Bafta, Emmy), sezon/bölüm reyting grafikleri, izleme listesi / beğenme / izlendi durumları. |
| **`reviews`** | Kullanıcı incelemeleri, puanlama sistemi, spoiler koruması, inceleme beğenileri ve yorumları. |
| **`search`** | TMDB ve yerel topluluk hibrit araması, arama sonuçları sıralama ve metin eşleştirme motoru. |
| **`shell`** | Uygulama ana kabuğu, gezinme çubuğu aksiyonları, modal pencereleri (resim/video önizleme, bildirimler, sosyal kanıt). |
| **`social`** | Kullanıcı aktiviteleri akışı, takip sistemi, gerçek zamanlı bildirimler ve sosyal kanıt (social proof) verisi. |

*Her domain genellikle şu alt dizinlere sahiptir:*
* `client/`: İstemci tarafı API çağrıları ve veri yönetim servisleri.
* `server/`: Sunucu tarafı rota işleyicileri, sunucu aksiyonları ve veri erişim katmanı.
* `ui/`: Domain'e özgü UI bileşenleri, bölümler (`sections/`) ve iskelet yükleme durumları (`skeletons.js`).
* `hooks/`: Durum yönetimi ve veri yakalama için özel React kancaları.
* `utils/`: Domain sabitleri, doğrulama şemaları ve biçimlendiriciler.

---

### 3.3. `infrastructure/` — Dış Servisler ve Altyapı
Sistem altyapısı ve üçüncü parti entegrasyonlarını soyutlar:
* **`http/`:** Standartlaştırılmış API yanıt şablonları (`ApiResponse`), hata sınıfları (`AppError`), bellek içi önbellek (`memory-cache`), istek hız sınırlayıcı (`rate-limiter`) ve aşamalı dağıtım (`write-rollout`).
* **`supabase/`:** Sunucu ve istemci SSR Supabase istemcileri (`createClient`), admin yetkili servis istemcisi, auth token saklama ve proxy yönetimi.
* **`tmdb/`:** TMDB REST API entegrasyonu, katalog sorgulayıcı, detay ve ödül toplayıcı, arama sonuçları ağırlıklandırma/sıralama algoritmaları ve görsel yardımcıları.
* **`realtime/`:** Server-Sent Events (SSE) altyapısı, canlı güncelleme yayınları (`realtime-broadcast`), polling fallback servisi ve kullanıcı olayları yöneticisi.
* **`jobs/`:** Uygulama içi asenkron arka plan görevleri ve kuyruk yönetimi (`app-event-queue`).
* **`observability/`:** Kullanıcı geri bildirimleri ve web hayati değerleri (`web-vitals`) telemetrisi.
* **`runtime/`:** Uygulama sağlık kontrolü (`health.server.js`).

---

### 3.4. `modules/` — Çekirdek Uygulama Primitives
Uygulama genelinde paylaşılan mikro mimariler:
* **`nav/`:** Akıllı gezinme sistemi; state-machine tabanlı, klavye kısayollarını destekleyen, dinamik yükseklik ve yüzey yönetimi (`surface-model`) sunan menü motoru.
* **`modal/`:** Global, animasyonlu, yığınlanabilir modal (diyalog) yönetim altyapısı.
* **`context-menu/`:** Sağ tık / uzun basma menü motoru ve tetikleyicileri.
* **`notification/`:** Toast ve kalıcı bildirim sistemi.
* **`registry/`:** Rota ve eklenti kayıt motoru (Plugin / Registry Architecture).
* **`error-boundary/`:** Hata yakalama, raporlama ve kurtarma sınırları.
* **`auth` & `account`:** Oturum durumu ve hesap bağlamı sağlayıcıları.
* **`background` / `loading`:** Global arka plan efektleri ve yükleme durumları.

---

### 3.5. `ui/` — Atomik Tasarım Sistemi (UI Primitives)
Saf, domainden bağımsız, erişilebilir (Radix destekli) ve Tailwind ile stillendirilmiş temel bileşenler:
* `button.js`: Dinamik varyantlı (primary, secondary, ghost, danger vb.) butonlar.
* `input.js` & `textarea.js`: Form giriş elemanları.
* `select/`: Standart Select, Combobox, Multi-Select, Searchable Select ve Async Select bileşenleri.
* `checkbox.js`, `switch.js`: Seçim kontrol elemanları.
* `popover.js`, `tooltip.js`: Bağlamsal açılır kutular ve ipuçları.
* `icon.js`: Optimize edilmiş ikon render motoru.

---

### 3.6. `public/` & `scripts/`
* **`public/fonts/`:** Özel web fontları — *OpenAISans* (Light, Regular, Medium, Semibold, Bold ve Italic) ve *Zuume* (Bold).
* **`public/images/`:** Arka plan greni (noise) ve logo varlıkları.
* **`scripts/`:** Veritabanı testleri (`test-supabase-runtime.mjs`), geliştirme verisi tohumlama (`dev-seed-dataset.mjs`) ve modül takma ad kayıtçısı (`register-alias.mjs`).

---

## 4. Temel Tasarım Desenleri & AI Geliştirici Kuralları

Yapay zeka modelleri ve ajanlar kod üretirken veya düzenlerken aşağıdaki kurallara **kesinlikle** uymalıdır:

1. **Katman İhlali Yapmayın:** `ui/primitives` içine doğrudan veritabanı sorgusu veya domain mantığı koymayın. Domain mantığını `domains/<alan>/` altında tutun.
2. **Server/Client Ayrımı:** Veri getirme ve meta veri üretimini `page.js` (Server Component) içinde yapın; kullanıcı etkileşimi ve animasyon gerektiren UI parçalarını `client.js` (`"use client"`) içinde tanımlayın.
3. **Stil Bütünlüğü:**
   * Tailwind CSS v4 ve `app/globals.css` içindeki CSS değişkenlerini (`--bg-*`, `--text-*`, `--border-*`) kullanın.
   * Başlık ve büyük vurgu metinlerinde `font-zuume` / `tracking-wider`, gövde ve UI elemanlarında `font-sans` (OpenAISans) tercih edin.
4. **Veri Güvenliği ve Doğrulama:** API rotalarında ve sunucu işlemlerinde (`infrastructure/http/api-response.server.js` ve `AppError`) standart hata formatını kullanın.
5. **Önbellek & Edge Uyumluluğu:** Cloudflare Workers / Pages ortamı gözetilerek Node.js'e özgü native modüller yerine standart Web API'leri (`fetch`, `Request`, `Response`, `crypto`) ve `@supabase/ssr` desenleri kullanılmalıdır.

---

## 5. Tam Dosya Ağacı (Current File Tree)

Aşağıda projenin tüm güncel dosya ve dizin yapısı eksiksiz olarak listelenmiştir (`.git`, `.next`, `node_modules` hariç):

```text
.
├── .vscode
│   └── settings.json
├── app
│   ├── _shell
│   │   ├── navigation
│   │   │   ├── account-nav-links.js
│   │   │   └── account-nav-registry.js
│   │   ├── global-context-menu-registry.js
│   │   ├── interactive-boundary.js
│   │   ├── nav-runtime.js
│   │   ├── navigation-config.js
│   │   └── smooth-scroll.js
│   ├── (account)
│   │   ├── account
│   │   │   ├── [username]
│   │   │   │   ├── activity
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── likes
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── lists
│   │   │   │   │   ├── [slug]
│   │   │   │   │   │   ├── client.js
│   │   │   │   │   │   ├── loading.js
│   │   │   │   │   │   └── page.js
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── reviews
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── watched
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── watchlist
│   │   │   │   │   ├── client.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── client.js
│   │   │   │   ├── layout.js
│   │   │   │   ├── loading.js
│   │   │   │   ├── not-found.js
│   │   │   │   └── page.js
│   │   │   ├── edit
│   │   │   │   ├── client.js
│   │   │   │   ├── loading.js
│   │   │   │   ├── not-found.js
│   │   │   │   └── page.js
│   │   │   ├── client.js
│   │   │   ├── error.js
│   │   │   ├── loading.js
│   │   │   ├── not-found.js
│   │   │   └── page.js
│   │   ├── layout.js
│   │   └── registry.js
│   ├── (auth)
│   │   ├── callback
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── sign-in
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── sign-up
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── error.js
│   │   ├── layout.js
│   │   ├── loading.js
│   │   └── registry.js
│   ├── (home)
│   │   ├── client.js
│   │   ├── error.js
│   │   ├── loading.js
│   │   ├── page.js
│   │   └── registry.js
│   ├── (legal)
│   │   ├── privacy
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── terms
│   │   │   ├── client.js
│   │   │   └── page.js
│   │   ├── error.js
│   │   ├── loading.js
│   │   └── registry.js
│   ├── (media)
│   │   ├── movie
│   │   │   └── [id]
│   │   │       ├── reviews
│   │   │       │   ├── client.js
│   │   │       │   └── page.js
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── person
│   │   │   └── [id]
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── tv
│   │   │   └── [id]
│   │   │       ├── reviews
│   │   │       │   ├── client.js
│   │   │       │   └── page.js
│   │   │       ├── client.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── layout.js
│   │   └── registry.js
│   ├── api
│   │   ├── account
│   │   │   ├── activity
│   │   │   │   └── route.js
│   │   │   ├── media
│   │   │   │   └── route.js
│   │   │   ├── profile
│   │   │   │   └── route.js
│   │   │   ├── resolve
│   │   │   │   └── route.js
│   │   │   ├── reviews
│   │   │   │   └── route.js
│   │   │   └── search
│   │   │       └── route.js
│   │   ├── activity
│   │   │   └── events
│   │   │       └── route.js
│   │   ├── auth
│   │   │   ├── account
│   │   │   │   └── route.js
│   │   │   ├── callback
│   │   │   │   └── route.js
│   │   │   ├── csrf
│   │   │   │   └── route.js
│   │   │   ├── password-reset
│   │   │   │   └── complete
│   │   │   │       └── route.js
│   │   │   ├── session
│   │   │   │   └── route.js
│   │   │   ├── sign-in
│   │   │   │   └── route.js
│   │   │   ├── sign-up
│   │   │   │   └── complete
│   │   │   │       └── route.js
│   │   │   └── verification
│   │   │       └── route.js
│   │   ├── collections
│   │   │   └── route.js
│   │   ├── feedback
│   │   │   └── route.js
│   │   ├── follows
│   │   │   └── route.js
│   │   ├── health
│   │   │   └── route.js
│   │   ├── internal
│   │   │   └── jobs
│   │   │       └── app-events
│   │   │           └── route.js
│   │   ├── jobs
│   │   │   └── route.js
│   │   ├── lists
│   │   │   └── like
│   │   │       └── route.js
│   │   ├── live-updates
│   │   │   ├── events
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── notifications
│   │   │   ├── events
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── reviews
│   │   │   ├── write
│   │   │   │   └── route.js
│   │   │   └── route.js
│   │   ├── search
│   │   │   └── community
│   │   │       └── route.js
│   │   ├── social-proof
│   │   │   └── route.js
│   │   ├── system
│   │   │   └── rollout
│   │   │       └── route.js
│   │   └── tmdb
│   │       └── route.js
│   ├── error.js
│   ├── global-error.js
│   ├── globals.css
│   ├── layout.js
│   ├── manifest.js
│   ├── not-found.js
│   ├── providers.js
│   └── template.js
├── domains
│   ├── account
│   │   ├── client
│   │   │   ├── account-api.client.js
│   │   │   ├── collections.client.js
│   │   │   └── profile.client.js
│   │   ├── hooks
│   │   │   ├── account-edit-data.hooks.js
│   │   │   ├── account-edit-page-state.js
│   │   │   ├── account-overview-state.js
│   │   │   ├── account-section-state.js
│   │   │   ├── collections.hooks.js
│   │   │   ├── feed-state.hooks.js
│   │   │   ├── list-items.hooks.js
│   │   │   ├── media-feed-state.js
│   │   │   ├── page-actions.hooks.js
│   │   │   ├── page-data.hooks.js
│   │   │   ├── page.hooks.js
│   │   │   ├── relationship.hooks.js
│   │   │   ├── section-page.hooks.js
│   │   │   └── security.hooks.js
│   │   ├── server
│   │   │   ├── actions
│   │   │   │   └── profile.server.js
│   │   │   ├── api-handlers.server.js
│   │   │   ├── collections.server.js
│   │   │   ├── feed.server.js
│   │   │   ├── media-upload.server.js
│   │   │   ├── profile.server.js
│   │   │   ├── request-target.server.js
│   │   │   └── routes.server.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── lists
│   │   │   │   │   ├── list-card.js
│   │   │   │   │   └── list-grid.js
│   │   │   │   ├── account-media-grid.js
│   │   │   │   └── account-pagination.js
│   │   │   ├── filters
│   │   │   │   ├── content-filter
│   │   │   │   │   ├── activity-filter-bar.js
│   │   │   │   │   ├── content-filter-controls.js
│   │   │   │   │   ├── content-filter-options.js
│   │   │   │   │   ├── list-sort-bar.js
│   │   │   │   │   ├── media-filter-bar.js
│   │   │   │   │   ├── review-filter-bar.js
│   │   │   │   │   └── search-movie-filter-bar.js
│   │   │   │   ├── activity.js
│   │   │   │   ├── content-filter-primitives.js
│   │   │   │   ├── filtering.js
│   │   │   │   ├── lists.js
│   │   │   │   ├── media.js
│   │   │   │   └── reviews.js
│   │   │   ├── layouts
│   │   │   │   ├── account-background-registry.js
│   │   │   │   ├── account-grid-frame.js
│   │   │   │   ├── account-layout.js
│   │   │   │   └── account-profile-context.js
│   │   │   ├── pages
│   │   │   │   └── account-route-page.js
│   │   │   ├── sections
│   │   │   │   ├── collections
│   │   │   │   │   ├── likes-collection.js
│   │   │   │   │   ├── media-collection-feed.js
│   │   │   │   │   ├── watched-collection.js
│   │   │   │   │   └── watchlist-collection.js
│   │   │   │   ├── edit
│   │   │   │   │   ├── account-edit-primitives.js
│   │   │   │   │   ├── account-edit-view.js
│   │   │   │   │   ├── account-general-settings-form.js
│   │   │   │   │   └── account-security-settings.js
│   │   │   │   ├── feeds
│   │   │   │   │   ├── activity.js
│   │   │   │   │   └── reviews.js
│   │   │   │   ├── lists
│   │   │   │   │   ├── list-detail-comments.js
│   │   │   │   │   ├── list-detail-config.js
│   │   │   │   │   ├── list-detail.js
│   │   │   │   │   ├── lists-collection.js
│   │   │   │   │   └── use-list-detail-filters.js
│   │   │   │   ├── overview
│   │   │   │   │   ├── account-overview-client.js
│   │   │   │   │   ├── activity.js
│   │   │   │   │   ├── favorites.js
│   │   │   │   │   ├── lists.js
│   │   │   │   │   ├── media-overview-section.js
│   │   │   │   │   ├── overview-feed.js
│   │   │   │   │   ├── reviews.js
│   │   │   │   │   ├── watched.js
│   │   │   │   │   └── watchlist.js
│   │   │   │   ├── account-hero.js
│   │   │   │   ├── account-section-factory.js
│   │   │   │   └── account-section.js
│   │   │   └── skeletons.js
│   │   └── utils
│   │       ├── avatar.js
│   │       ├── constants.js
│   │       ├── feedback.js
│   │       ├── filtering-query-utils.js
│   │       ├── filtering-shared.js
│   │       ├── formatting.js
│   │       ├── media-card.js
│   │       ├── security.js
│   │       ├── supabase.js
│   │       ├── uuid.js
│   │       └── validation.js
│   ├── auth
│   │   ├── client
│   │   │   ├── http.js
│   │   │   ├── requests.js
│   │   │   ├── sign-in.js
│   │   │   ├── sign-up.js
│   │   │   └── storage.js
│   │   ├── server
│   │   │   ├── actions
│   │   │   │   └── audit-log.server.js
│   │   │   ├── account-routes.server.js
│   │   │   ├── account.server.js
│   │   │   ├── admin.server.js
│   │   │   ├── api-handlers.server.js
│   │   │   ├── audit-log.server.js
│   │   │   ├── google-provider.server.js
│   │   │   ├── password-status.server.js
│   │   │   ├── policies.server.js
│   │   │   ├── proof-tokens.server.js
│   │   │   ├── response.server.js
│   │   │   ├── security.server.js
│   │   │   ├── session.server.js
│   │   │   ├── tokens.server.js
│   │   │   └── verification.server.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── form-primitives.js
│   │   │   │   ├── oauth-provider-button.js
│   │   │   │   └── oauth-provider-list.js
│   │   │   └── layouts
│   │   │       └── page-shell.js
│   │   └── utils
│   │       ├── constants.js
│   │       ├── errors.js
│   │       ├── oauth.js
│   │       ├── password.js
│   │       ├── providers.js
│   │       └── routes.js
│   ├── home
│   │   ├── client
│   │   │   └── use-discover-feed.js
│   │   ├── server
│   │   │   └── imdb-top-100.server.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   └── poster-rail.js
│   │   │   ├── layouts
│   │   │   │   ├── home-grid-frame.js
│   │   │   │   └── home-section.js
│   │   │   └── sections
│   │   │       ├── discover-section.js
│   │   │       ├── home-rail-section.js
│   │   │       ├── top-rated-section.js
│   │   │       └── trending-section.js
│   │   └── utils
│   │       ├── discover.js
│   │       └── imdb-top-100-data.js
│   ├── legal
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   └── quick-links.js
│   │   │   └── layouts
│   │   │       └── page-shell.js
│   │   └── utils
│   │       ├── constants.js
│   │       └── formatting.js
│   ├── media
│   │   ├── client
│   │   │   ├── likes.js
│   │   │   ├── lists.js
│   │   │   ├── social-proof.js
│   │   │   ├── watched.js
│   │   │   └── watchlist.js
│   │   ├── server
│   │   │   ├── list-like-route.server.js
│   │   │   ├── movie-awards.server.js
│   │   │   ├── person-awards.server.js
│   │   │   ├── title-route.server.js
│   │   │   └── tv-season-ratings.server.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── collection-actions.js
│   │   │   │   ├── context-menu-actions.js
│   │   │   │   ├── filmography-card.js
│   │   │   │   ├── list-preview-composition.js
│   │   │   │   ├── media-poster-card.js
│   │   │   │   ├── media-thumb.js
│   │   │   │   ├── person-bio.js
│   │   │   │   ├── recommendation-card.js
│   │   │   │   ├── sidebar.js
│   │   │   │   ├── social-links.js
│   │   │   │   ├── social-proof.js
│   │   │   │   ├── static-route-elements.js
│   │   │   │   └── tv-season-ratings.js
│   │   │   ├── layouts
│   │   │   │   ├── media-detail-section.js
│   │   │   │   ├── media-grid-frame.js
│   │   │   │   └── person-grid-frame.js
│   │   │   ├── sections
│   │   │   │   ├── awards-section.js
│   │   │   │   ├── cast-section.js
│   │   │   │   ├── filmography-section.js
│   │   │   │   ├── gallery-section.js
│   │   │   │   ├── images-section.js
│   │   │   │   ├── movie-awards-section.js
│   │   │   │   ├── seasons-section.js
│   │   │   │   ├── timeline-section.js
│   │   │   │   └── videos-section.js
│   │   │   └── skeletons.js
│   │   └── utils
│   │       ├── background-preferences.js
│   │       ├── constants.js
│   │       ├── media-data.js
│   │       ├── media-key.js
│   │       ├── media-payload.js
│   │       ├── person-data.js
│   │       └── poster-preferences.js
│   ├── reviews
│   │   ├── client
│   │   │   ├── mutations.js
│   │   │   ├── queries.js
│   │   │   └── subscriptions.js
│   │   ├── hooks
│   │   │   └── use-media-reviews.js
│   │   ├── server
│   │   │   ├── actions.server.js
│   │   │   ├── feeds.server.js
│   │   │   ├── resources.server.js
│   │   │   └── routes.server.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── rating-range-selector.js
│   │   │   │   ├── rating-selector.js
│   │   │   │   ├── rating-stars.js
│   │   │   │   ├── review-auth-fallback.js
│   │   │   │   ├── review-card.js
│   │   │   │   ├── review-header.js
│   │   │   │   └── review-list.js
│   │   │   └── sections
│   │   │       └── media-reviews.js
│   │   └── utils
│   │       ├── constants.js
│   │       ├── formatting.js
│   │       └── validation.js
│   ├── search
│   │   ├── client
│   │   │   ├── search-api.js
│   │   │   └── search-cache.js
│   │   ├── server
│   │   │   └── community-route.server.js
│   │   ├── ui
│   │   └── utils
│   │       ├── constants.js
│   │       ├── ranking.js
│   │       ├── result.js
│   │       └── text.js
│   ├── shell
│   │   ├── layout
│   │   │   ├── grid-crosshair.js
│   │   │   ├── nav-height-spacer.js
│   │   │   ├── not-found-template.js
│   │   │   └── page-gradient-shell.js
│   │   ├── modals
│   │   │   ├── account-social-modal.js
│   │   │   ├── cast-modal.js
│   │   │   ├── image-preview-modal.js
│   │   │   ├── notifications-modal.js
│   │   │   ├── social-proof-modal.js
│   │   │   └── video-preview-modal.js
│   │   ├── navigation
│   │   │   ├── action
│   │   │   │   ├── account-action.js
│   │   │   │   ├── constants.js
│   │   │   │   ├── forgot-password-action.js
│   │   │   │   ├── movie-action.js
│   │   │   │   ├── not-found-action.js
│   │   │   │   ├── person-action.js
│   │   │   │   ├── review-action.js
│   │   │   │   └── search-action.js
│   │   │   └── surfaces
│   │   │       ├── account-bio-surface.js
│   │   │       ├── confirmation-surface.js
│   │   │       ├── file-upload-surface.js
│   │   │       ├── list-create-surface.js
│   │   │       ├── list-editor-surface.js
│   │   │       ├── list-picker-surface.js
│   │   │       ├── list-primitives.js
│   │   │       ├── person-bio-surface.js
│   │   │       ├── review-editor-surface.js
│   │   │       ├── verification-surface.js
│   │   │       └── watch-providers-surface.js
│   │   └── shared
│   │       ├── components
│   │       │   ├── feedback
│   │       │   │   ├── empty-state.js
│   │       │   │   ├── fullscreen-state.js
│   │       │   │   └── spinner.js
│   │       │   ├── adaptive-image.js
│   │       │   ├── media-card.js
│   │       │   ├── media-carousel.js
│   │       │   └── segmented-control.js
│   │       ├── hooks
│   │       │   ├── use-click-outside.js
│   │       │   ├── use-debounce.js
│   │       │   └── use-draggable-scroll.js
│   │       ├── constants.js
│   │       ├── events.js
│   │       └── utils.js
│   └── social
│       ├── client
│       │   ├── activity.js
│       │   ├── follows.js
│       │   └── notifications.js
│       ├── server
│       │   ├── activity.server.js
│       │   ├── follows.server.js
│       │   ├── notifications.server.js
│       │   └── social-proof.server.js
│       ├── ui
│       └── utils
│           ├── constants.js
│           └── formatting.js
├── infrastructure
│   ├── http
│   │   ├── api
│   │   │   └── rollout.server.js
│   │   ├── api-request-service.js
│   │   ├── api-response.server.js
│   │   ├── api-result.js
│   │   ├── app-error.js
│   │   ├── cache-policy.server.js
│   │   ├── http-client.js
│   │   ├── http-server.js
│   │   ├── index.js
│   │   ├── memory-cache.server.js
│   │   ├── rate-limiter.server.js
│   │   ├── request-meta.server.js
│   │   ├── route-context.server.js
│   │   ├── runtime-policy-constants.js
│   │   ├── supabase-data-service.js
│   │   ├── supabase-edge-internal.server.js
│   │   ├── write-rollout-config.server.js
│   │   ├── write-rollout-executor.server.js
│   │   └── write-rollout.server.js
│   ├── jobs
│   │   ├── app-event-queue.server.js
│   │   └── app-events-route.server.js
│   ├── observability
│   │   └── feedback.server.js
│   ├── realtime
│   │   ├── api
│   │   │   ├── live-updates-events.server.js
│   │   │   └── live-updates.server.js
│   │   ├── live-updates-service.js
│   │   ├── polling-subscription-service.js
│   │   ├── polling-subscription-shared.js
│   │   ├── realtime-broadcast.server.js
│   │   ├── realtime-transport-config.js
│   │   └── user-events.server.js
│   ├── runtime
│   │   └── health.server.js
│   ├── supabase
│   │   ├── admin.js
│   │   ├── auth-storage.js
│   │   ├── proxy.js
│   │   ├── response-client.server.js
│   │   ├── supabase-client.js
│   │   ├── supabase-constants.js
│   │   └── supabase-server.js
│   └── tmdb
│       ├── api
│       │   └── route.server.js
│       ├── clients
│       │   ├── search
│       │   │   ├── fallback-queries.js
│       │   │   ├── movie-ranking.js
│       │   │   ├── person-ranking.js
│       │   │   └── tmdb-search-shared.js
│       │   ├── catalog.server.js
│       │   ├── detail-id.server.js
│       │   ├── details.server.js
│       │   ├── request.js
│       │   ├── runtime-sanitize.server.js
│       │   ├── sanitize.js
│       │   ├── search-ranking.js
│       │   ├── search.server.js
│       │   ├── tmdb-client-config.js
│       │   └── tmdb-server-client.js
│       └── services
│           ├── tmdb-http.client.js
│           ├── tmdb-movie-images.client.js
│           ├── tmdb-service.js
│           └── watch-region.js
├── modules
│   ├── account
│   │   ├── client.js
│   │   ├── context.js
│   │   ├── hooks.js
│   │   └── index.js
│   ├── api
│   │   ├── cache.js
│   │   └── index.js
│   ├── auth
│   │   ├── adapters
│   │   │   ├── api.js
│   │   │   ├── create-adapter.js
│   │   │   └── supabase-adapter.js
│   │   ├── action-flows.js
│   │   ├── config.js
│   │   ├── context.js
│   │   ├── guards.js
│   │   ├── http.client.js
│   │   ├── index.js
│   │   ├── provider-utils.js
│   │   ├── session-client.js
│   │   ├── session-ready.js
│   │   ├── storage.js
│   │   └── utils.js
│   ├── background
│   │   ├── context.js
│   │   └── index.js
│   ├── context-menu
│   │   ├── context.js
│   │   ├── index.js
│   │   ├── menu-engine.js
│   │   ├── motion.js
│   │   └── renderer.js
│   ├── error-boundary
│   │   ├── core.js
│   │   ├── index.js
│   │   ├── integrations.js
│   │   ├── listener.js
│   │   └── reporter.js
│   ├── loading
│   │   ├── context.js
│   │   └── index.js
│   ├── modal
│   │   ├── config.js
│   │   ├── container.js
│   │   ├── context.js
│   │   ├── header.js
│   │   ├── index.js
│   │   ├── motion.js
│   │   ├── title.js
│   │   └── utils.js
│   ├── nav
│   │   ├── hooks
│   │   │   ├── index.js
│   │   │   ├── navigation-status-model.js
│   │   │   ├── use-action-height.js
│   │   │   ├── use-element-height.js
│   │   │   ├── use-nav-badge.js
│   │   │   ├── use-nav-height-controller.js
│   │   │   ├── use-nav-height.js
│   │   │   ├── use-nav-keyboard.js
│   │   │   ├── use-nav-viewport.js
│   │   │   ├── use-navigation-compact.js
│   │   │   ├── use-navigation-core.js
│   │   │   ├── use-navigation-display.js
│   │   │   ├── use-navigation-items.js
│   │   │   ├── use-navigation-layout.js
│   │   │   ├── use-navigation-status.js
│   │   │   ├── use-navigation.js
│   │   │   └── use-surface-stack.js
│   │   ├── actions.js
│   │   ├── context.js
│   │   ├── elements.js
│   │   ├── events.js
│   │   ├── guards.js
│   │   ├── index.js
│   │   ├── item.js
│   │   ├── layout.js
│   │   ├── motion.js
│   │   ├── state-machine.js
│   │   ├── surface-model.js
│   │   ├── surface.js
│   │   └── utils.js
│   ├── notification
│   │   ├── client-utils.js
│   │   ├── config.js
│   │   ├── context.js
│   │   ├── hooks.js
│   │   ├── index.js
│   │   ├── motion.js
│   │   └── overlay.js
│   └── registry
│       ├── plugins
│       │   └── index.js
│       ├── bootstrap.js
│       ├── constants.js
│       ├── context.js
│       ├── index.js
│       ├── injector.js
│       ├── route-registry.js
│       ├── store.js
│       └── use-registry.js
├── public
│   ├── fonts
│   │   ├── openai
│   │   │   ├── OpenAISans-Bold.woff2
│   │   │   ├── OpenAISans-BoldItalic.woff2
│   │   │   ├── OpenAISans-Light.woff2
│   │   │   ├── OpenAISans-LightItalic.woff2
│   │   │   ├── OpenAISans-Medium.woff2
│   │   │   ├── OpenAISans-MediumItalic.woff2
│   │   │   ├── OpenAISans-Regular.woff2
│   │   │   ├── OpenAISans-RegularItalic.woff2
│   │   │   ├── OpenAISans-Semibold.woff2
│   │   │   └── OpenAISans-SemiboldItalic.woff2
│   │   ├── zuume
│   │   │   └── Zuume-Bold.woff2
│   │   └── index.js
│   ├── images
│   │   ├── noise.png
│   │   └── noise.webp
│   ├── _headers
│   └── tvizzie.png
├── scripts
│   ├── register-alias.mjs
│   └── test-supabase-runtime.mjs
├── ui
│   └── primitives
│       ├── select
│       │   ├── async-select.js
│       │   ├── combobox.js
│       │   ├── default-select.js
│       │   ├── index.js
│       │   ├── multi-select.js
│       │   └── searchable-select.js
│       ├── button.js
│       ├── checkbox.js
│       ├── icon.js
│       ├── index.js
│       ├── input.js
│       ├── popover.js
│       ├── primitive-support.js
│       ├── select.js
│       ├── switch.js
│       ├── textarea.js
│       └── tooltip.js
├── .editorconfig
├── .env
├── .gitattributes
├── .gitignore
├── .prettierignore
├── .prettierrc.cjs
├── eslint.config.mjs
├── jsconfig.json
├── middleware.js
├── next.config.mjs
├── open-next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tailwind.config.js
└── wrangler.jsonc
```
