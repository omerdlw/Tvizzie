# Module: Nav

> Kart tabanlı navigation, surface flow, HUD, command, breadcrumb, guard ve route continuity yeteneklerini tek çalışma zamanında birleştirir.

## 1. Genel bakış

Nav’ın ana veri akışı şudur:

```text
Alan modülü
  -> Registry’ye rota tanımını kaydeder
  -> NavigationProvider çalışma durumunu oluşturur
  -> Nav aktif kartı ve yardımcı katmanları çözer
  -> Cards, Surface, HUD ve komut arayüzünü görüntüler
```

Nav mekanizmayı sahiplenir. Alan modülleri; başlık, ikon, eylem, yüzey içeriği
ve iş kuralını sahiplenir. Bu ayrım, bir kartın veya surface’in ürüne ait
ayrıntılarla Nav çekirdeğine bağlanmasını önler.

Bu belge, Nav’a yeni bir yetenek ekleyecek geliştiriciler içindir. Davranışlar
mevcut kaynak koduna dayanır. Ürüne özgü adlar veya örnek akışlar bu modülün
sözleşmesi değildir.

## 2. Sorumluluklar

Nav şunları sahiplenir: aktif route card stack'i, compact/expanded görünüm,
surface flow'ları, HUD ve Operation Center, context command'ler, breadcrumb
zinciri, navigation transaction/guard'ları, scroll-focus continuity, status
overlay'leri, medya kontrolleri ve bunların erişilebilir interaction'ları.

Alan modülleri ise route/card descriptor'larını, domain action'larını, surface
içeriğini, HUD payload'ını ve ürün-specific route politikasını sağlar.

## 3. Dosya sahipliği

Bu bölümde her dosyanın görevi, ilişkileri ve çalışma biçimi yer alır.

### `index.js`

**Rolü:** Modülün görsel giriş noktası ve public API barrel dosyasıdır. Varsayılan `Nav` bileşenini ve dışarıya açık seçili yardımcıları yeniden dışa aktarır.

**İlişkileri:** `runtime`, `cards`, `layout`, `breadcrumbs`, `motion`, `constants` ve diğer özellik dosyalarını bir araya getirir. Uygulama kabuğu `NavigationProvider` ile `Nav` bileşenini bu dosyadan alır.

**Çalışması:** `Nav`, sağlayıcıdan çözümlenmiş kart listesini ve görünüm durumunu okur. Kart yığınını, backdrop’u, breadcrumb kartını ve ölçüm alanını render eder. İş mantığını burada eklemeyin; ilgili özellik dosyasına ekleyip bu dosyadan yeniden dışa aktarın.

### `constants.js`

**Rolü:** Nav’ın değişmeyen sözleşmelerini ve tasarım ölçülerini tanımlar.

**İlişkileri:** Tüm Nav dosyaları event adları, HUD öncelikleri, surface modları, kart ölçüleri, rota işlem sınırları ve davranış eşikleri için bu dosyayı kullanır.

**Çalışması:** Dosya yalnızca sabit veri dışa aktarır. Bir değer çalışma zamanında hesaplanıyor, DOM’a erişiyor veya React durumu tutuyorsa burada yer almamalıdır.

### `motion.js`

**Rolü:** Framer Motion geçişlerini, varyantlarını, yaylarını ve gecikmelerini tek yerde toplar.

**İlişkileri:** `cards`, `surface`, `hud`, `breadcrumbs` ve `media` bu dosyadan animasyon tanımlarını alır.

**Çalışması:** Her hareket tanımı saf veridir veya saf bir hesaplayıcıdır. JSX, React state’i, event listener veya ürün davranışı içermez. Yeni bir hareket dili gerekiyorsa önce buraya tanım ekleyin, sonra tüketen bileşene bağlayın.

### `utils.js`

**Rolü:** Rota, değer, render edilebilir içerik, DOM güvenliği, ikon, stil ve koleksiyon işlemleri için ortak saf yardımcıları barındırır.

**İlişkileri:** Özellikle `surface`, `hud`, `routing`, `cards`, `commands` ve `behavior` tarafından kullanılır.

**Çalışması:** Yardımcılar Nav durumuna sahip olmaz. Güvenli iç bağlantı doğrulama, aktif elementi blur etme ve değer normalizasyonu gibi işlemler çağırana sonuç döndürür. Tek bir özelliğin yaşam döngüsüne bağlı kodu bu dosyaya taşımayın.

### `behavior.js`

**Rolü:** Kompakt mod, klavye etkileşimi, focus trap ve navigasyon odağının geri yüklenmesini yönetir.

**İlişkileri:** `surface` focus trap’i kullanır. `runtime` ve `index` kompakt durum ile rota değişim sıfırlamalarını kullanır. Eşikler `constants`, hareket yardımcıları `utils` içinden gelir.

**Çalışması:** Scroll ve wheel olaylarını requestAnimationFrame ile sınırlar, yatay jestleri ayırır ve component unmount olduğunda tüm listener’ları temizler. Surface açıkken odak surface içinde tutulur; kapanışta kayıtlı odağa dönülür.

### `layout.js`

**Rolü:** Kart geometrisini, Nav yüksekliğini, spacer alanını ve viewport tepkisini hesaplar.

**İlişkileri:** `index` kart yığınını konumlandırmak için; `runtime` ise sayfa içeriğine doğru alt boşluğu vermek için bu dosyayı kullanır.

**Çalışması:** `ResizeObserver` ve `MutationObserver`, Nav yüksekliği değiştiğinde ölçümü yeniler. Ölçüm güncellemeleri requestAnimationFrame üzerinden sıralanır. `useNavHeight` ile alınan padding, sayfa içeriğinin Nav altında kalmasını engeller.

### `cards.js`

**Rolü:** Rota kartlarını ve kart içeriğini görüntüler.

