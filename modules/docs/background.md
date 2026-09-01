# Module: Background

> Registry'den gelen image/video background tanımını state, playback ve overlay yaşam döngüsüyle birlikte yönetir.

## 1. Genel bakış

`modules/background`, uygulamanın arka planını tek bir provider ve overlay
yüzeyi üzerinden sunar. Image ve video kaynakları aynı state modelinde birleşir;
gradient, edge fade, noise, overlay, responsive width/fit ve motion kararları
modül içinde normalize edilir.

## 2. Sorumluluklar

### Sahip olduğu kararlar

- Registry background kaydını okumak ve source değişiminde state'i yenilemek
- Image/video yüzeyini ve overlay katmanlarını render etmek
- Autoplay, play/pause, mute, loop, playback rate ve crop davranışını yönetmek
- Width, fit, video class/style ve gradient ayarlarını çözümlemek
- Edge fade mask, noise ve overlay geçişlerini üretmek
- Background state ve action hook'larını sunmak

### Sahip olmadığı kararlar

- Hangi background kaydının seçileceği veya Registry'ye ne zaman yazılacağı
- Domain'in image/video URL'sini üretmesi
- Sayfa içi feature loading veya route transition state'i
- Video sağlayıcısının network/cache implementasyonu

## 3. Dosya sahipliği

| Dosya        | Sahip olduğu implementasyon                                      | Public mi? |
| ------------ | ---------------------------------------------------------------- | ---------- |
| `index.js`   | `BackgroundOverlay` ve public facade                             | Evet       |
| `model.js`   | Default state, merge/normalization, gradient ve motion hesapları | Dolaylı    |
| `runtime.js` | Provider, state/actions context'leri ve video lifecycle          | Dolaylı    |

`view.js` yoktur; overlay zaten provider ile aynı lifecycle'a sahip tek görsel
yüzeydir. `motion.js` de yoktur; background motion sözleşmesi `model.js` içinde
küçük ve birlikte değişen bir grup olarak tutulur.

## 4. Kurulum

Provider, Registry provider'ın altında bir kez mount edilmelidir:

```jsx
<RegistryProvider>
  <BackgroundProvider>
    <BackgroundOverlay />
    {children}
  </BackgroundProvider>
</RegistryProvider>
```

`BackgroundOverlay` provider'ın altında olmazsa state hook'larına erişemez.
Registry background kaydı kullanılmayacaksa `BackgroundProvider` yine manuel
`setBackground` action'ları için kullanılabilir.

## 5. Public interface

### 5.1 Provider ve hook'lar

| Export                         | Sözleşme                                                     |
| ------------------------------ | ------------------------------------------------------------ |
| `BackgroundProvider`           | Background state ve action context'lerini kurar              |
| `BackgroundOverlay`            | Image/video, gradient, noise ve overlay yüzeyini render eder |
| `useBackgroundState`           | Read-only normalized background ve playback state'i döndürür |
| `useBackgroundActions`         | Background ve video action'larını döndürür                   |
| `useOptionalBackgroundActions` | Provider yoksa `null`, varsa action facade'ı döndürür        |

State; `hasBackground`, `image`, `video`, `isVideo`, `position`, `overlay`,
`overlayOpacity`, `overlayColor`, `leftGradient`, `rightGradient`, `fadeEdges`,
`noiseStyle`, `imageStyle`, `videoStyle`, `videoClassName`, `className`, `width`,
`fit`, `videoOptions`, `animation` ve `isPlaying` alanlarını içerir.

Action facade'ı:

- `setBackground(patch)`
- `toggleVideo()`
- `toggleMute()`
- `toggleLoop()`
- `setVideoPlaying(isPlaying)`
- `setVideoElement(videoElement)`
- `resetBackground()`

### 5.2 Motion export'ları

Public facade ayrıca `BACKGROUND_ANIMATE_PRESENCE_MODE`, `BACKGROUND_EXIT_EASE`,
`BACKGROUND_OVERLAY_TRANSITION_CLASS`, `BACKGROUND_OVERLAY_TRANSITION_PROPERTY`,
`BACKGROUND_WILL_CHANGE`, `getBackgroundMotionConfig`, `toCssDelay`,
`toCssDuration` ve `toCssEasing` export eder.

## 6. Sözleşmeler ve kullanım örnekleri

### 6.1 Image background

```jsx
import { useEffect } from 'react';
import { useBackgroundActions } from '@/modules/background';

function HeroBackground({ image }) {
  const { setBackground } = useBackgroundActions();

  useEffect(() => {
    setBackground({
      image,
      position: 'center',
      overlay: true,
      overlayOpacity: 0.2,
      overlayColor: 'var(--black)',
      leftGradient: 3,
      rightGradient: 2,
      fadeEdges: { left: 18, right: 18 },
      noiseStyle: { opacity: 0.04, mixBlendMode: 'overlay' },
    });
  }, [image, setBackground]);

  return null;
}
```

Desteklenen temel image alanları `image`, `position`, `overlay`,
`overlayOpacity`, `overlayColor`, `leftGradient`, `rightGradient`, `fadeEdges`,
`imageStyle`, `noiseStyle`, `className` ve `animation`'dır.

