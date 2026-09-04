'use client';

import { useEffect, useState } from 'react';
import { ComponentError, getErrorReporter, ModuleError } from '@/modules/error-boundary';
import { EVENT_TYPES, globalEvents } from '@/shared';
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

// Child component that crashes purposefully on render when flag is active
function CrashingChild({ shouldThrow, errorMessage }) {
  if (shouldThrow) {
    throw new Error(errorMessage || 'Planlı test render hatası fırlatıldı!');
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 font-mono text-xs text-emerald-300">
      <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>Bileşen sağlıklı çalışıyor. Aktif bir çalışma zamanı hatası yok.</span>
    </div>
  );
}

export default function WorkbenchErrorBoundary() {
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

  // ComponentError trigger state
  const [shouldThrowComponent, setShouldThrowComponent] = useState(false);
  const [componentErrorMessage, setComponentErrorMessage] = useState('Alt bileşen render exception hatası');

  // ModuleError trigger state
  const [shouldThrowModule, setShouldThrowModule] = useState(false);
  const [moduleErrorMessage, setModuleErrorMessage] = useState('Modül çekirdek yaşam döngüsü çökmesi');

  // Telemetry manual reporter inputs
  const [manualErrorText, setManualErrorText] = useState('Manuel telemetri test hatası');
  const [manualErrorTag, setManualErrorTag] = useState('test-laboratuvari');

  // Deduplication storm stats
  const [stormCount, setStormCount] = useState(0);
  const [dedupedCount, setDedupedCount] = useState(0);

  // Captured reports history
  const [capturedReports, setCapturedReports] = useState([]);

  // Subscribe to ErrorReporter & globalEvents
  useEffect(() => {
    const reporter = getErrorReporter();

    const testHandlerName = 'playground-reporter-listener';
    reporter.removeHandler(testHandlerName);
    reporter.addHandler({
      name: testHandlerName,
      handle: (report) => {
        setCapturedReports((prev) => [report, ...prev.slice(0, 19)]);
        addLog('reporter:captured', `${report.error?.name}: ${report.error?.message}`, 'warning');
      },
    });

    const unsubscribeAppError = globalEvents.subscribe(EVENT_TYPES.APP_ERROR, (event) => {
      addLog('globalEvents:APP_ERROR', event?.message || 'Uygulama hatası yayımlandı', 'error');
    });

    return () => {
      reporter.removeHandler(testHandlerName);
      unsubscribeAppError?.();
    };
  }, []);

  // Edge Case: Global Unhandled Rejection
  const handleTriggerUnhandledRejection = () => {
    addLog('runtime', 'Global yakalanmamış Promise reddi fırlatılıyor...', 'info');
    setTimeout(() => {
      Promise.reject(new Error('GlobalErrorListener için simüle edilmiş asenkron Promise reddi'));
    }, 50);
  };

  // Edge Case: Global Window OnError
  const handleTriggerWindowError = () => {
    addLog('runtime', 'window.onerror için ErrorEvent fırlatılıyor...', 'info');
    if (typeof window !== 'undefined') {
      const errorEvent = new ErrorEvent('error', {
        error: new Error('window.onerror için simüle edilmiş global çalışma zamanı hatası'),
        message: 'window.onerror için simüle edilmiş global çalışma zamanı hatası',
      });
      window.dispatchEvent(errorEvent);
    }
  };

  // Edge Case: Deduplication Storm (Trigger 10 identical errors at once)
  const handleTriggerDeduplicationStorm = () => {
    const reporter = getErrorReporter();
    const stormError = new Error('Aynı anda fırlatılan 10 kopya hata (Dedupe Test)');
    let emitted = 0;

    for (let i = 0; i < 10; i++) {
      const result = reporter.captureError(stormError, { testRun: i });
      if (result) emitted++;
    }

    setStormCount((c) => c + 10);
    setDedupedCount((d) => d + (10 - emitted));
    addLog('dedupeStorm', `10 adet aynı hata gönderildi -> ${emitted} adet yakalandı, ${10 - emitted} adet dedupe ile filtrelendi`, 'success');
  };

  const handleManualCapture = () => {
    const reporter = getErrorReporter();
    const error = new Error(manualErrorText);
    reporter.setTag('environment', 'workbench');
    reporter.setTag('laboratuvar', manualErrorTag);
    reporter.captureError(error, {
      route: '/modules',
      variant: 'manual-capture',
    });
    addLog('captureError', `Manuel hata kaydedildi: "${manualErrorText}"`, 'info');
  };

  const handleManualMessage = () => {
    const reporter = getErrorReporter();
    reporter.captureMessage(`Test telemetri mesajı: ${manualErrorText}`, 'info', {
      source: 'error-boundary-workbench',
    });
    addLog('captureMessage', `Telemetri mesajı kaydedildi: "${manualErrorText}"`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill
            label="Bileşen Durumu"
            value={shouldThrowComponent ? 'Çöktü (Hata Ekranı)' : 'Sağlıklı'}
            variant={shouldThrowComponent ? 'rose' : 'emerald'}
          />
          <MetricPill
            label="Modül Durumu"
            value={shouldThrowModule ? 'Çöktü (Modül Sınırı)' : 'Sağlıklı'}
            variant={shouldThrowModule ? 'rose' : 'emerald'}
          />
          <MetricPill
            label="Yakalanan Raporlar"
            value={`${capturedReports.length} Rapor`}
            variant={capturedReports.length > 0 ? 'amber' : 'neutral'}
          />
          <MetricPill
            label="Dedupe İstatistiği"
            value={`${dedupedCount} / ${stormCount} Filtrelendi`}
            variant={dedupedCount > 0 ? 'cyan' : 'neutral'}
          />
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn
            size="xs"
            variant="neutral"
            icon="solar:refresh-bold"
            onClick={() => {
              setShouldThrowComponent(false);
              setShouldThrowModule(false);
              setCapturedReports([]);
              setStormCount(0);
              setDedupedCount(0);
              addLog('reset', 'Tüm hata durumları ve sayaçlar sıfırlandı');
            }}
          >
            Sıfırla
          </ActionBtn>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'demos', label: '1. Hata Sınırları (Component vs Module)', icon: 'solar:shield-warning-bold' },
          { id: 'edge_cases', label: '2. Deduplication & Global Listeners', icon: 'solar:bug-bold' },
          { id: 'code', label: '3. API & Kod Sözleşmesi', icon: 'solar:code-bold' },
        ]}
      />

      {/* TAB 1: DEMOS */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="info"
            title="İki Seviyeli Hata İzolasyonu"
            description="ComponentError: Küçük bir UI parçasını izole eder, sayfanın geri kalanını çökertmeden yerel 'Yeniden Dene' butonu sunar. ModuleError: Tüm bir modülü veya alt paneli sarar, modül düzeyinde hata bildirimi ve kurtarma sağlar."
          />

          <Section title="Hata Sınırı Simülasyonu">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* ComponentError Arena */}
              <DemoCard
                title="Bileşen Hata Sınırı (ComponentError)"
                badge="Lokal İzolasyon"
                description="Hata sadece bu kutu içinde hapsolur. Sayfanın başlığı, navigasyonu veya diğer bileşenleri etkilenmez."
              >
                <div className="space-y-4">
                  <TextInput
                    label="Hata Mesajı"
                    value={componentErrorMessage}
                    onChange={setComponentErrorMessage}
                  />

                  <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                    <ComponentError
                      message={componentErrorMessage}
                      onReset={() => {
                        setShouldThrowComponent(false);
                        addLog('ComponentError:onReset', 'Bileşen hatası sıfırlandı, yeniden render ediliyor', 'success');
                      }}
                    >
                      <CrashingChild
                        shouldThrow={shouldThrowComponent}
                        errorMessage={componentErrorMessage}
                      />
                    </ComponentError>
                  </div>

                  <ActionBtn
                    fullWidth
                    variant={shouldThrowComponent ? 'success' : 'danger'}
                    icon={shouldThrowComponent ? 'solar:refresh-bold' : 'solar:danger-triangle-bold'}
                    onClick={() => {
                      setShouldThrowComponent((prev) => !prev);
                      addLog('toggle:component', `Bileşen çökme durumu: ${!shouldThrowComponent ? 'ÇÖKTÜ' : 'KURTARILDI'}`);
                    }}
                  >
                    {shouldThrowComponent ? 'Bileşeni Kurtar (Reset)' : 'Bileşende Render Hatası Fırlat'}
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* ModuleError Arena */}
              <DemoCard
                title="Modül Düzeyi Sınır (ModuleError)"
                badge="Geniş Kapsam"
                description="Tüm bir modülü (örneğin Video Galerisi veya Arama Paneli) izole eder. Hata durumunda modül adıyla şık bir hata kartı sunar."
              >
                <div className="space-y-4">
                  <TextInput
                    label="Modül Hata Mesajı"
                    value={moduleErrorMessage}
                    onChange={setModuleErrorMessage}
                  />

                  <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                    <ModuleError
                      name="MedyaKütüphanesi"
                      onReset={() => {
                        setShouldThrowModule(false);
                        addLog('ModuleError:onReset', 'Modül hatası sıfırlandı', 'success');
                      }}
                    >
                      <CrashingChild
                        shouldThrow={shouldThrowModule}
                        errorMessage={moduleErrorMessage}
                      />
                    </ModuleError>
                  </div>

                  <ActionBtn
                    fullWidth
                    variant={shouldThrowModule ? 'success' : 'danger'}
                    icon={shouldThrowModule ? 'solar:refresh-bold' : 'solar:danger-triangle-bold'}
                    onClick={() => {
                      setShouldThrowModule((prev) => !prev);
                      addLog('toggle:module', `Modül çökme durumu: ${!shouldThrowModule ? 'ÇÖKTÜ' : 'KURTARILDI'}`);
                    }}
                  >
                    {shouldThrowModule ? 'Modülü Kurtar (Reset)' : 'Modül Düzeyinde Hata Fırlat'}
                  </ActionBtn>
                </div>
              </DemoCard>
            </div>
          </Section>
        </div>
      )}

      {/* TAB 2: EDGE CASES & TELEMETRY */}
      {activeTab === 'edge_cases' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="warning"
            title="Deduplication (Çift Rapor Engelleme) & Global Dinleyiciler"
            description="Bir döngü veya ağ çöküşünde aynı hatanın binlerce kez fırlatılması telemetri sunucusunu kitlememelidir. ErrorReporter, fingerprint (parmak izi) bazlı 60 saniyelik tekilleştirme penceresiyle spam'i engeller."
          />

          <Section title="Uç Durum Simülatörleri">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Deduplication Storm */}
              <DemoCard
                title="10'lu Hata Fırtınası (Deduplication)"
                badge="Fingerprint Filter"
                description="Aynı hatayı bir döngüde 10 kez ardışık tetikler. ErrorReporter yalnızca ilkini kaydeder, kalan 9'unu sessizce eler."
              >
                <div className="space-y-3">
                  <div className="text-xs text-white/60">
                    Filtrelenen Spam: {dedupedCount} / {stormCount}
                  </div>
                  <ActionBtn
                    fullWidth
                    variant="primary"
                    icon="solar:bolt-bold"
                    onClick={handleTriggerDeduplicationStorm}
                  >
                    10 Kopya Hata Fırlat
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Unhandled Promise Rejection */}
              <DemoCard
                title="Unhandled Promise Rejection"
                badge="Async Exception"
                description="GlobalErrorListener tarafından yakalanan asenkron Promise reddi simülasyonu."
              >
                <div className="space-y-3">
                  <div className="text-xs text-white/60">
                    window.onunhandledrejection olayını tetikler
                  </div>
                  <ActionBtn
                    fullWidth
                    variant="danger"
                    icon="solar:danger-triangle-bold"
                    onClick={handleTriggerUnhandledRejection}
                  >
                    Promise Reddi Fırlat
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Window OnError */}
              <DemoCard
                title="Global Window ErrorEvent"
                badge="Runtime Crash"
                description="window.onerror üzerinden yakalanan küresel JavaScript çalışma zamanı istisnası."
              >
                <div className="space-y-3">
                  <div className="text-xs text-white/60">
                    window.dispatchEvent(new ErrorEvent('error'))
                  </div>
                  <ActionBtn
                    fullWidth
                    variant="danger"
                    icon="solar:bug-bold"
                    onClick={handleTriggerWindowError}
                  >
                    Window Hatası Fırlat
                  </ActionBtn>
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* Manual Telemetry Dispatcher */}
          <Section title="Manuel Telemetri Kaydı">
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextInput
                  label="Hata Metni / Başlık"
                  value={manualErrorText}
                  onChange={setManualErrorText}
                />
                <TextInput
                  label="Etiket (Tag: laboratuvar)"
                  value={manualErrorTag}
                  onChange={setManualErrorTag}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ActionBtn
                  variant="primary"
                  icon="solar:cloud-upload-bold"
                  onClick={handleManualCapture}
                >
                  captureError() Çağır
                </ActionBtn>
                <ActionBtn
                  variant="neutral"
                  icon="solar:chat-round-bold"
                  onClick={handleManualMessage}
                >
                  captureMessage() Çağır
                </ActionBtn>
              </div>
            </div>
          </Section>

          <Section title="Error Boundary Modülü Doğrulama Matrisi">
            <FeatureChecklist
              items={[
                { label: 'ComponentError ile izole React render çökmesi yakalama', checked: true },
                { label: 'ModuleError ile modül düzeyinde şık hata kartı ve onReset desteği', checked: true },
                { label: 'Fingerprint bazlı 60 saniyelik otomatik deduplication penceresi', checked: true },
                { label: 'GlobalErrorListener (unhandledrejection ve onerror entegrasyonu)', checked: true },
                { label: 'globalEvents APP_ERROR olay yayınlama entegrasyonu', checked: true },
                { label: 'Özel context ve tag ekleme (setTag, setContext) yeteneği', checked: true },
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
            description="Kritik UI parçalarını her zaman ComponentError veya ModuleError ile sarmalayın. API seviyesindeki beklenmeyen hataları ise getErrorReporter() ile yakalayın."
          />

          <CodeSnippet
            title="1. Kritik Alt Bileşeni ComponentError ile Koruma"
            code={`import { ComponentError } from '@/modules/error-boundary';

function VideoPlayerWrapper({ videoId }) {
  return (
    <ComponentError
      message="Video oynatıcı yüklenirken bir sorun oluştu."
      onReset={() => console.log('Oynatıcı yeniden başlatılıyor...')}
    >
      <VideoPlayer videoId={videoId} />
    </ComponentError>
  );
}`}
          />

          <CodeSnippet
            title="2. getErrorReporter ile Özel Hata Telemetrisi"
            code={`import { getErrorReporter } from '@/modules/error-boundary';

async function fetchExternalMedia(url) {
  const reporter = getErrorReporter();
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(\`Media fetch failed: \${res.status}\`);
    return await res.json();
  } catch (err) {
    reporter.setTag('feature', 'media-fetch');
    reporter.captureError(err, { targetUrl: url });
    throw err;
  }
}`}
          />
        </div>
      )}

      {/* Captured Report Inspector */}
      <Section title="Son Yakalanan Telemetri Raporu (JSON)">
        <JsonViewer
          data={capturedReports[0] || { durum: 'Henüz yakalanan bir telemetri raporu yok' }}
          title="Son Hata Raporu"
        />
      </Section>

      {/* Log Console */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Hata Sınırı Olay Günlüğü" />
    </div>
  );
}