**İlişkileri:** `surface`, `hud`, `commands`, `media`, `routing`, `motion`, arka plan sağlayıcısı ve registry’den gelen nav tanımları ile çalışır.

**Çalışması:** Kart türünü aktif tanıma göre çözer. Standart kartta başlık, açıklama, aksiyon ve komut çubuğunu; surface kartında `NavSurfaceShell` içeriğini render eder. `NavCardItem` Nav ağacının iç bileşenidir; alan bileşenleri onu doğrudan render etmemelidir.

### `commands.js`

**Rolü:** Rota bağlamındaki araç çubuğu komutlarını kaydeder, birleştirir, sıralar ve görüntüler.

**İlişkileri:** `runtime`, komut registry’sini sağlar. `cards`, aktif kartın `actions` alanı ile bağlam komutlarını `NavCommandBar` içinde birleştirir. Varsayılan komutlar, uygulamanın mevcut auth, modal ve bildirim bağlamlarını kullanabilir.

**Çalışması:** Aynı `key` ile kaydedilen komut güncellenir. Görünmeyen veya geçersiz eylemler filtrelenir; kalanlar `order` değeriyle sıralanır. `useNavContextActions` kullanan component unmount olduğunda kendi komutlarını kaldırır.

### `breadcrumbs.js`

**Rolü:** Rota yolundan breadcrumb üretir, rota bazlı override’ları ve breadcrumb eylemlerini yönetir.

**İlişkileri:** `NavigationProvider`, isteğe bağlı `breadcrumbConfig` değerini `BreadcrumbProvider`a iletir. `index` ise `NavBreadcrumbsCard`ı gösterir.

**Çalışması:** Varsayılan çözümleyici pathname segmentlerinden zincir üretir. `root`, `resolvePath` veya `resolveSegment` ile alan kuralları eklenebilir. Override hook’u, component ömrü boyunca belirli bir yolun başlığını veya ikonunu değiştirir ve cleanup’ta kaldırır.

### `hud.js`

**Rolü:** HUD descriptor’larını normalleştirir, önceliklendirir, yaşam döngüsünü yönetir ve HUD arayüzünü render eder.

**İlişkileri:** `runtime`, HUD registry’sini ve Operation Center’dan türetilen HUD’ları yönetir. `cards` ve `index`, seçilen HUD’ı görünüm katmanına bağlar. `motion` yalnızca geçişleri sağlar.

**Çalışması:** Bir descriptor; component, React node veya metin tabanlı görünüm olabilir. Aktif descriptor’lar içinden en yüksek `priority` seçilir. `autoDismissMs`, rota değişimi ve Escape kapatma davranışı descriptor tarafından belirlenir. Aynı `id` ile gelen eşdeğer descriptor, gereksiz state güncellemesi üretmez.

### `surface.js`

**Rolü:** Surface tanımları, çok adımlı surface akışları, URL geri yükleme, geri dönüş handshake’i, stack yaşam döngüsü, surface kabuğu ve kart üstü extensions (eklentiler) sistemini sahiplenir.

**İlişkileri:** `runtime`, surface stack ve flow işlemlerini sağlar. `cards`, stack’teki aktif surface’i `NavSurfaceShell` ile render eder. `index`, kart stack'inin üzerinde yüzen `NavSurfaceExtensionsBar`ı görüntüler. `behavior`, focus trap ve odak geri yüklemesini; `routing`, return handoff teslimini yürütür.

**Çalışması:** Bir surface descriptor’ı, başlık meta verisini, render edilecek component veya node’u ve opsiyonel `extensions` listesini normalleştirir. Stack açma, kapatma, adım değiştirme, URL eşleme, swipe dismissal ve odak yönetimi tek reducer çevresinde gerçekleşir. Stack’te altta kalan surface’ler unmount edilmez; görünmez ve inert halde tutulur, böylece form ve adım state’i geri dönüldüğünde korunur. `useSurfaceHeader` yalnızca verilen alanları birleştirir. Segmented control veya selectbox gibi yardımcı kontroller, surface gövdesinde yer kaplamaması için `useSurfaceExtensions` veya `<NavSurfaceExtension>` ile kartın üstünde yüzen (floating) extension panelleri olarak yansıtılır. Flow’lar surface üstünde görev düzeyinde durum saklar; kapanış sonucu isteğe bağlı olarak güvenli bir iç rotaya teslim edilir.

### `routing.js`

**Rolü:** Rota işlemleri, navigation guard’ları, topology, link prefetch, scroll ve focus sürekliliğini yönetir.

**İlişkileri:** `runtime`, navigation facade’sını bu dosyanın transaction ve continuity araçlarıyla kurar. `surface`, return handshake sonucunu continuity store’a teslim eder. `cards`, kart linkleri için rota politikası ve prefetch kullanır.

**Çalışması:** Her navigation işlemi bir transaction’dır. Yeni işlem eski işlemi supersede edebilir; guard’lar yönlendirmeden önce değerlendirilir. Continuity store, pathname bazında scroll, focus ve snapshot kaydeder. Restore işlemi, DOM güncellendikten sonra requestAnimationFrame içinde uygulanır.

### `runtime.js`

**Rolü:** Nav’ın merkezi React çalışma zamanıdır. Provider, reducer’lar, context’ler, Operation Center, guard’lar, continuity bağları ve public hook’lar burada bulunur.

**İlişkileri:** Tüm özellik dosyalarını birleştirir. Registry, Next yönlendirici, arka plan, loading, auth, modal ve bildirim bağlamlarıyla burada bağ kurulur.

**Çalışması:** `NavigationProvider`, Nav state ve actions context’lerini oluşturur; `SurfaceFlowProvider` ve `BreadcrumbProvider`ı sarar. `useNavigation` görünüm, davranış ve yönlendirme facade’ını sunar. Development ortamında tanı store’u ile inspector snapshot’ı da burada tutulur.

