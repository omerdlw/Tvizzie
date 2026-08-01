# Tvizzie Motion & Animation Design Guide

> **Core Philosophy**: "Sinematik, Akıcı ve Lüks Odaklı Animasyon Düzeni" (Cinematic, Fluid, & Luxury Motion Architecture).
> Every page transition and component micro-interaction in Tvizzie follows a unified mathematical foundation powered by Framer Motion and centralized tokens in `@/core/constants/motion`.

---

## 1. Central Easing Curves (`GLOBAL_MOTION_EASINGS`)

| Token Name | Curve Definition | Usage & Purpose |
| :--- | :--- | :--- |
| **`LUXURY` / `CINEMATIC`** | `cubic-bezier(0.19, 1, 0.22, 1)` | Primary deceleration curve for page containers, cards, headers, and hero titles. Provides a smooth, ultra-premium entrance. |
| **`SMOOTH`** | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Secondary ease curve for continuous background fades and secondary UI state shifts. |
| **`ACCENT`** | `cubic-bezier(0.32, 0.72, 0, 1)` | Emphasized curve for active tab indicators and badge highlights. |
| **`EXIT`** | `cubic-bezier(0.7, 0, 0.84, 0)` | Crisp exit curve for fast page dismissals and unmounting components. |

---

## 2. Duration Hierarchy (`GLOBAL_MOTION_DURATIONS`)

- **Background Reveal**: `2.2s` (Slow, ambient glow emergence)
- **Page Container**: `1.0s` (Full page fade-in with staggerChildren)
- **Section Reveal**: `0.85s` (Scroll/InView section entry)
- **Grid Card**: `0.75s` (Discover grid cards)
- **Rail Card**: `0.70s` (Trending horizontal carousel cards)
- **Item / Chip**: `0.55s - 0.70s` (Genre chips, filter buttons)
- **Stagger Step**: `0.08s - 0.10s` (Parent to child delay sequence)

---

## 3. Blur-Depth & Scale Tokens (`GLOBAL_MOTION_BLURS` & `GLOBAL_MOTION_SCALES`)

| Blur Level | Value | Applied Elements |
| :--- | :--- | :--- |
| **`LIGHT`** | `blur(12px)` | Buttons, taxonomy chips, list items, footers |
| **`MEDIUM`** | `blur(16px)` | Form headers, sidebar columns, main content columns, search cards |
| **`DEEP`** | `blur(20px)` | Section reveals, article containers, scroll reviews |
| **`CINEMATIC`** | `blur(24px)` | Background radial gradients, hero titles, poster reveals |

| Scale Level | Value | Applied Elements |
| :--- | :--- | :--- |
| **`COMPACT`** | `0.96` | Page exit scaling, review section triggers |
| **`CARD`** | `0.94` | Header containers, main content columns, section items |
| **`HERO`** | `0.92` | Discover & trending cards, cast cards, oauth items |
| **`DEEP`** | `0.88` | Poster initial reveals, app logo initial drop |

---

## 4. Spring Interactions (`GLOBAL_MOTION_SPRINGS`)

- **BUTTON / CHIP**: `{ type: 'spring', stiffness: 360, damping: 28, mass: 0.5 }` (Used for hover scale `1.03-1.05` and tap scale `0.95-0.97`)
- **CARD**: `{ type: 'spring', stiffness: 320, damping: 26, mass: 0.6 }` (Used for media & recommendation cards)
- **LOGO**: `{ type: 'spring', stiffness: 320, damping: 26, mass: 0.6 }` (Used for header brand logos)

---

## 5. Page-by-Page Motion Standard

```
+-----------------------------------------------------------------------------------+
| 1. Ambient Background (2.2s, delay: 0.25s)                                        |
| 2. Header / Hero Title (0.85s - 1.4s, blur: 24px -> 0px)                         |
| 3. Layout Columns / Sections (0.85s - 1.6s, slide x/y)                           |
| 4. Grid / Rail Cards (stagger: 0.04s - 0.10s, scale: 0.92 -> 1.0)                 |
+-----------------------------------------------------------------------------------+
```

- **Home Page**: Expressive radial background glow + staggered discover grid & trending rail reveal.
- **Media (Movie / TV)**: Dual-column slide (Sidebar `-44px`, Content `+44px`) + character-by-character BlurryText hero title.
- **Person Page**: Centered hero title + delayed bio blur fade + tabbed view transitions (Gallery, Filmography, Timeline, Awards).
- **Auth Pages**: Form field cascade + mode switch (Sign In / Reset Password / Sign Up steps).
- **Legal Pages**: Clean article container reveal + sticky quick-links aside slide.
- **Account Page**: Skipped for future implementation.
