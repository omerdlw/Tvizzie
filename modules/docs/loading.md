# Module: Loading

> Registry ve manuel kaynaklardan gelen global loading state'ini, minimum görünürlük süresi ve overlay yaşam döngüsüyle yönetir.

## 1. Genel bakış

`modules/loading`, page-level yükleme davranışı için tek state/action context'i
ve tek overlay yüzeyi sağlar. Registry'deki `page-loading` kaydı ile manuel
loading action'ları aynı provider'da birleşir. Feature içi küçük spinner veya
Next.js route `loading.js` davranışı bu modülün yerine geçmez.

## 2. Sorumluluklar

### Sahip olduğu kararlar

- Registry loading config'ini okumak
- Manuel `startLoading` / `stopLoading` lifecycle'ını yürütmek
- `minDuration` ile erken kapanmayı geciktirmek
- Skeleton veya default Spinner render etmek
- `showOverlay` ile state ve görsel overlay'i ayırmak
- Fullscreen state aktifken global overlay'i gizlemek
- Loading state/action hook'larını sunmak

### Sahip olmadığı kararlar

- Route segment loading dosyaları
- Feature-specific progress UI
- Hangi işin loading başlatacağı
- Network request veya cache implementasyonu

## 3. Dosya sahipliği

| Dosya        | Sahip olduğu implementasyon                                     | Public mi? |
| ------------ | --------------------------------------------------------------- | ---------- |
| `index.js`   | `LoadingOverlay` ve Spinner/skeleton yüzeyi                     | Evet       |
| `config.js`  | Default state ve options normalization                          | Dolaylı    |
| `runtime.js` | Provider, context'ler, Registry/manual merge ve timer lifecycle | Dolaylı    |

Loading hareket sözleşmesi küçük olduğu için ayrı `motion.js` yoktur.

## 4. Kurulum

Provider Registry provider'ın altında uygulama kökünde bir kez mount edilmelidir:

```jsx
<RegistryProvider>
  <LoadingProvider>
    <LoadingOverlay />
    {children}
  </LoadingProvider>
</RegistryProvider>
```

`LoadingOverlay` yalnızca `LoadingProvider` altında render edilmelidir.
Overlay kullanılmayacaksa provider yine state/action hook'ları için tek başına
mount edilebilir.

## 5. Public interface

| Export              | Sözleşme                                                                            |
| ------------------- | ----------------------------------------------------------------------------------- |
| `LoadingProvider`   | Loading state/action context'lerini kurar                                           |
| `LoadingOverlay`    | Global skeleton veya Spinner yüzeyini render eder                                   |
| `useLoadingState`   | `isLoading`, `isPageLoading`, `skeleton`, `minDuration`, `showOverlay` döndürür     |
| `useLoadingActions` | `startLoading`, `stopLoading`, `setLoading`, `setIsLoading`, `setSkeleton` döndürür |

## 6. Sözleşmeler ve kullanım örnekleri

### 6.1 Registry ile declarative loading

```jsx
import { usePageRegistry } from '@/modules/registry';

export function PageLoadingRegistration({ isFetching }) {
  usePageRegistry({
    registry: { source: 'media-page' },
    loading: {
      isLoading: isFetching,
      minDuration: 300,
      showOverlay: true,
      skeleton: <MediaSkeleton />,
    },
  });

  return null;
}
```

### 6.2 Manuel lifecycle

```jsx
import { useLoadingActions } from '@/modules/loading';

function SaveAction() {
  const { startLoading, stopLoading } = useLoadingActions();

  async function save() {
    startLoading({ minDuration: 250, showOverlay: false });
    try {
      await persistChanges();
    } finally {
      stopLoading();
    }
  }

  return <SaveButton onClick={save} />;
}
```

`showOverlay: false`, state'in loading kalmasına rağmen global Spinner yüzeyini
gizler. Feature kendi progress UI'sını gösteriyorsa bu tercih edilir.

### 6.3 Action ayrıntıları

- `startLoading(options)`: options normalize ederek loading başlatır
- `stopLoading()`: aktif minimum süreyi bekleyip kapatır
- `setLoading(optionsOrBoolean)`: boolean veya options ile state'i ayarlar
- `setIsLoading(value)`: loading flag'ini doğrudan günceller
- `setSkeleton(node)`: mevcut loading skeleton'ını değiştirir

`setLoading(true)` default options ile başlar. Süre, skeleton veya overlay
kontrolü gerekiyorsa `startLoading(options)` kullanın.

## 7. Yaşam döngüsü

```text
Registry loading config veya manuel action
  -> LoadingProvider
     -> options normalization
     -> loading state + minDuration timer
  -> LoadingOverlay
     -> fullscreen guard
     -> skeleton veya Spinner
```

- `isLoading: true` yeni timer başlatır.
- `isLoading: false`, aktif `minDuration` tamamlanmadan overlay'i kapatmaz.
- Yeni loading başlangıcı bekleyen stop timer'ını iptal eder.
- Registry source değişimi mevcut loading snapshot'ını yeni options ile birleştirir.
- Provider unmount olduğunda timer temizlenir.
- Registry kaydı yoksa manual state kullanılabilir.

## 8. Sınırlar, erişilebilirlik ve performans

- Overlay `role="status"`, `aria-busy="true"` ve `aria-label="Loading"` taşır.
- Fullscreen state aktifken overlay render edilmez; loading state kaybolmaz.
- Geçersiz veya negatif `minDuration` `0` olarak normalize edilir.
- Skeleton verilmezse default Spinner kullanılır.
- State ve action context'leri ayrıdır; action-only consumer gereksiz render almaz.
- Timer race'i, yeni start ile eski stop timer'ının iptal edilmesiyle önlenir.

## 9. Kurallar

1. Global provider ve overlay'i uygulama kökünde tek kez mount edin.
2. Feature request'lerini `try/finally` ile sarmalayın; `stopLoading` unutulmasın.
3. Bir iş için hem Registry hem manual loading'i aynı source policy'siz başlatmayın.
4. `showOverlay: false` kullanırken feature'ın kendi erişilebilir progress
   göstergesini sağlayın.
5. Route segment loading dosyalarını bu provider ile birleştirmeye çalışmayın.
6. Yeni state alanı eklenirse `config.js`, runtime actions, facade ve bu belge
   aynı değişiklikte güncellenmelidir.

## 10. Doğrulama

```bash
npx prettier --check modules/loading/*.js modules/docs/loading.md
npx eslint modules/loading/*.js
npm test
npm run build:webpack
```

Test kapsamı: Registry/manual merge, default normalization, minDuration timer,
stop/start race, skeleton fallback, fullscreen guard, overlay accessibility ve
unmount cleanup.