### `status.js`

**Rolü:** Hesap ve bağlantı durumlarının Nav üzerindeki görünümünü, önceliğini ve kalıcılığını yönetir.

**İlişkileri:** `runtime`, mevcut status state’ini display katmanına aktarır. Registry’den gelen rota tanımları, bu dosyanın overlay uygulamasıyla zenginleşir. Tarayıcı online/offline olayları ve proje status event’leri burada dinlenir.

**Çalışması:** Durum olaylarını normalize eder, öncelik sırasına göre aktif görünümü seçer ve gerekli süreli durumları saklar. `useNavigationStatus`, tarayıcı ve uygulama event listener’larını kurar, timer ve listener cleanup’larını gerçekleştirir. `getStatusTheme` yalnızca görünüm katmanının tema eşlemesine ihtiyaç duyduğu durumlarda kullanılır.

### `media.js`

**Rolü:** Nav içindeki video durum göstergesi, ses dalgası, scrubber ve medya kontrollerini tanımlar.

**İlişkileri:** `cards`, aktif kartın medya eylemiyle arka plan sağlayıcısına bağlanır. `motion` scrubber ve ses dalgası animasyonlarını sağlar.

**Çalışması:** Kontroller kendi medya kaynağını oluşturmaz. Mevcut arka plan sağlayıcısının video durumunu ve eylemlerini tüketir. Bu nedenle bileşenleri, aynı arka plan bağlamının bulunduğu Nav ağacında kullanın.

## 4. Kurulum

Bu bölüm, Nav yeteneklerini uygulama alanlarına bağlamak için izlenecek yapıyı açıklar.

### Sağlayıcıyı ve görünümü yerleştirme

Nav, registry ve kendi provider’ı altında render edilmelidir. Provider, route kartlarını çözmek için registry’ye; `Nav` ise provider state’ine ihtiyaç duyar.

```jsx
import Nav, { NavigationProvider } from '@/modules/nav';
import { RegistryProvider } from '@/modules/registry';

export function ApplicationShell({ children }) {
  return (
    <RegistryProvider>
      <NavigationProvider>
        {children}
        <Nav />
      </NavigationProvider>
    </RegistryProvider>
  );
}
```

Breadcrumb davranışını özelleştiriyorsanız `NavigationProvider`a `breadcrumbConfig` verin. Provider’ı sayfa bazında yeniden kurmayın; surface stack, operation ve continuity state’i provider ömrü boyunca yaşar.

## 5. Public interface

Nav'ın public yüzeyi `index.js` üzerinden gelir. Temel seçim rehberi:

| İhtiyaç                 | Interface                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Provider/render         | `NavigationProvider`, default `Nav`                                                 |
| Birleşik state/action   | `useNavigation`                                                                     |
| Dar state/action        | `useNavigationState`, `useNavigationActions`, `useNavigationContext`                |
| Surface                 | `useSurfaceFlow`, `createSurfaceFlowDefinition`, `useSurfaceReturn`                 |
| Surface extensions      | `useSurfaceExtensions`, `NavSurfaceExtension`, `NavSurfaceExtensionsBar`             |
| HUD/operation           | `useNavHud`, `createHudDefinition`, `useNavigationOperations`                       |
| Route guard/transaction | `useNavigationGuard`, `createNavigationTransaction`, `useNavigationTransactions`    |
| Continuity              | `useNavigationContinuityState`, `useNavigationContinuity`, `useSurfaceReturn`       |
| Context actions         | `useNavContextActions`                                                              |
| Breadcrumb              | `useNavBreadcrumbs`, `useRegisterBreadcrumbOverride`                                |
| Layout                  | `useNavHeight`, `NavHeightSpacer`                                                   |
| Status/media            | `useNavigationStatus`, `applyStatusOverlay`, `NavMediaControls`, `NavMediaScrubber` |

Motion, constants, resolver ve descriptor factory export'ları dosya haritasında
belirtilen implementation dosyalarından facade üzerinden yayınlanır.

### 5.1 Public hook’ları görevine göre seçme

Nav’ın dışarıya açık hook’ları aşağıdaki sorumluluk gruplarına ayrılır:

| İhtiyaç                         | API                                                                  | Kullanım sınırı                                                           |
| ------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Birleşik görünüm ve yönlendirme | `useNavigation`                                                      | `navigate`, kompakt durum ve aktif kartla çalışan ekran bileşenleri       |
| Düşük seviye Nav state’i        | `useNavigationState`, `useNavigationActions`, `useNavigationContext` | Nav’ın mevcut state veya action facade’ına doğrudan ihtiyaç duyan altyapı |
| Sabit alt boşluk                | `useNavHeight`, `NavHeightSpacer`                                    | Fixed Nav altındaki sayfa içeriği                                         |
| Geçici bildirim                 | `useNavHud`                                                          | Component ömrüne bağlı HUD                                                |
| Uzun süren iş                   | `useNavigationOperations`                                            | Operation Center ve otomatik operation HUD                                |
| Rota kaybını engelleme          | `useNavigationGuard`                                                 | Kaydedilmemiş değişiklik veya benzeri geçiş blokları                      |
| Rota görünümünü geri yükleme    | `useNavigationContinuityState`, `useSurfaceReturn`                   | Scroll, focus ve flow sonucu teslimi                                      |
| Bağlamsal araç çubuğu           | `useNavContextActions`                                               | Aktif rota için geçici komutlar                                           |
| Surface görevi                  | `useSurfaceFlow`                                                     | Tekil, çok adımlı veya URL ile geri açılabilir görevler                   |
| Surface kart üstü kontrolleri   | `useSurfaceExtensions`, `NavSurfaceExtension`                       | Kart gövdesi yerine kartın üstünde yüzen filtre, sekme ve seçim panelleri |
| Breadcrumb                      | `useNavBreadcrumbs`, `useRegisterBreadcrumbOverride`                 | Rota zinciri ve sayfa ömrüne bağlı override                               |