### 6.2 Video background

```jsx
import { useEffect } from 'react';
import { useBackgroundActions } from '@/modules/background';

function HeroVideo({ src }) {
  const { setBackground } = useBackgroundActions();

  useEffect(() => {
    setBackground({
      video: src,
      videoOptions: {
        autoplay: true,
        muted: true,
        loop: false,
        playbackRate: 1,
        corp: 0,
        width: '70vw',
        fit: 'cover',
      },
    });
  }, [setBackground, src]);

  return null;
}
```

`videoOptions` içinde `autoplay`, `muted`, `loop`, `playbackRate`, `corp`,
`width`, `fit`, `objectFit`, `videoClassName` ve `className` kullanılabilir.
Top-level `width`, `fit`, `videoStyle`, `videoClassName` ve `className` değerleri
video yüzeyinin ölçü ve görünümünü belirler; top-level değerler ilgili nested
değerlerin önceliğine sahiptir.

### 6.3 Registry ile declarative kullanım

```jsx
import { usePageRegistry } from '@/modules/registry';

export function MediaPageRegistry({ media }) {
  usePageRegistry({
    registry: { source: 'media-page', priority: 200 },
    background: {
      image: media.backdropUrl,
      overlay: true,
      overlayOpacity: 0.24,
      position: 'center top',
    },
  });

  return null;
}
```

Registry kaydı kaldırıldığında background `DEFAULT_BACKGROUND` state'ine
döner. Aynı kaynak güncellenirse mevcut playback state korunur; image/video
kaynağı değişirse önceki kaynağın playback state'i taşınmaz.

### 6.4 State ve playback kontrolü

```jsx
function BackgroundControls() {
  const { isVideo, isPlaying, videoOptions } = useBackgroundState();
  const { toggleMute, toggleVideo } = useBackgroundActions();

  if (!isVideo) return null;

  return (
    <Controls
      muted={videoOptions?.muted}
      playing={isPlaying}
      onToggleMute={toggleMute}
      onTogglePlay={toggleVideo}
    />
  );
}
```

`play()` rejection'ları (autoplay policy, network veya browser kısıtı) fatal
hata sayılmaz. State güvenli biçimde güncellenir ve uygulama render'ı devam eder.

## 7. Yaşam döngüsü

```text
Registry background config
  -> BackgroundProvider
     -> source-aware state merge
     -> state/actions contexts
  -> BackgroundOverlay
     -> motion + style resolution
     -> image veya video surface
     -> playback + overlay layers
```

- Video element'i mount olduğunda `setVideoElement` ile runtime'a bağlanır.
- Element unmount olduğunda bağlantı `null` olarak temizlenir.
- `isPlaying`, muted, loop ve playback rate değişimleri mevcut element'e uygulanır.
- `corp` değeri videonun son kısmında `handleEnded` davranışını tetikler.
- `AnimatePresence` image/video değişimlerinde enter/exit geçişlerini yürütür.
- Gradient ve mask hesapları yalnızca geçerli width/fade config'i olduğunda
  etkinleşir.

## 8. Sınırlar, performans ve hata davranışı

- Geçersiz playback rate `1` değerine düşürülür.
- Video `play()` rejection'ları catch edilir; autoplay engeli uygulamayı bozmaz.
- State ve action context'leri ayrıdır; action-only tüketicileri gereksiz render almaz.
- Aynı video element'i tekrar bağlanırken gereksiz state update yapılmaz.
- Image URL'leri değiştirilmeden state'e yazılır; kaynak sağlayıcıya özel URL
  dönüşümü consuming application katmanında yapılır.
- `bg-cover`, `bg-center` gibi background class'ları video için `object-*`
  class'larına çevrilir.
- Overlay ve noise layer'ları pointer event almaz; sayfa etkileşimini engellemez.

## 9. Kurallar

1. Background seçimini feature veya Registry katmanında yapın; provider içine
   domain seçme kuralı koymayın.
2. `useBackgroundState` ile okuma, `useBackgroundActions` ile mutation yapın.
3. Video playback state'ini doğrudan DOM element'inde yönetmeyin.
4. Aynı sayfada birden fazla `BackgroundOverlay` mount etmeyin.
5. `videoOptions` ile top-level presentation alanlarını çelişkili vermeyin.
6. Autoplay'in garanti olmadığını UI ve kullanıcı akışında hesaba katın.
7. Yeni visual/motion davranışını `model.js` sözleşmesine ekleyin; index içinde
   ikinci bir token seti oluşturmayın.

## 10. Doğrulama

```bash
npx prettier --check modules/background/*.js modules/docs/background.md
npx eslint modules/background/*.js
npm test
npm run build:webpack
```

En az şu durumlar test edilmelidir: image/video geçişi, Registry cleanup,
source değişiminde state reset'i, aynı source update'inde playback korunması,
autoplay rejection, playback rate normalization, video element cleanup,
gradient/mask resolution ve fullscreen/overlay etkileşimi.
