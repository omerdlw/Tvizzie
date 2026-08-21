# Tvizzie - Proje Mimarisi ve Dosya Yapısı (AI & Geliştirici Kılavuzu)

Bu belge, **Tvizzie** projesinin mimari felsefesini, katmanlı klasör yapısını, veri akışını, temel tasarım kalıplarını ve tam dosya ağacını yapay zeka modellerinin (LLM/Agent) ve geliştiricilerin en yüksek verimle anlayabilmesi için detaylandırır.

---

## 1. Proje Özeti ve Teknoloji Yığını

**Tvizzie**, modern, yüksek performanslı ve sosyal odaklı bir Film, Dizi (TV) ve Kişi (Oyuncu/Yönetmen) takip ve inceleme platformudur (Letterboxd & Serializd benzeri).

### 🛠️ Ana Teknolojiler:

- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) + **React 19** (React Compiler desteği ile)
- **Backend & Veritabanı:** [Supabase](https://supabase.com/) (`@supabase/ssr`, PostgreSQL, Row-Level Security, Realtime SSE/Broadcast)
- **Harici Medya Verisi:** [TMDB (The Movie Database) API](https://developer.themoviedb.org/docs) (Çok katmanlı sunucu önbellekleme ve arama sıralama motoru ile)
- **Dağıtım / Edge:** [Cloudflare Pages & Workers](https://developers.cloudflare.com/) (`@opennextjs/cloudflare` + `wrangler`)
- **Stil & Tasarım:** [Tailwind CSS v4](https://tailwindcss.com/) + Özel CSS Değişkenleri (`app/globals.css`)
- **Tipografi:** _Zuume_ (Display/Başlıklar) & _OpenAISans_ (Arayüz/Gövde Metinleri)
- **Animasyon & Arayüz:** [Framer Motion](https://www.framer.com/motion/), [Lenis](https://lenis.darkroom.engineering/) (Smooth Scroll), [Radix UI](https://www.radix-ui.com/) Primitives, [Lucide React](https://lucide.dev/) / Iconify

---

## 2. Mimari Prensipler ve Katman Hiyerarşisi

Proje **Domain-Driven Design (DDD)** ve **Clean Architecture** prensiplerine göre yapılandırılmıştır. Kod tabanı 6 ana sütuna ayrılmıştır:

```
Root (@/)
├── app/               # [Sunum & Yönlendirme] Next.js 16 App Router (Sayfalar, Route Groups, API Routes)
├── domains/           # [İş Mantığı & Alanlar] Domain-bazlı modüller (account, media, auth, reviews, social...)
├── infrastructure/    # [Dış Entegrasyonlar] HTTP motoru, Supabase, TMDB, SSE/Realtime, Job Queue
├── modules/           # [Uygulama İskeleti] Global Nav, Modal, Context Menu, Notification, Registry sistemleri
├── shared/            # [Bağımsız Kernel] Katman bağımsız normalization, browser request ve motion primitive'leri
├── ui/                # [Tasarım Sistemi] Saf ve yeniden kullanılabilir atomik bileşenler (Button, Input, Select...)
├── public/            # [Statik Varlıklar] Fontlar (OpenAISans, Zuume), resimler, dokular
└── scripts/           # [Yardımcı Araçlar] DB Seed, Test ve Node Alias yardımcıları
```

### 📐 İçe Aktarma (Import) ve Katman Kuralları:

1. **Yol Takma Adı:** `@/*` proje kök dizinini (`./*`) temsil eder (`jsconfig.json` ve `package.json` imports tanımlı).
2. **Bağımlılık Yönü:**
   - `app/` ➔ `domains/`, `modules/`, `ui/`, `infrastructure/`, `shared/` kullanabilir.
   - `domains/` ➔ `modules/`, `ui/`, `infrastructure/`, `shared/` kullanabilir; `app/` katmanına bağımlı olamaz.
   - `modules/` ➔ `ui/`, `shared/` ve doğrudan third-party package'ları kullanabilir; `domains/`, `app/` veya project-specific `infrastructure/` bağımlılığı içermez.
   - `shared/` ➔ `app/`, `domains/`, `modules/` veya `infrastructure/` bağımlılığı içermez.
   - `infrastructure/` ➔ dış servis ve transport katmanlarını sahiplenir; yalnız açık server-domain contracts üzerinden orchestration yapabilir, UI veya `app/` bağımlılığı içermez.
   - `ui/` ➔ Saf bileşen katmanıdır; iş mantığı veya domain verisi içermez.

---

## 3. Katmanların Derinlemesine Analizi

### 3.1. `app/` — Next.js 16 App Router

Sayfalar, yönlendirme grupları (`Route Groups`), API uç noktaları ve genel sayfa iskeletini barındırır.

- **`(home)`:** Ana keşif sayfası, öne çıkan içerikler ve trendler.
- **`(media)`:** Film (`movie/[id]`), Dizi (`tv/[id]`), Kişi (`person/[id]`) ve detaylı inceleme sayfaları.
- **`(account)`:** Kullanıcı profili (`account/[username]`), aktivite, izlenenler, izleme listesi, beğeniler, özel listeler ve profil düzenleme.
- **`(auth)`:** Giriş (`sign-in`), kayıt (`sign-up`), e-posta doğrulama ve OAuth callback sayfaları.
- **`(legal)`:** Gizlilik politikası ve kullanım şartları.
- **`_shell/`:** Genel navigasyon runtime'ı, geçiş yakalayıcıları ve etkileşim sınırları.
- **`api/`:** Sunucu tarafı REST/Edge API rotaları (Auth, TMDB proxy, Hesap işlemleri, Sosyal aktiviteler, Arama, SSE bildirimleri).
- **`globals.css` / `layout.js` / `providers.js`:** Kök sağlayıcılar (Auth, Navigation, Context Menu, Modal, Theme) ve global stiller.

#### 💡 Sunucu/İstemci Ayrımı:

- **`page.js` (Server Component):** Metadata ve server data ownership için varsayılan route entry point'tir.
- **Client boundary:** Yalnız state, browser API, event handler veya client hook gerektiren en küçük alt ağaçta `"use client"` kullanılır. `page.js → client.js` ayrımı zorunlu bir template değildir; statik legal rotalarda olduğu gibi server-first rendering korunur.

#### Dosya ve Runtime İsimlendirme Sözleşmesi

- **Framework dosyaları:** `page.js`, `layout.js`, `loading.js`, `error.js`, `not-found.js` ve `route.js` Next.js anlamlarını korur; semantic isim uğruna yeniden adlandırılmaz.
- **HTTP transport ownership:** Varsayılan olarak `Request`, `NextResponse`, request body/query parsing ve status-code mapping ilgili `app/api/**/route.js` dosyasının sorumluluğudur. Bir domain transport adapter'ı ancak birden fazla endpoint arasında güvenlik, cookie veya response contract'ı merkezileştiriyorsa korunur; tek-consumer route shim'leri oluşturulmaz.
- **Dedicated runtime dizinleri:** `server/` ve `client/` dizinleri runtime bilgisinin primary owner'ıdır. Bu dizinlerde dosya adı yalnız davranışı anlatır; aynı bilgi `.server.js` veya `.client.js` ile tekrarlanmaz.
- **Mixed runtime dizinleri:** `ui/`, `infrastructure/` veya başka bir mixed dizinde runtime boundary öncelikle source directive ve import graph ile ifade edilir. Runtime suffix yalnız import güvenliği için gerçek bir değer sağladığında kullanılır; `ui/pages` ve domain registry dosyalarında `.client` tekrarı yapılmaz.
- **Semantic route implementation:** Route implementation dosyaları generic `client.js`, `server.js`, `Client` veya `View` yerine temsil ettiği davranışı anlatır (`media-detail.js`, `MediaDetail`). Client runtime gerekiyorsa dosyanın başındaki `"use client"` directive'i source of truth'tür.
- **Tek sinyal ilkesi:** `server/title-route.server.js` veya `client/account-api.client.js` gibi aynı runtime bilgisini birden fazla kez encode eden isimler kullanılmaz.
- **Skeleton ownership:** Domain'e ait skeleton primitive'leri yalnız `domains/<domain>/ui/skeletons.js` içinde tanımlanır. Route'a özgü bütüncül görünüm ilgili App Router `loading.js` dosyasında bu primitive'ler compose edilerek kurulur; `*-skeleton.client.js` gibi paralel page dosyaları oluşturulmaz.
- **Ortak media-type contract'ı:** `movie`, `tv`, `person`, `list` ve `user` type vocabulary'si `shared/media-type.js` tarafından sahiplenilir. Infrastructure adapter'ları domain utility'lerine ters yönde bağımlı olmaz.

---

### 3.2. `domains/` — İş Mantığı (Domain-Driven Modules)

Her domain kendi içinde bağımsız bir modül gibi davranır:

| Domain        | Sorumluluk & İçerik                                                                                                                         |
| :------------ | :------------------------------------------------------------------------------------------------------------------------------------------ |
| **`account`** | Kullanıcı profili, istatistikler, avatar yükleme, profil güncelleme, takipçi/takip edilen ilişkileri, listeler ve özel medya filtreleme.    |
| **`auth`**    | Supabase kimlik doğrulama, oturum yaşam döngüsü, Google OAuth, şifre sıfırlama, güvenlik token'ları ve audit logging.                       |
| **`home`**    | Ana sayfa keşif akışı (`discover-feed`), IMDb Top 100 verisi ve öne çıkan içerik bölümleri.                                                 |
| **`legal`**   | Yasal metinler, sözleşme içerikleri ve biçimlendirme.                                                                                       |
| **`media`**   | Film/Dizi/Kişi detay kartları, ödüller (Oscars, Bafta, Emmy), sezon/bölüm reyting grafikleri, izleme listesi / beğenme / izlendi durumları. |
| **`reviews`** | Kullanıcı incelemeleri, puanlama sistemi, spoiler koruması, inceleme beğenileri ve yorumları.                                               |
| **`search`**  | TMDB ve yerel topluluk hibrit araması, arama sonuçları sıralama ve metin eşleştirme motoru.                                                 |
| **`shell`**   | Uygulama ana kabuğu, gezinme çubuğu aksiyonları, modal pencereleri (resim/video önizleme, bildirimler, sosyal kanıt).                       |
| **`social`**  | Kullanıcı aktiviteleri akışı, takip sistemi, gerçek zamanlı bildirimler ve sosyal kanıt (social proof) verisi.                              |

_Her domain genellikle şu alt dizinlere sahiptir:_

- `client/`: İstemci tarafı API çağrıları ve veri yönetim servisleri.
- `server/`: Sunucu tarafı domain işlemleri, page-data composition ve veri erişimi. App Router HTTP adaptörleri `app/api/**/route.js` içinde kalır.
- `ui/`: Domain'e özgü UI bileşenleri, bölümler (`sections/`) ve iskelet yükleme durumları (`skeletons.js`).
- `hooks/`: Durum yönetimi ve veri yakalama için özel React kancaları.
- `utils/`: Domain sabitleri, doğrulama şemaları ve biçimlendiriciler.

---

### 3.3. `infrastructure/` — Dış Servisler ve Altyapı

Sistem altyapısı ve üçüncü parti entegrasyonlarını soyutlar:

- **`http/`:** Standartlaştırılmış API yanıt şablonları (`ApiResponse`), hata sınıfları (`AppError`), bellek içi önbellek (`memory-cache`), istek hız sınırlayıcı (`rate-limiter`) ve aşamalı dağıtım (`write-rollout`).
- **`supabase/`:** Sunucu ve istemci SSR Supabase istemcileri (`createClient`), admin yetkili servis istemcisi, auth token saklama ve proxy yönetimi.
- **`tmdb/`:** TMDB REST API entegrasyonu, katalog sorgulayıcı, detay ve ödül toplayıcı, arama sonuçları ağırlıklandırma/sıralama algoritmaları ve görsel yardımcıları.
- **`realtime/`:** Server-Sent Events (SSE) altyapısı, canlı güncelleme yayınları (`realtime-broadcast`), polling fallback servisi ve kullanıcı olayları yöneticisi.
- **`jobs/`:** Uygulama içi asenkron arka plan görevleri ve kuyruk yönetimi (`app-event-queue`).
- **`observability/`:** Kullanıcı geri bildirimleri ve web hayati değerleri (`web-vitals`) telemetrisi.
- **`runtime/`:** Uygulama sağlık kontrolü (`health.server.js`).

---

### 3.4. `modules/` — Çekirdek Uygulama Primitives

Uygulama genelinde paylaşılan mikro mimariler:

`modules/account` ve `modules/auth`, Tvizzie domain implementation'ı değil; farklı projelere taşınabilen hesap/oturum runtime foundation'ıdır. Tvizzie'ye özgü profil, liste, route ve Supabase veri davranışları `domains/account`, `domains/auth` ve açık adapter seam'lerinde kalır. Bu nedenle dependency yönü `domains/account|auth → modules/account|auth` şeklindedir; tersi yönde import yapılmaz.

- **`nav/`:** Akıllı gezinme sistemi; context tabanlı state ownership, klavye kısayolları, dinamik yükseklik ve yüzey yönetimi (`surface-model`) sunan menü motoru.
- **`modal/`:** Global, animasyonlu, yığınlanabilir modal (diyalog) yönetim altyapısı.
- **`context-menu/`:** Sağ tık / uzun basma menü motoru ve tetikleyicileri.
- **`notification/`:** Toast ve kalıcı bildirim sistemi.
- **`registry/`:** Rota ve eklenti kayıt motoru (Plugin / Registry Architecture).
- **`error-boundary/`:** Hata yakalama, raporlama ve kurtarma sınırları.
- **`auth` & `account`:** Oturum durumu ve hesap bağlamı sağlayıcıları.
- **`background` / `loading`:** Global arka plan efektleri ve yükleme durumları.

---

### 3.5. `ui/` — Atomik Tasarım Sistemi (UI Primitives)

Saf, domainden bağımsız, erişilebilir (Radix destekli) ve Tailwind ile stillendirilmiş temel bileşenler:

- `button.js`: Dinamik varyantlı (primary, secondary, ghost, danger vb.) butonlar.
- `input.js` & `textarea.js`: Form giriş elemanları.
- `select/`: Standart Select, Combobox, Multi-Select, Searchable Select ve Async Select bileşenleri.
- `checkbox.js`, `switch.js`: Seçim kontrol elemanları.
- `popover.js`, `tooltip.js`: Bağlamsal açılır kutular ve ipuçları.
- `icon.js`: Optimize edilmiş ikon render motoru.

---

### 3.6. `public/` & `scripts/`

- **`public/fonts/`:** Özel web fontları — _OpenAISans_ (Light, Regular, Medium, Semibold, Bold ve Italic) ve _Zuume_ (Bold).
- **`public/images/`:** Arka plan greni (noise) ve logo varlıkları.
- **`scripts/`:** Veritabanı testleri (`test-supabase-runtime.mjs`), geliştirme verisi tohumlama (`dev-seed-dataset.mjs`) ve modül takma ad kayıtçısı (`register-alias.mjs`).

---

## 4. Temel Tasarım Desenleri & AI Geliştirici Kuralları

Yapay zeka modelleri ve ajanlar kod üretirken veya düzenlerken aşağıdaki kurallara **kesinlikle** uymalıdır:

1. **Katman İhlali Yapmayın:** `ui/primitives` içine doğrudan veritabanı sorgusu veya domain mantığı koymayın. Domain mantığını `domains/<alan>/` altında tutun.
2. **Server/Client Ayrımı:** Veri getirme ve metadata ownership'ini Server Components içinde tutun; `"use client"` sınırını yalnız browser davranışı gerektiren en küçük cohesive subtree'ye uygulayın.
3. **Stil Bütünlüğü:**
   - Tailwind CSS v4 ve `app/globals.css` içindeki CSS değişkenlerini (`--bg-*`, `--text-*`, `--border-*`) kullanın.
   - Başlık ve büyük vurgu metinlerinde `font-zuume` / `tracking-wider`, gövde ve UI elemanlarında `font-sans` (OpenAISans) tercih edin.
4. **Veri Güvenliği ve Doğrulama:** API rotalarında ve sunucu işlemlerinde (`infrastructure/http/api-response.server.js` ve `AppError`) standart hata formatını kullanın.
5. **Önbellek & Edge Uyumluluğu:** Cloudflare Workers / Pages ortamı gözetilerek Node.js'e özgü native modüller yerine standart Web API'leri (`fetch`, `Request`, `Response`, `crypto`) ve `@supabase/ssr` desenleri kullanılmalıdır.

---

## 5. Tam Dosya Ağacı (Current File Tree)

Aşağıda projenin tüm güncel dosya ve dizin yapısı eksiksiz olarak listelenmiştir (`.git`, `.next`, `node_modules` hariç):

```text
.
├── .github
│   └── workflows
│       └── ci.yml
├── .vscode
│   └── settings.json
├── app
│   ├── _shell
│   │   ├── navigation
│   │   │   ├── account-nav-links.js
│   │   │   └── account-nav-registry.js
│   │   ├── compose-providers.js
│   │   ├── global-context-menu-registry.js
│   │   ├── interactive-boundary.js
│   │   ├── nav-runtime.js
│   │   ├── navigation-config.js
│   │   └── smooth-scroll.js
│   ├── (account)
│   │   ├── account
│   │   │   ├── [username]
│   │   │   │   ├── activity
│   │   │   │   │   └── page.js
│   │   │   │   ├── likes
│   │   │   │   │   └── page.js
│   │   │   │   ├── lists
│   │   │   │   │   ├── [slug]
│   │   │   │   │   │   ├── loading.js
│   │   │   │   │   │   └── page.js
│   │   │   │   │   └── page.js
│   │   │   │   ├── reviews
│   │   │   │   │   └── page.js
│   │   │   │   ├── watched
│   │   │   │   │   └── page.js
│   │   │   │   ├── watchlist
│   │   │   │   │   └── page.js
│   │   │   │   ├── layout.js
│   │   │   │   ├── loading.js
│   │   │   │   ├── not-found.js
│   │   │   │   └── page.js
│   │   │   ├── edit
│   │   │   │   ├── loading.js
│   │   │   │   ├── not-found.js
│   │   │   │   └── page.js
│   │   │   ├── error.js
│   │   │   ├── loading.js
│   │   │   ├── not-found.js
│   │   │   └── page.js
│   │   └── layout.js
│   ├── (auth)
│   │   ├── callback
│   │   │   └── page.js
│   │   ├── sign-in
│   │   │   └── page.js
│   │   ├── sign-up
│   │   │   └── page.js
│   │   ├── error.js
│   │   ├── layout.js
│   │   └── loading.js
│   ├── (home)
│   │   ├── error.js
│   │   ├── loading.js
│   │   └── page.js
│   ├── (legal)
│   │   ├── privacy
│   │   │   └── page.js
│   │   ├── terms
│   │   │   └── page.js
│   │   ├── error.js
│   │   └── loading.js
│   ├── (media)
│   │   ├── movie
│   │   │   └── [id]
│   │   │       ├── reviews
│   │   │       │   └── page.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── person
│   │   │   └── [id]
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   ├── tv
│   │   │   └── [id]
│   │   │       ├── reviews
│   │   │       │   └── page.js
│   │   │       ├── loading.js
│   │   │       ├── not-found.js
│   │   │       └── page.js
│   │   └── layout.js
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
│   │   │   ├── account-api.js
│   │   │   ├── collections.js
│   │   │   ├── lists.js
│   │   │   └── profile.js
│   │   ├── hooks
│   │   │   ├── account-edit-data.js
│   │   │   ├── account-edit-page-state.js
│   │   │   ├── account-overview-state.js
│   │   │   ├── account-section-state.js
│   │   │   ├── collections.js
│   │   │   ├── feed-state.js
│   │   │   ├── list-items.js
│   │   │   ├── media-feed-state.js
│   │   │   ├── page-actions.js
│   │   │   ├── page-data.js
│   │   │   ├── relationship.js
│   │   │   ├── section-page.js
│   │   │   └── security.js
│   │   ├── server
│   │   │   ├── collections.js
│   │   │   ├── feed.js
│   │   │   ├── media-upload.js
│   │   │   ├── page-data.js
│   │   │   ├── profile.js
│   │   │   └── request-target.js
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
│   │   │   │   ├── account-layout.js
│   │   │   │   └── account-profile-context.js
│   │   │   ├── pages
│   │   │   │   ├── account-activity.js
│   │   │   │   ├── account-edit.js
│   │   │   │   ├── account-likes.js
│   │   │   │   ├── account-list-detail.js
│   │   │   │   ├── account-lists.js
│   │   │   │   ├── account-overview.js
│   │   │   │   ├── account-reviews.js
│   │   │   │   ├── account-route-page.js
│   │   │   │   ├── account-watched.js
│   │   │   │   └── account-watchlist.js
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
│   │   │   ├── registry.js
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
│   │   │   ├── requests.js
│   │   │   ├── sign-in.js
│   │   │   ├── sign-up.js
│   │   │   └── storage.js
│   │   ├── server
│   │   │   ├── actions
│   │   │   │   └── audit-log.js
│   │   │   ├── account-routes.js
│   │   │   ├── account.js
│   │   │   ├── admin.js
│   │   │   ├── api-handlers.js
│   │   │   ├── audit-log.js
│   │   │   ├── password-status.js
│   │   │   ├── policies.js
│   │   │   ├── proof-tokens.js
│   │   │   ├── response.js
│   │   │   ├── security.js
│   │   │   ├── session.js
│   │   │   ├── tokens.js
│   │   │   └── verification.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   ├── form-primitives.js
│   │   │   │   ├── oauth-provider-button.js
│   │   │   │   └── oauth-provider-list.js
│   │   │   ├── layouts
│   │   │   │   └── page-shell.js
│   │   │   └── pages
│   │   │       ├── oauth-callback.js
│   │   │       ├── sign-in.js
│   │   │       └── sign-up.js
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
│   │   │   └── imdb-top-100.js
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   └── poster-rail.js
│   │   │   ├── layouts
│   │   │   │   └── home-section.js
│   │   │   ├── pages
│   │   │   │   └── home.js
│   │   │   ├── sections
│   │   │   │   ├── discover-section.js
│   │   │   │   └── home-rail-section.js
│   │   │   └── registry.js
│   │   └── utils
│   │       ├── discover.js
│   │       └── imdb-top-100-data.js
│   ├── legal
│   │   ├── ui
│   │   │   ├── components
│   │   │   │   └── quick-links.js
│   │   │   ├── documents
│   │   │   │   ├── privacy-document.js
│   │   │   │   └── terms-document.js
│   │   │   ├── layouts
│   │   │   │   └── page-shell.js
│   │   │   └── registry.js
│   │   └── utils
│   │       └── constants.js
│   ├── media
│   │   ├── client
│   │   │   ├── likes.js
│   │   │   ├── social-proof.js
│   │   │   ├── watched.js
│   │   │   └── watchlist.js
│   │   ├── server
│   │   │   ├── movie-awards.js
│   │   │   ├── person-awards.js
│   │   │   ├── title-route.js
│   │   │   └── tv-season-ratings.js
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
│   │   │   │   └── tv-season-ratings.js
│   │   │   ├── layouts
│   │   │   │   └── media-detail-section.js
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
│   │   │   ├── pages
│   │   │   │   ├── media-detail.js
│   │   │   │   ├── media-reviews.js
│   │   │   │   └── person-detail.js
│   │   │   ├── registry.js
│   │   │   └── skeletons.js
│   │   └── utils
│   │       ├── background-preferences.js
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
│   │   │   ├── actions.js
│   │   │   ├── feeds.js
│   │   │   └── resources.js
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
│   │   │   └── community-search.js
│   │   └── utils
│   │       ├── constants.js
│   │       ├── ranking.js
│   │       ├── result.js
│   │       └── text.js
│   ├── shell
│   │   ├── modals
│   │   │   ├── account-social-modal.js
│   │   │   ├── cast-modal.js
│   │   │   ├── image-preview-modal.js
│   │   │   ├── notifications-modal.js
│   │   │   ├── social-proof-modal.js
│   │   │   └── video-preview-modal.js
│   │   ├── navigation
│   │   │   ├── actions
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
│   │   ├── ui
│   │   │   └── skeletons.js
│   │   └── not-found-template.js
│   └── social
│       ├── client
│       │   ├── activity.js
│       │   ├── follows.js
│       │   └── notifications.js
│       ├── server
│       │   ├── activity.js
│       │   ├── follows.js
│       │   ├── notifications.js
│       │   └── social-proof.js
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
│   │   ├── memory-cache.server.js
│   │   ├── rate-limiter.server.js
│   │   ├── request-meta.server.js
│   │   ├── route-context.server.js
│   │   ├── runtime-policy-constants.js
│   │   ├── supabase-data-service.js
│   │   └── write-rollout-config.server.js
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
│   │   ├── admin-client.server.js
│   │   ├── admin-config.server.js
│   │   ├── auth-storage.js
│   │   ├── browser-client.js
│   │   ├── public-config.js
│   │   ├── response-client.server.js
│   │   └── session-proxy.js
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
│   ├── auth
│   │   ├── adapters
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
│   │   └── motion.js
│   ├── nav
│   │   ├── hooks
│   │   │   ├── navigation-status-model.js
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
│   │   ├── action-styles.js
│   │   ├── actions.js
│   │   ├── context.js
│   │   ├── elements.js
│   │   ├── events.js
│   │   ├── guards.js
│   │   ├── index.js
│   │   ├── item.js
│   │   ├── layout.js
│   │   ├── motion.js
│   │   ├── nav-height-spacer.js
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
│       ├── apply-config.js
│       ├── bootstrap.js
│       ├── constants.js
│       ├── context.js
│       ├── index.js
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
├── shared
│   ├── hooks
│   │   ├── use-click-outside.js
│   │   ├── use-debounce.js
│   │   └── use-draggable-scroll.js
│   ├── client-request.js
│   ├── constants.js
│   ├── events.js
│   ├── feedback.js
│   ├── format.js
│   ├── image-policy.js
│   ├── media-type.js
│   ├── motion.js
│   ├── normalize.js
│   └── url.js
├── tests
│   └── characterization
│       ├── api-contracts.test.js
│       ├── auth-csrf.test.js
│       ├── client-request.test.js
│       ├── legal-route-boundary.test.js
│       ├── motion-foundation.test.js
│       ├── nav-contracts.test.js
│       ├── registry-store.test.js
│       ├── security-policy.test.js
│       ├── shared-normalize.test.js
│       └── supabase-boundary.test.js
├── ui
│   ├── class-names.js
│   ├── components
│   │   ├── adaptive-image.js
│   │   ├── media-card.js
│   │   ├── media-carousel.js
│   │   └── segmented-control.js
│   ├── feedback
│   │   ├── empty-state.js
│   │   ├── fullscreen-state.js
│   │   └── spinner.js
│   ├── layouts
│   │   ├── grid-crosshair.js
│   │   ├── page-gradient-shell.js
│   │   └── page-grid-frame.js
│   └── primitives
│       ├── select
│       │   ├── async-select.js
│       │   ├── combobox.js
│       │   ├── default-select.js
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
├── next.config.mjs
├── open-next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── proxy.js
├── tailwind.config.js
└── wrangler.jsonc
```