`useNavigationActions` düşük seviye facade’ıdır. `setExpanded`, `setIsCompact`, `setCompactLock`, `setSelectionMode` ve ilgili surface, HUD, command, continuity eylemlerini içerir. Bu action’ları yalnızca görünüm veya altyapı davranışı Nav’a ait olduğunda çağırın. Alan state’ini Nav reducer’ına koymayın.

Nav kartı genişliği değiştiğinde sayfa içeriğini ayarlamak için `useNavHeight`ın verdiği `padding` değerini kullanın veya sayfa sonunda `NavHeightSpacer` render edin. Aynı sayfada ikisini birlikte kullanmayın.

## 6. Sözleşmeler ve kullanım örnekleri

### 6.1 Rota kartını registry ile kaydetme

Nav kartları alan modüllerinden gelir. Kayıt işlemini component yaşam döngüsüne bağlayın ve aynı kaynağı cleanup’ta kaldırın.

```jsx
import { useEffect } from 'react';
import { useNavRegistryActions } from '@/modules/registry';

const libraryNavItem = {
  title: 'Library',
  description: 'Saved items',
  icon: 'lucide:bookmark',
  action: { href: '/library' },
};

export function LibraryNavRegistration() {
  const { register, unregister } = useNavRegistryActions();

  useEffect(() => {
    register('/library', libraryNavItem, 'library', { priority: 100 });
    return () => unregister('/library', 'library');
  }, [register, unregister]);

  return null;
}
```

Kayıt seçeneklerinin anlamı şudur:

- **Rota anahtarı:** Kartın hedef pathname’i
- **Kaynak adı:** Aynı rotaya ait kaydın sahibini ayırt eder
- **Priority:** Birden fazla kaynağın aynı rota tanımına katkı yaptığı durumda registry’nin birleşim önceliğidir

Kart tanımında başlık, açıklama, ikon, `action`, `actions`, `children`, `surface` ve rota politikası yer alabilir. Yalnızca kartın sorumluluğundaki veriyi kaydedin. Yetkilendirme, veri yükleme veya alan state’i Nav tanımına taşımayın.

`navigationPolicy` alanı, karttan başlatılan geçişte `clearTransientState`, `dismissSurfaces` ve `prefetch` davranışlarını override eder. Bir politika yalnızca rotaya özgü istisna olduğunda tanımlanmalıdır; varsayılan geçiş davranışını tekrar etmeyin.

### 6.2 Yönlendirme ve koruma kullanma

`useNavigation`, guard değerlendirmesinden geçen `navigate` işlevini içerir. Kart dışında rota değiştireceğiniz durumda bunu kullanın.

```jsx
import { useNavigation, useNavigationGuard } from '@/modules/nav';
import { Button } from '@/ui/primitives';

export function EditorControls({ hasUnsavedChanges }) {
  const { navigate } = useNavigation();

  useNavigationGuard({
    when: hasUnsavedChanges,
    message: 'Unsaved changes',
  });

  return <Button onClick={() => navigate('/library')}>Back to library</Button>;
}
```

`when`, boolean, function veya async function olabilir. Guard geçişi engellediğinde `onBlock` çağrılabilir. Guard’ı ilgili düzenleme component’inde kaydedin; hook unmount olduğunda kaydı kaldırır. Uygulama kabuğu seviyesinde kalıcı guard kaydetmeyin.

### 6.3 Surface açma

Surface, mevcut Nav kartı üzerinde görev odaklı bir içerik açar. Tek adımlı içerik için `useNavigationActions` içindeki `openSurface` kullanın.

```jsx
import { useNavigationActions } from '@/modules/nav';
import { Button } from '@/ui/primitives';

function DetailsSurface({ close, itemId }) {
  return <Button onClick={close}>Close {itemId}</Button>;
}

export function OpenDetails({ itemId }) {
  const { openSurface } = useNavigationActions();

  const handleOpen = () => {
    openSurface({
      component: DetailsSurface,
      props: { itemId },
      title: 'Details',
      description: 'Review the selected item',
    });
  };

  return <Button onClick={handleOpen}>Open details</Button>;
}
```

Surface component’i Nav tarafından aşağıdaki propslarla çağrılır:

| Prop          | Amaç                                             |
| ------------- | ------------------------------------------------ |
| `close`       | Geçerli surface’i kapatır                        |
| `closeAll`    | Surface stack’ini kapatır                        |
| `pushStep`    | Yeni bir adımı stack’e ekler                     |
| `popStep`     | Önceki adıma döner                               |
| `goToStep`    | Belirli bir adıma gider                          |
| `stepIndex`   | Geçerli adımın sıfır tabanlı indeksi             |
| `totalSteps`  | Stack’teki toplam adım sayısı                    |
| `isFirstStep` | Geçerli adımın ilk adım olup olmadığını belirtir |
| `isLastStep`  | Geçerli adımın son adım olup olmadığını belirtir |

`props` alanına verdiğiniz değerler bu kontrollere ek olarak component’e geçer. Bu nedenle `close`, `pushStep` veya benzeri ayrılmış prop adlarını surface props olarak kullanmayın.

Surface descriptor’ının görünüm alanları şunlardır:

