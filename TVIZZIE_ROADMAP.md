# Tvizzie — Odak & Amaç Rehberi

> **Motor (Şasi):** Base Framework v1.0.0 (`src/core` dokunulmaz / Immutable Core)  
> **Eski Referans Klasörü:** `/Users/omerdlw/Documents/Tvizzie Codes`  
> **Yeni Proje Klasörü:** `/Users/omerdlw/Documents/Tvizzie`  
> **GitHub:** `https://github.com/omerdlw/Tvizzie.git`

---

## 🎯 Temel Amacımız

Tvizzie'yi Base Framework'ün sağlam, tip-güvenli ve yüksek performanslı mimarisi üzerine adım adım taşımak.

---

## 🚀 Öncelikli Geliştirme Sırası

1. **TMDB Mimarisi (İlk Adım):**
   * Eski referans: `/Users/omerdlw/Documents/Tvizzie Codes/infrastructure/tmdb/`
   * Yeni mimariye taşınacak: `src/infrastructure/tmdb/` (Server & Client adaptörleri, Result pattern uyumu, TypeScript tipleri).

2. **Search-Action & Arama Deneyimi:**
   * Film / Dizi arama Server Action'ları (`createSafeAction`).
   * Arama input'u, debounced hızlı sonuçlar ve filtreler.

3. **Movie & TV Sayfaları:**
   * `/movie/[id]` ve `/tv/[id]` rotaları.
   * Film/Dizi detay sayfaları, oyuncu kadrosu, sezon/bölüm listeleri, hero backdrop ve poster gösterimi.

---

## ⚠️ Kritik Kurallar

* **Account / Auth Şimdilik Pasif:** İlk aşamalarda account/auth altyapısına dokunulmayacak ve taşınmayacak. Tamamen TMDB ve medya gösterimine odaklanılacak.
* **Core Dokunulmazdır:** `src/core/` içine kod yazılmaz. Tüm yeni kodlar `src/infrastructure/` ve `src/features/` içine eklenir.
