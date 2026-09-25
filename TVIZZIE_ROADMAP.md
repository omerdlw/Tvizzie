# Tvizzie — Odak & Amaç Rehberi

> **Motor (Şasi):** Base Framework v1.0.0 (`src/core` dokunulmaz / Immutable Core)  
> **Eski Referans Klasörü:** `/Users/omerdlw/Documents/Tvizzie Codes`  
> **Yeni Proje Klasörü:** `/Users/omerdlw/Documents/Tvizzie`  
> **GitHub:** `https://github.com/omerdlw/Tvizzie.git`

---

## 🎯 Temel İlke: "Olduğu Gibi Geçirmek Yok; Geliştirmek, Güçlendirmek Var"

Eski kodları birebir kopyalamıyoruz. Tvizzie'nin medya ve arama omurgasını **daha hızlı, daha dayanıklı, akıllı algoritmalarla donatılmış ve tam tip güvenli** olarak yeniden inşa ediyoruz.

Şimdilik Account / Auth gibi yan konularla vakit kaybetmiyoruz. Tüm odak sadece 2 ana sistem üzerinde:

---

## 🚀 İlk Yapılacak 2 Ana Sistem

### 1. TMDB Mimarisi, Algoritması, Altyapısı ve Sistemi
* **Referans:** `/Users/omerdlw/Documents/Tvizzie Codes/infrastructure/tmdb/`
* **Geliştirme & Güçlendirme Hedefleri:**
  - Sağlam, tip-güvenli ve hataya dayanıklı (resilient) TMDB API istemcisi.
  - Akıllı önbellekleme (Edge / Memory caching), Rate-Limit koruması ve fallback stratejileri.
  - Veri normalizasyonu ve tutarlı payload yapıları (Film, Dizi, Sezon, Bölüm, Oyuncu).
  - Yüksek performanslı veri çekme algoritmaları (paralel istekler, gereksiz yüklerden arındırılmış sorgular).

### 2. Search Mimarisi, Algoritması, Altyapısı ve Sistemi
* **Referans:** `/Users/omerdlw/Documents/Tvizzie Codes/domains/search/`
* **Geliştirme & Güçlendirme Hedefleri:**
  - Akıllı arama algoritması (Fuzzy matching, alaka düzeyi/relevancy ranking, popülerlik ağırlığı).
  - Çoklu arama desteği (Multi-search: Film, Dizi, Kişi/Oyuncu).
  - Hızlı ve optimize arama altyapısı (Debounce, prefetch, stale-while-revalidate, sıfır gereksiz network trafiği).
  - Hata toleranslı ve arama geçmişi/trend algoritmalarıyla zenginleştirilebilir altyapı.

---

## ⚠️ Temel Kurallar
* **Account/Auth:** Şimdilik pasif, hiçbir efor harcanmayacak.
* **Core Dokunulmazdır:** `src/core/` içine dokunulmaz. Tüm TMDB ve Search sistemleri `src/infrastructure/tmdb` ve `src/features/search` katmanlarında kurulur.