| Alan                           | Amaç                                                      |
| ------------------------------ | --------------------------------------------------------- |
| `component`                    | Render edilecek React component’i                         |
| `content`, `node`, `element`   | Component yerine render edilecek içerik                   |
| `props`                        | Surface component’ine iletilecek propslar                 |
| `title`, `description`, `icon` | Header içeriği                                            |
| `trailing`, `headerAction`     | Header’ın sağ tarafındaki içerik veya eylem               |
| `action`, `showAction`         | Kart eylemi görünürlüğü ve override’ı                     |
| `dismissible`, `onClose`       | Kapanma davranışı                                         |
| `closeLabel`                   | Kapatma düğmesi erişilebilirlik etiketi                   |
| `descriptionMaxLines`          | Header açıklamasının satır sınırı                         |
| `expandHorizontal`, `width`    | Surface’in yatay açılma ve genişlik tercihleri            |
| `allowSwipeDismiss`            | Swipe ile kapatmayı etkinleştirir veya devre dışı bırakır |
| `steps`, `currentStepIndex`    | Adım başlangıç durumu                                     |
| `syncWithUrl`, `urlKey`        | URL üzerinden tekrar açma davranışı                       |
| `badge`                        | Header rozeti                                             |
| `extensions`                   | Kartın üzerinde yüzen eklenti/filtre tanımları dizisi     |

`header: { icon, title, description }` kısa formu da kabul edilir. Header’ı surface içinden dinamik güncellemeniz gerekiyorsa `useSurfaceHeader`ı yalnızca aktif surface ağacında çağırın.

### 6.4 Surface Extensions (Kart eklentileri)

Segmented control (kategori/sekme butonları), filtreler ve selectbox gibi bileşenler surface kartının gövdesinde yer aldığında hem dikey alanı daraltır hem de görsel kalabalık oluşturur. Surface Extensions sistemi, bu yardımcı kontrolleri surface kartının dışına, kartın hemen 4px üstünde yüzen (floating) eklenti panelleri olarak taşır (`bottom-[calc(100%+4px)]`).

#### Görsel Tasarım ve Geometri Kuralları

- **Kapsül Görünümü:** Eklenti kutucukları (`ExtensionPill`), nav kartı ile birebir aynı görsel dile sahiptir: `bg-black/60 backdrop-blur-xl ring-1 ring-inset ring-white/10 rounded-full h-10 p-1 shadow-lg`.
- **Eşmerkezli Radius (Concentric Geometry):** Dış kutucuk 20px (`rounded-full`, 40px yükseklik), 4px iç dolgu (`p-1`) ve iç kontroller 16px (`rounded-full`, 32px yükseklik) ile tasarlanmıştır. $20\text{px} - 4\text{px} = 16\text{px}$ geometrisi sayesinde her iki uçta ve tüm açılarda tam simetrik 4px homojen iç boşluk elde edilir.
- **Segmented Controls & Genişlik:** Segmented control eklentisi `w-full flex-1 min-w-0` ile sol tarafı tamamen kaplar. İçindeki butonlar `flex-1 min-w-fit justify-center` ile tam genişliğe homojen yayılır. Sağdaki kontrollerle (örn: Selectbox) arasında net **4px** (`gap-1`) boşluk bulunur.
- **Selectbox Kuralları:**
  - **Seçili Değer (Value):** Ülke adı gizlidir; yalnızca bayrak emojisi ve 2 harfli ISO kodu gösterilir (`triggerLabel: '${flag} ${code}'`, örn: `🇹🇷 TR`).
  - **Açılır Menü (Menu):** Seçeneklerde ülke isimleri tam olarak görünür (`label: '${flag} ${code} · ${countryName}'`, örn: `🇹🇷 TR · Türkiye`).
  - **Kaydırma Desteği:** Sayfadaki Lenis yumuşak kaydırma kütüphanesinin açılır menüyü kilitlemesini önlemek için `data-lenis-prevent`, `data-lenis-prevent-wheel` ve `stopPropagation` eklenmiştir.

#### Mimari ve Performans

- **Sıfır Re-render Maliyeti:** Bileşen ağacı, `SurfaceExtensionsStore` (harici store) ve React'ın `useSyncExternalStore` kancası ile senkronize edilir. `<NavSurfaceExtension>` içeriği değiştiğinde tüm React ağacı re-render edilmez; yalnızca `NavSurfaceExtensionsBar` güncellenir. Bu mimari sonsuz re-render döngülerini ("maximum update depth exceeded") kökten engeller ve 60fps akıcılık sağlar.

Eklentiler hem deklaratif bileşen (`<NavSurfaceExtension>`), hem hook (`useSurfaceExtensions`), hem de descriptor seviyesinde tanımlanabilir:

#### Deklaratif kullanım: `<NavSurfaceExtension>`

```jsx
import { NavSurfaceExtension } from '@/modules/nav';
import { Button, Select } from '@/ui/primitives';

function WatchProvidersSurface() {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [resolvedRegion, setResolvedRegion] = useState('TR');

  return (
    <div className="flex w-full flex-col gap-2.5 overflow-hidden">
      {/* Sol tarafta tam genişlik segmented control kapsülü */}
      <NavSurfaceExtension id="categories" align="left" className="w-full flex-1 min-w-0">
        <div className="flex h-8 w-full min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-none">
          <Button onClick={() => setActiveCategory('ALL')} className="flex-1 justify-center rounded-full">All</Button>
          <Button onClick={() => setActiveCategory('STREAM')} className="flex-1 justify-center rounded-full">Stream</Button>
        </div>
      </NavSurfaceExtension>

      {/* Sağ tarafta 4px mesafeli bölge seçim kapsülü */}
      <NavSurfaceExtension id="region" align="right">
        <Select
          value={resolvedRegion}
          onChange={setResolvedRegion}
          options={regionOptions}
          side="top"
          align="end"
          classNames={{
            trigger: 'flex h-8 items-center gap-2 rounded-full px-3 text-xs font-semibold text-white/70',
          }}
        />
      </NavSurfaceExtension>

      {/* Surface gövdesinde temiz liste içeriği */}
      <div className="provider-list">...</div>
    </div>
  );
}
```

