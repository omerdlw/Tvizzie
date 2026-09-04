'use client';

import { useEffect, useRef, useState } from 'react';
import { useLoadingActions, useLoadingState } from '@/modules/loading';
import { useLoadingRegistration } from '@/modules/registry';
import {
  ActionBtn,
  CodeSnippet,
  DemoCard,
  FeatureChecklist,
  JsonViewer,
  LogConsole,
  MetricPill,
  NoticeBanner,
  Section,
  SegmentedTabs,
  StateBadge,
  TextInput,
} from './shared';

export default function WorkbenchLoading() {
  const state = useLoadingState();
  const actions = useLoadingActions();

  const [activeTab, setActiveTab] = useState('demos');
  const [logs, setLogs] = useState([]);

  const addLog = (action, message, type = 'info') => {
    setLogs((prev) => [
      {
        action,
        message: typeof message === 'object' ? JSON.stringify(message) : String(message),
        time: new Date().toLocaleTimeString(),
        type,
      },
      ...prev.slice(0, 49),
    ]);
  };

  // Stopwatch timer measuring active loading duration
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerStartRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (state.isLoading) {
      timerStartRef.current = Date.now();
      setElapsedMs(0);
      interval = setInterval(() => {
        if (timerStartRef.current) {
          setElapsedMs(Date.now() - timerStartRef.current);
        }
      }, 50);
    } else {
      timerStartRef.current = null;
      setElapsedMs(0);
    }
    return () => clearInterval(interval);
  }, [state.isLoading]);

  // ESC key safeguard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && state.isLoading) {
        actions.stopLoading();
        addLog('klavye:ESC', 'ESC tuşu ile yükleme ekranı kapatıldı', 'warning');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isLoading, actions]);

  // Form options
  const [minDurationInput, setMinDurationInput] = useState(2000);
  const [showOverlayOption, setShowOverlayOption] = useState(true);

  // Declarative registry loading
  const [isRegistryLoadingActive, setIsRegistryLoadingActive] = useState(false);
  const [registryMinDuration, setRegistryMinDuration] = useState(1500);

  // useLoadingRegistration hook
  useLoadingRegistration(
    isRegistryLoadingActive
      ? {
          isLoading: true,
          minDuration: Number(registryMinDuration),
          showOverlay: showOverlayOption,
        }
      : null,
    { source: 'loading-workbench', priority: 150 },
  );

  // Demo 1: Timed Async Simulation
  const handleSimulateAsyncTask = (taskDurationMs = 2500) => {
    addLog('asyncTask', `${taskDurationMs}ms sürecek asenkron görev başlatıldı...`, 'info');
    actions.startLoading({
      minDuration: Number(minDurationInput),
      showOverlay: showOverlayOption,
    });

    setTimeout(() => {
      actions.stopLoading();
      addLog('asyncTask:bitti', `Asenkron görev tamamlandı, stopLoading() çağrıldı (${taskDurationMs}ms)`, 'success');
    }, taskDurationMs);
  };

  // Demo 2: Flicker-prevention minDuration contract
  const handleTestMinDurationContract = () => {
    const minDuration = 2500;
    addLog('flickerContract', `API sorgusu 100ms sürecek ancak minDuration=${minDuration}ms olarak ayarlandı...`, 'info');
    actions.startLoading({
      minDuration,
      showOverlay: true,
    });

    setTimeout(() => {
      addLog(
        'flickerContract:stopLoading',
        'API 100ms içinde yanıt verdi ve stopLoading() çağrıldı! minDuration kontratı gereği ekran 2500ms dolana kadar kapanmayacak.',
        'warning',
      );
      actions.stopLoading();
    }, 100);
  };

  // Demo 3: Media Grid Custom Skeleton
  const handleMediaGridSkeleton = () => {
    addLog('skeleton:grid', 'Medya ızgarası skeleton katmanı açıldı (3000ms)', 'info');
    actions.startLoading({
      minDuration: 3000,
      showOverlay: true,
      skeleton: (
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-black/90 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-5 w-40 animate-pulse rounded bg-white/20" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-video animate-pulse rounded-xl bg-white/5 border border-white/5" />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/50">
            <div className="size-2 animate-ping rounded-full bg-cyan-400" />
            <span>Medya Arşivi Çözümleniyor...</span>
          </div>
        </div>
      ),
    });

    setTimeout(() => {
      actions.stopLoading();
      addLog('skeleton:grid:bitti', 'Medya ızgarası skeleton tamamlandı', 'success');
    }, 3000);
  };

  // Demo 4: Video Player Buffering Custom Skeleton
  const handleVideoBufferingSkeleton = () => {
    addLog('skeleton:player', 'Video player buffering skeleton açıldı (2500ms)', 'info');
    actions.startLoading({
      minDuration: 2500,
      showOverlay: true,
      skeleton: (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/80 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="relative size-14">
            <div className="size-14 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-cyan-300">
              4K
            </div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-white">Akış Arabelleğe Alınıyor</div>
            <div className="text-xs text-white/50">Yüksek bit hızında segmentler çözümleniyor...</div>
          </div>
        </div>
      ),
    });

    setTimeout(() => {
      actions.stopLoading();
      addLog('skeleton:player:bitti', 'Player buffering tamamlandı', 'success');
    }, 2500);
  };

  return (
    <div className="space-y-6">
      {/* Floating Emergency Stop Button (Always visible on top of full-screen loader) */}
      {state.isLoading && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-2 rounded-xl border border-rose-500/50 bg-black/90 p-2 shadow-2xl backdrop-blur-md">
          <span className="animate-pulse font-mono text-xs text-rose-300">
            Yükleniyor ({elapsedMs}ms / min {state.minDuration}ms)
          </span>
          <button
            type="button"
            onClick={() => {
              actions.stopLoading();
              addLog('acilDurdurma', 'Kullanıcı acil durdurma butonuna bastı', 'warning');
            }}
            className="cursor-pointer rounded-lg bg-rose-500 px-3 py-1 font-mono text-xs font-bold text-black transition-colors hover:bg-rose-400"
          >
            Durdur
          </button>
        </div>
      )}

      {/* Top Metrics Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill
            label="Yükleme Durumu"
            value={state.isLoading ? 'Yükleniyor...' : 'Boşta (Idle)'}
            variant={state.isLoading ? 'amber' : 'emerald'}
          />
          <MetricPill
            label="Geçen Kronometre"
            value={state.isLoading ? `${elapsedMs} ms` : '0 ms'}
            variant={state.isLoading ? 'cyan' : 'neutral'}
          />
          <MetricPill
            label="Min Süre Kontratı"
            value={`${state.minDuration || 0} ms`}
            variant="indigo"
          />
          <MetricPill
            label="Overlay Görünürlüğü"
            value={state.showOverlay ? 'Tam Ekran' : 'Arka Planda'}
            variant={state.showOverlay ? 'indigo' : 'neutral'}
          />
        </div>
        <div className="flex items-center gap-2">
          {state.isLoading && (
            <ActionBtn size="xs" variant="danger" icon="solar:stop-bold" onClick={actions.stopLoading}>
              Yüklemeyi Kapat
            </ActionBtn>
          )}
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'demos', label: '1. Yükleme Senaryoları & Skeleton', icon: 'solar:hourglass-bold' },
          { id: 'edge_cases', label: '2. Flicker Koruması & Kontratlar', icon: 'solar:shield-warning-bold' },
          { id: 'code', label: '3. API & Kod Sözleşmesi', icon: 'solar:code-bold' },
        ]}
      />

      {/* TAB 1: DEMOS */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="info"
            title="Loading Modülü & UX Standartları"
            description="Loading modülü, asenkron geçişler ve API çağrıları sırasında kullanıcıya geri bildirim sunar. minDuration ile hızlı biten işlemlerdeki göz yoran parlamaları (flicker) engeller, özel skeleton'lar ile bağlama uygun görsel durumlar gösterir."
          />

          <Section title="Farklı Asenkron Senaryolar">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Async 2s Task */}
              <DemoCard
                title="2 Saniyelik Asenkron İşlem"
                badge="Standart Spinner"
                description="Tipik bir sayfa geçişi veya veri yükleme simülasyonu. Standart merkezi döner ikonla gösterilir."
              >
                <div className="space-y-3">
                  <div className="text-xs text-white/60">
                    Süre: 2000ms • Overlay: {showOverlayOption ? 'Açık' : 'Kapalı'}
                  </div>
                  <ActionBtn
                    fullWidth
                    variant="primary"
                    icon="solar:play-bold"
                    onClick={() => handleSimulateAsyncTask(2000)}
                  >
                    2 Sn İşlemi Başlat
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Media Grid Skeleton */}
              <DemoCard
                title="Medya Arşivi Skeleton"
                badge="Custom Skeleton"
                description="Grid görünümü yüklenirken içerik kartlarının iskelet yapısını animasyonlu olarak ekrana çizer."
              >
                <div className="space-y-3">
                  <div className="text-xs text-white/60">
                    Süre: 3000ms • Özel 6'lı kart ızgarası
                  </div>
                  <ActionBtn
                    fullWidth
                    variant="primary"
                    icon="solar:layers-bold"
                    onClick={handleMediaGridSkeleton}
                  >
                    Grid Skeleton'ı Aç
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Video Player Buffering */}
              <DemoCard
                title="Video Oynatıcı Buffering"
                badge="Özel Oynatıcı"
                description="4K video fragmanı arabelleğe alınırken gösterilen şık, modern buffering göstergesi."
              >
                <div className="space-y-3">
                  <div className="text-xs text-white/60">
                    Süre: 2500ms • Ortalanmış player HUD
                  </div>
                  <ActionBtn
                    fullWidth
                    variant="primary"
                    icon="solar:videocamera-record-bold"
                    onClick={handleVideoBufferingSkeleton}
                  >
                    Buffering Skeleton Aç
                  </ActionBtn>
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* Configuration Controls */}
          <Section title="Yükleme Parametreleri">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Varsayılan Minimum Süre (minDuration ms)"
                type="number"
                value={minDurationInput}
                onChange={(v) => setMinDurationInput(Number(v))}
              />
              <div className="flex items-center gap-2 pt-6">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={showOverlayOption}
                    onChange={(e) => setShowOverlayOption(e.target.checked)}
                    className="rounded border-white/10"
                  />
                  Tam ekran karartma katmanını göster (showOverlay)
                </label>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* TAB 2: EDGE CASES & CONTRACTS */}
      {activeTab === 'edge_cases' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="warning"
            title="Parlamayı Önleme (Flicker Prevention) Garantisi"
            description="Eğer bir API isteği 50-100 milisaniye gibi çok kısa bir sürede tamamlansa bile, kullanıcı arayüzün aniden yanıp sönmesini hissetmemelidir. minDuration kontratı sayesinde stopLoading() erken çağrılsa bile ekran belirlenen minimum süre dolana kadar açık tutulur."
          />

          <Section title="Kontrat Doğrulama Senaryoları">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Flicker Contract Test */}
              <DemoCard
                title="Erken stopLoading() Çağrısı (Flicker Testi)"
                badge="minDuration: 2500ms"
                description="İşlem 100ms sonra stopLoading() çağırır, ancak minDuration 2500ms olduğu için sistem 2400ms daha bekletir."
              >
                <div className="space-y-3">
                  <div className="text-xs text-white/60">
                    API Cevap Süresi: 100ms • Beklenen Ekran Süresi: 2500ms
                  </div>
                  <ActionBtn
                    fullWidth
                    variant="primary"
                    icon="solar:hourglass-bold"
                    onClick={handleTestMinDurationContract}
                  >
                    Flicker Testini Başlat
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Declarative Registry Loading */}
              <DemoCard
                title="Registry Üzerinden Deklaratif Yükleme"
                badge="useLoadingRegistration"
                description="Bileşenin yaşam döngüsüne bağlı olarak Registry havuzuna yükleme durumunu deklare edin."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Registry Durumu:</span>
                    <StateBadge
                      label="Durum"
                      value={isRegistryLoadingActive ? 'Kayıtlı' : 'Pasif'}
                      variant={isRegistryLoadingActive ? 'warning' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={isRegistryLoadingActive ? 'danger' : 'neutral'}
                    onClick={() => {
                      setIsRegistryLoadingActive((p) => !p);
                      addLog('registry', `Registry loading kaydı ${!isRegistryLoadingActive ? 'aktif edildi' : 'kaldırıldı'}`);
                    }}
                  >
                    {isRegistryLoadingActive ? 'Registry Kaydını Kaldır' : 'Registry ile Yüklemeyi Başlat'}
                  </ActionBtn>
                </div>
              </DemoCard>
            </div>
          </Section>

          <Section title="Loading Modülü Doğrulama Matrisi">
            <FeatureChecklist
              items={[
                { label: 'minDuration kontratı ile mikro-sürelerde parlamanın önlenmesi', checked: true },
                { label: 'Özel React skeleton bileşenlerinin render desteği', checked: true },
                { label: 'showOverlay: false ile sessiz/arka planda yükleme desteği', checked: true },
                { label: 'Fullscreen state aktifken otomatik bastırılma (suppression)', checked: true },
                { label: 'ESC tuşuna basıldığında yüklemenin güvenli kapanması', checked: true },
                { label: 'Bileşen unmount olduğunda bekleyen timerların temizlenmesi (cleanup)', checked: true },
              ]}
            />
          </Section>
        </div>
      )}

      {/* TAB 3: CODE SNIPPETS */}
      {activeTab === 'code' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="success"
            title="Kullanım Standartları & Best Practices"
            description="Uzun süren işlemlerde startLoading({ minDuration: 400 }) kullanarak kullanıcıya stabil bir deneyim sunun."
          />

          <CodeSnippet
            title="1. Asenkron API İsteğinde minDuration Kullanımı"
            code={`import { useLoadingActions } from '@/modules/loading';

function SearchComponent() {
  const { startLoading, stopLoading } = useLoadingActions();

  const handleFetch = async () => {
    // 400ms minDuration göz yoran titreşimi engeller
    startLoading({ minDuration: 400 });
    try {
      await fetchCatalog();
    } finally {
      stopLoading();
    }
  };

  return <button onClick={handleFetch}>Verileri Çek</button>;
}`}
          />

          <CodeSnippet
            title="2. Özel Skeleton Tanımlama"
            code={`import { useLoadingActions } from '@/modules/loading';

function ProfileSection() {
  const { startLoading, stopLoading } = useLoadingActions();

  const loadProfile = async () => {
    startLoading({
      minDuration: 1000,
      skeleton: (
        <div className="p-6 bg-black/80 rounded-2xl animate-pulse">
          <div className="size-16 rounded-full bg-white/20 mb-3" />
          <div className="h-4 w-32 bg-white/20 rounded" />
        </div>
      ),
    });
    await fetchProfile();
    stopLoading();
  };

  return <button onClick={loadProfile}>Profili Yükle</button>;
}`}
          />
        </div>
      )}

      {/* Telemetry & State Viewer */}
      <Section title="Canlı Yükleme Durumu (Telemetry)">
        <JsonViewer
          data={{
            yukleniyorMu: state.isLoading,
            sayfaYukleniyorMu: state.isPageLoading,
            minimumSureMs: state.minDuration,
            overlayGorunurMu: state.showOverlay,
            ozelSkeletonVarMi: Boolean(state.skeleton),
            gecenSureMs: elapsedMs,
          }}
          title="useLoadingState()"
        />
      </Section>

      {/* Log Console */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Yükleme Olay Günlüğü" />
    </div>
  );
}