#### Dinamik hook kullanımı: `useSurfaceExtensions`

```jsx
import { useSurfaceExtensions } from '@/modules/nav';

function FilterableSurface({ categories, activeCategory, onSelectCategory }) {
  useSurfaceExtensions([
    {
      id: 'category-filters',
      align: 'left',
      className: 'w-full flex-1 min-w-0',
      content: (
        <div className="flex h-8 w-full min-w-0 flex-1 items-center gap-1">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => onSelectCategory(cat.id)} className="flex-1 rounded-full">
              {cat.label}
            </button>
          ))}
        </div>
      ),
    },
  ]);

  return <div className="content">...</div>;
}
```

Eklenti descriptor alanları şunlardır:

| Alan        | Amaç                                                                   |
| ----------- | ---------------------------------------------------------------------- |
| `id`        | Eklentinin tekil kimliği                                               |
| `align`     | Konum hizalaması (`'left'`, `'right'`, `'center'`; varsayılan `'left'`) |
| `content`   | Render edilecek React node'u                                           |
| `component` | Render edilecek React bileşeni                                         |
| `props`     | Bileşene aktarılacak propslar                                          |
| `order`     | Sıralama önceliği (varsayılan `0`)                                     |
| `className` | Kapsül üzerine eklenecek ek CSS sınıfları                              |
| `unstyled`  | Varsayılan frosted glass kapsül stilini devre dışı bırakır             |

### 6.5 Çok adımlı surface flow kurma

Surface flow, bir kullanıcı görevini tekil kimlik, snapshot ve tamamlanma sonucu altında tutar. Flow tanımını render dışına alın; her render’da yeni tanım üretmeyin.

```jsx
import { createSurfaceFlowDefinition, useSurfaceFlow } from '@/modules/nav';
import { Button } from '@/ui/primitives';

const editorFlow = createSurfaceFlowDefinition({
  id: 'item-editor',
  initialSnapshot: { draft: '' },
  createSurface: ({ input }) => ({
    component: EditorSurface,
    props: { itemId: input.itemId },
    title: 'Edit item',
  }),
});

export function EditItemAction({ itemId }) {
  const flow = useSurfaceFlow(editorFlow);
  return <Button onClick={() => flow.open({ itemId })}>Edit</Button>;
}
```

Surface flow component’i ek olarak `surfaceFlow` prop’u alır. Bu prop, güncel snapshot ile `update`, `complete` ve `cancel` callback’lerini içerir.

```jsx
import { Button } from '@/ui/primitives';

function EditorSurface({ surfaceFlow }) {
  const save = () => {
    surfaceFlow.update({ draft: 'saved value' });
    surfaceFlow.complete({ saved: true });
  };

  return <Button onClick={save}>Save</Button>;
}
```

Flow ayarları şunlardır:

| Alan                              | Amaç                                                            |
| --------------------------------- | --------------------------------------------------------------- |
| `id`                              | Flow’un zorunlu ve benzersiz kimliği                            |
| `createSurface`                   | Flow input ve snapshot’tan surface descriptor’ı üretir          |
| `initialSnapshot`                 | Başlangıçta kopyalanan seri hale getirilebilir durum            |
| `singleton`                       | Aynı flow’un tek instance’ını korur; varsayılan `true`          |
| `restoreFromUrl`                  | URL state’i uygun olduğunda flow’u geri açar; varsayılan `true` |
| `returnHandshake` veya `returnTo` | Tamamlanma sonucunun teslim edileceği güvenli iç rota           |

`syncWithUrl` kullanan surface’lerde flow kimliği ve snapshot tarayıcı history state’ine yazılır. Snapshot’ı yeniden oluşturulabilir ve hassas olmayan değerlerle sınırlayın.

### 6.6 Surface sonucunu önceki rotaya teslim etme

Return handshake, surface flow tamamlandığında sonucu belirli bir iç rotaya bir kez teslim eder. Bu mekanizma `router.back()` çağırmaz; hedef rotaya geçer, kaydedilmiş scroll ve focus konumunu geri yükler.

```jsx
const editorFlow = createSurfaceFlowDefinition({
  id: 'item-editor',
  returnHandshake: {
    pathname: '/library',
    focusKey: 'library-edit-item',
    restoreScroll: true,
  },
  createSurface: createEditorSurface,
});
```

Hedef rotada sonucu `useSurfaceReturn` ile alın ve tüketin. `consume` aynı handoff’u ikinci kez döndürmez.

```jsx
import { useEffect } from 'react';
import { useSurfaceReturn } from '@/modules/nav';

export function LibraryPage() {
  const { consume } = useSurfaceReturn();

  useEffect(() => {
    const handoff = consume();
    if (handoff?.data?.saved) {
      // Refresh the route-owned data.
    }
  }, [consume]);

  return null;
}
```

Handshake yalnızca güvenli iç href’leri kabul eder. `returnOnCancel: true` vermezseniz iptal sonucu hedef rotaya gönderilmez.

### 6.7 HUD göstermek

HUD, kısa süreli durum veya görev bilgisini Nav üzerinde gösterir. `useNavHud`, descriptor’ı component ömrü boyunca kaydeder ve unmount’ta temizler.

```jsx
import { useNavHud } from '@/modules/nav';

export function UploadState({ progress }) {
  useNavHud({
    id: 'upload',
    title: 'Uploading',
    description: 'Keep this page open',
    progress,
    priority: 20,
    dismissOnEscape: false,
  });

  return null;
}
```

HUD progress değeri `0` ile `100` arasındadır. Geçersiz değerler sınırlandırılır veya yok sayılır. Descriptor aşağıdaki alanları destekler:

| Alan                                    | Amaç                                       |
| --------------------------------------- | ------------------------------------------ |
| `id`                                    | Kayıt kimliği; güncelleme için sabit tutun |
| `component` veya `content`              | Özel component veya node                   |
| `props`                                 | HUD component propsları                    |
| `title`, `description`, `icon`, `badge` | Görünüm bilgisi                            |
| `actions`                               | HUD içinde eylem listesi                   |
| `isActive`, `variant`                   | Seçime katılım ve görünüm türü             |
| `priority`                              | Aktif HUD seçme önceliği                   |
| `progress`, `isIndeterminate`           | İlerleme görünümü                          |
| `autoDismissMs`                         | Otomatik kapanma süresi                    |
| `dismissOnNavigate`, `dismissOnEscape`  | Kapanma politikaları                       |
| `onCancel`                              | Kullanıcı HUD’ı iptal ettiğinde çağrılır   |

Birden fazla HUD aktif olduğunda en yüksek `priority` görünür. Eşit öncelikte önce kaydedilen aktif HUD korunur.

### 6.8 Operation Center kullanma

Operation Center, uzun süren iptal edilebilir işleri HUD olarak projekte eder. Bir operasyonun progress değeri HUD’dan farklı olarak `0` ile `1` arasındadır.

```jsx
import { useNavigationOperations } from '@/modules/nav';
import { Button } from '@/ui/primitives';

export function SyncAction({ synchronize }) {
  const operations = useNavigationOperations();

  const run = async () => {
    const operation = operations.start({
      label: 'Synchronizing',
      progress: 0,
      cancellable: true,
    });

    try {
      operations.update(operation.id, { progress: 0.5 });
      await synchronize();
      operations.complete(operation.id, { success: true });
    } catch (error) {
      operations.complete(operation.id, { success: false, error });
    }
  };

  return <Button onClick={run}>Synchronize</Button>;
}
```

`start`, `update`, `complete`, `cancel` ve `clear` aynı facade üzerinden gelir. Aktif operasyon, kendi HUD’u yoksa HUD görünümünde gösterilir. `onCancel` callback’i olan operasyonlarda kullanıcı iptali callback’i çağırır.

`start` tanımı `id`, `label`, `description`, `icon`, `metadata`, `priority`, `progress`, `cancellable` ve `onCancel` alanlarını kabul eder. Bir `id` verirseniz işin tekrar başlatılmalarında aynı kimliği bilinçli olarak yönetin. İş başladığında iptal edilemiyorsa `cancellable: false` verin.

### 6.9 Bağlamsal komut ekleme

`useNavContextActions`, component görünür olduğu sürece araç çubuğuna komut ekler. Komutları route kaydından bağımsız, component’e özgü tutmak için bu hook’u kullanın.

```jsx
import { useNavContextActions } from '@/modules/nav';

export function CollectionActions({ refreshCollection }) {
  useNavContextActions([
    {
      key: 'collection-refresh',
      icon: 'lucide:refresh-cw',
      tooltip: 'Refresh collection',
      order: 20,
      onClick: refreshCollection,
    },
  ]);

  return null;
}
```

Bir komutta `key`, `icon`, `tooltip`, `onClick`, `order`, `badge`, `disabled` ve `visible` kullanılabilir. `key` sabit olmalıdır. Hook, değişen action listesindeki kaldırılmış anahtarları ve unmount’taki tüm kayıtları temizler.

### 6.10 Breadcrumb zincirini özelleştirme

Genel breadcrumb üretimi pathname segmentlerini kullanır. Alanınız daha anlamlı başlıklar üretiyorsa provider config’ine çözümleyici ekleyin veya sayfa içinde bir override kaydedin.

```jsx
import { useRegisterBreadcrumbOverride } from '@/modules/nav';

export function ItemPage({ title }) {
  useRegisterBreadcrumbOverride({
    path: '/library/item',
    title,
    icon: 'lucide:file-text',
  });

  return null;
}
```

`useNavBreadcrumbs` geçerli breadcrumb listesini, parent bilgisini, `canGoBack` değerini ve `goBack` eylemini verir. Override’ı kalıcı global kayda dönüştürmeyin; sayfanın yaşam döngüsüne bağlayın.

Provider config’inde `root` başlangıç crumb’ını, `resolveSegment` tek bir path segmentini, `resolvePath` ise tam pathname’i çözer. `resolvePath` bir crumb dizisi döndürdüğünde varsayılan segment çözümünü değiştirir.

### 6.11 Rota sürekliliğini kullanma

Nav, surface return handshake’i için scroll ve focus sürekliliğini zaten kullanır. Alanınızın özel geçişi de aynı davranışa ihtiyaç duyuyorsa `useNavigationContinuityState` facade’ını kullanın.

```jsx
import { useNavigationContinuityState } from '@/modules/nav';
import { Button } from '@/ui/primitives';

export function RememberedList() {
  const continuity = useNavigationContinuityState();

  const remember = () => {
    continuity.remember('/library', {
      focusKey: 'library-edit-item',
      scrollY: window.scrollY,
    });
  };

  return <Button onClick={remember}>Remember position</Button>;
}
```

Focus geri yüklemek istediğiniz hedefe `data-nav-focus-key` ekleyin. Continuity kaydı hedef rota ve kullanıcı göreviyle ilişkili olmalıdır; ortak ve alakasız state’i snapshot’a eklemeyin.

## 7. Yaşam döngüsü

Navigation state, surface stack, operation, guard ve continuity kayıtları
`NavigationProvider` ömründe tutulur. Yeni navigation transaction eski işlemi
supersede edebilir; guard'lar geçişten önce çalışır. Surface kapanış sonucu
return handoff ile route-scoped continuity kaydına teslim edilebilir.

### 7.1 Durum ve medya katmanlarını doğru sınırda kullanma

Status sistemi uygulamanın status event’lerini, bağlantı olaylarını ve kalıcı durumlarını Nav görünümüne dönüştürür. Alan modülleri, status görünümünü doğrudan taklit eden HUD veya surface oluşturmamalıdır. Görsel tema eşlemesine ihtiyaç duyarsanız `getStatusTheme` kullanın; status yaşam döngüsünü `useNavigationStatus` üzerinden mevcut runtime’a bırakın.

Medya bileşenleri yalnızca Nav ağacındaki arka plan medya bağlamıyla çalışır. `NavMediaControls`, `NavMediaScrubber` ve `NavSoundwave` için bağımsız oynatıcı state’i üretmeyin.

### 7.2 Kart yığını ızgarası, boşluklar ve opaklık kademelendirmesi

Nav modülü, ekranın alt kenarı ile kartlar ve yardımcı paneller arasındaki boşlukları katı bir **4px ızgarası** üzerinden yönetir:

- **Taban Konumu:** `#nav-card-stack` ekranın alt kenarından tam 4px mesafede (`bottom-[4px]`) sabitlenir.
- **Expand Modu Aralıkları:** Kartlar açıkken aralarındaki dikey boşluk `NAV_VIEWPORT_GAP = 4` kuralına uyar (`expandedY: -72px`). Her kart arasında net **4px** mesafe korunur.
- **Breadcrumbs Konumu:** Nav kartının 4px altında (`top-[calc(100%+4px)]`) yer alır. Aktifleştiğinde kart yığını `42px` yukarı kaldırılarak (`38px + 4px = 42px`), breadcrumbs'ın ekran altından 4px mesafede süzülmesi sağlanır.
- **Surface Extensions Konumu:** Surface kartının 4px üstünde (`bottom-[calc(100%+4px)]`) yer alır. Yığın tabanı sabit `bottom-[4px]`te kalır; kartın yukarı kalkmasına gerek kalmaz.

#### Kart Opaklık Kademelendirmesi (Stack Opacity)

Kart yığınındaki derinlik algısını ve odak hiyerarşisini güçlendirmek için pozisyona bağlı opaklık yönetimi uygulanır:

- **Expand Modunda (`expanded: true`):** Kullanıcı kartları açtığında, tüm kartların okunabilirliği ve erişilebilirliği için istisnasız **%100** (`1.0`) opaklık uygulanır.
- **Collapsed Modunda (`expanded: false` - arkaya yığılma):** Arkada üst üste binen deaktif kartlar kademeli olarak soluklaşır:
  - Aktif kart (`position === 0`): **%100** (`1.0`)
  - Deaktif 1. kart (`position === 1`): **%80** (`0.8`)
  - Deaktif 2. kart (`position === 2`): **%60`** (`0.6`)
  - Deaktif 3. kart (`position === 3`): **%40`** (`0.4`)
  - Deaktif 4. kart (`position === 4`): **%20`** (`0.2`)
  - `position >= 5`: **%10** (`0.1`)
  - Görünür sınırın (`visibleCount`) dışındaki kartlar: **%0** (`0`)

Framer Motion, mod değişimlerinde (expand / collapse) ve aktif kart geçişlerinde bu opaklık değerlerini ara değerlerle yumuşatarak 60fps akıcılıkla geçiş yapar.

## 8. Sınırlar, erişilebilirlik ve tanılama

Nav fixed/portal yüzeyleri focus, keyboard, scroll ve z-index ilişkilerini
kendisi yönetir. `ResizeObserver`, `MutationObserver`, requestAnimationFrame,
prefetch ve continuity restore davranışları burada performans açısından
merkezîdir. Development tanı store'u bounded snapshot üretir; production'da
tanı yan etkisiz/no-op çalışır.

### 8.1 Tanı verisini inceleme

Development ortamında `getNavigationDiagnostics`, `clearNavigationDiagnostics`, `createNavigationInspectorSnapshot` ve `getNavigationInspectorSnapshot` Nav çalışma zamanının tanı yüzeyini verir. Bu fonksiyonları geliştirme araçları ve testler için kullanın. Ürün arayüzünde veya kalıcı analitik hattında bu geçici tanı state’ine bağımlı olmayın.

## 9. Kurallar

Nav’a yeni bir yetenek eklerken şu sınırları koruyun:

- **Alan içeriğini registry’de tutun:** Rota kartları, ikonlar, başlıklar ve alan eylemleri alan modülünden gelir
- **Yaşam döngüsünü hook ile bağlayın:** HUD, guard, breadcrumb override ve context action kayıtları component unmount olduğunda temizlenmelidir
- **Tanımları stabil tutun:** Surface flow tanımlarını render dışına çıkarın; sabit `id` ve `key` değerleri kullanın
- **İç rotaları doğrulayın:** Surface return hedefleri ve Nav üzerinden açılan href’ler güvenli iç rota olmalıdır
- **Katmanı doğru seçin:** Anlık bilgi için HUD, uzun iş için Operation Center, görev arayüzü için Surface, rota eylemi için command kullanın
- **Nav’ı ürün alanından bağımsız bırakın:** Ürüne ait API, model, metin veya iş kuralını `modules/nav` içine taşımayın

## 10. Doğrulama

Bir Nav entegrasyonunu gözden geçirirken aşağıdakileri kontrol edin:

- Registry kaydının cleanup’ı aynı kaynak adıyla yapılıyor mu?
- Surface component’i `close`, `pushStep` ve flow callback’lerini kendi propslarıyla çakıştırıyor mu?
- HUD progress değeri `0` ile `100`, operasyon progress değeri `0` ile `1` arasında mı?
- URL ile geri açılan flow snapshot’ı seri hale getirilebilir ve hassas olmayan veri mi içeriyor?
- Return handoff hedefi güvenli iç rota mı ve hedef sayfa sonucu bir kez tüketiyor mu?
- Rota sürekliliği için gereken hedef element `data-nav-focus-key` içeriyor mu?
