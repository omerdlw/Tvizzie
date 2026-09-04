'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  createSurfaceFlowDefinition,
  NavSurfaceHeader,
  NavSurfaceShell,
  useNavigation,
  useNavigationActions,
  useNavigationGuard,
  useNavigationOperations,
  useNavigationState,
  useRegisterBreadcrumbOverride,
} from '@/modules/nav';
import { useNavRegistration } from '@/modules/registry';
import { useSelectionHud } from '@/domains/shell/navigation/huds/selection-hud';
import { useProgressHud } from '@/domains/shell/navigation/huds/progress-hud';
import { useContextActionHud } from '@/domains/shell/navigation/huds/context-action-hud';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import {
  ActionBtn,
  CodeSnippet,
  DemoCard,
  FeatureChecklist,
  JsonViewer,
  LogConsole,
  NoticeBanner,
  Section,
  SegmentedTabs,
  StateBadge,
  TextInput,
} from './shared';

// ── 1. Tekil Test Yüzeyi ───────────────────────────────────────────────────
function TestNavSurface({ close, input }) {
  return (
    <NavSurfaceShell className="space-y-3 p-4 font-mono text-xs text-white">
      <NavSurfaceHeader
        title="Özel Navigasyon Yüzeyi"
        description="Doğrudan Nav dock kartının içerisine monte edilir"
        onClose={close}
      />
      <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
        <div>Alınan Girdi: {input?.message || 'Varsayılan'}</div>
        <p className="text-white/50">
          Bu yüzey nav dock&apos;unun üzerine yerel animasyonlarla açılır ve kapatıldığında sonucu
          geri iletir
        </p>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          onClick={() => close({ action: 'yuzey_kapatildi' })}
          className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-white/70 hover:text-white"
        >
          Kapat
        </Button>
        <Button
          type="button"
          onClick={() => close({ action: 'yuzey_onaylandi', completedAt: Date.now() })}
          className="cursor-pointer rounded-lg bg-white px-3 py-1.5 font-semibold text-black"
        >
          Onayla ve Bitir
        </Button>
      </div>
    </NavSurfaceShell>
  );
}

// ── 2. Gerçek Çok Adımlı Yüzey Sihirbazı (True Multi-Step Wizard) ────────────
function TrueMultiStepSurface({ close, input }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState('Sinematik Koyu');
  const [enableTelemetry, setEnableTelemetry] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  return (
    <NavSurfaceShell className="space-y-4 p-4 font-mono text-xs text-white">
      <NavSurfaceHeader
        title={`Çok Adımlı Kurulum Sihirbazı (Adım ${currentStep} / 3)`}
        description="Nav dock üzerinde ileri-geri gezinilebilen gerçek çok adımlı akış"
        onClose={() => close({ cancelled: true })}
      />

      {/* Adım Göstergesi */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              step <= currentStep ? 'bg-white' : 'bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Adım 1: Tema Seçimi */}
      {currentStep === 1 && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="font-semibold text-white">1. Adım: Arayüz Temasını Seçin</div>
          <div className="grid grid-cols-3 gap-2">
            {['Sinematik Koyu', 'Gece Mavisi', 'Minimalist Siyah'].map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setSelectedTheme(theme)}
                className={`cursor-pointer rounded-lg border p-2.5 text-center transition-colors ${
                  selectedTheme === theme
                    ? 'border-white bg-white font-semibold text-black'
                    : 'border-white/10 text-white/70 hover:border-white/15'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Adım 2: Tercih Ayarları */}
      {currentStep === 2 && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="font-semibold text-white">2. Adım: Sistem Özelliklerini Yapılandırın</div>
          <label className="flex cursor-pointer items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={enableTelemetry}
              onChange={(e) => setEnableTelemetry(e.target.checked)}
              className="cursor-pointer rounded border-white/10"
            />
            <span>Geliştirici telemetrisi ve loglama aktif</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="cursor-pointer rounded border-white/10"
            />
            <span>Değişiklikleri yerel tarayıcı hafızasına otomatik kaydet</span>
          </label>
        </div>
      )}

      {/* Adım 3: Özet ve Onay */}
      {currentStep === 3 && (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="font-semibold text-emerald-400">3. Adım: Kurulum Özeti</div>
          <div className="space-y-1 text-white/70">
            <div>
              Seçilen Tema: <strong className="text-white">{selectedTheme}</strong>
            </div>
            <div>
              Telemetri: <strong className="text-white">{enableTelemetry ? 'Açık' : 'Kapalı'}</strong>
            </div>
            <div>
              Otomatik Kayıt: <strong className="text-white">{autoSave ? 'Aktif' : 'Pasif'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* İleri / Geri / Bitir Navigasyon Butonları */}
      <div className="flex items-center justify-between border-t border-white/10 pt-2">
        <div>
          {currentStep > 1 && (
            <Button
              type="button"
              onClick={() => setCurrentStep((s) => s - 1)}
              className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-white/70 hover:text-white"
            >
              &larr; Önceki Adım
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              className="cursor-pointer rounded-lg bg-white px-4 py-1.5 font-semibold text-black"
            >
              Sonraki Adım &rarr;
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() =>
                close({
                  completed: true,
                  theme: selectedTheme,
                  telemetry: enableTelemetry,
                  autoSave,
                })
              }
              className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-1.5 font-semibold text-black"
            >
              Kurulumu Tamamla ve Kapat
            </Button>
          )}
        </div>
      </div>
    </NavSurfaceShell>
  );
}

// Çok adımlı akış tanımı
const MULTI_STEP_FLOW = createSurfaceFlowDefinition({
  id: 'tvizzie-multi-step-wizard',
  createSurface: ({ input }) => ({
    component: TrueMultiStepSurface,
    props: { input: input || { message: 'Sihirbaz Başlatıldı' } },
    title: 'Çok Adımlı Kurulum Akışı',
  }),
});

export default function WorkbenchNav() {
  const [currentTab, setCurrentTab] = useState('demos');
  const pathname = usePathname();
  const navState = useNavigationState();
  const navActions = useNavigationActions();
  const { navigate } = useNavigation();
  const operations = useNavigationOperations();

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

  // Nav Kartı Formu
  const [navTitle, setNavTitle] = useState('Modül Test Merkezi');
  const [navDesc, setNavDesc] = useState('İnteraktif Modül Laboratuvarı');
  const [navIcon, setNavIcon] = useState('solar:widget-2-bold');

  // Bu sayfa için Dinamik Nav Kartı Kaydı
  useNavRegistration(
    {
      path: pathname,
      title: navTitle,
      description: navDesc,
      icon: navIcon,
    },
    { source: 'nav-workbench', priority: 200 },
  );

  // HUD Modu Seçimi: 'selection' | 'progress' | 'actions' | null
  const [activeHudMode, setActiveHudMode] = useState(null);
  const [selectedItemCount, setSelectedItemCount] = useState(5);
  const [progressPercent, setProgressPercent] = useState(65);

  // 1. Seçim HUD'ı
  const selectionActions = useMemo(
    () => [
      {
        key: 'select-all',
        label: 'Tümünü Seç (24)',
        icon: 'solar:check-read-linear',
        onClick: () => {
          setSelectedItemCount(24);
          addLog('selectionHud:tumunuSec', '24 öge seçildi', 'info');
        },
      },
      {
        key: 'bulk-export',
        label: 'Dışa Aktar',
        icon: 'solar:download-bold',
        onClick: () => {
          addLog('selectionHud:export', `${selectedItemCount} öge dışa aktarılıyor...`, 'success');
        },
      },
      {
        key: 'bulk-delete',
        label: 'Seçilenleri Sil',
        icon: 'solar:trash-bin-trash-bold',
        isDestructive: true,
        onClick: () => {
          addLog('selectionHud:topluSil', `${selectedItemCount} öge silindi`, 'error');
          setActiveHudMode(null);
        },
      },
    ],
    [selectedItemCount],
  );

  useSelectionHud({
    isActive: activeHudMode === 'selection',
    count: selectedItemCount,
    title: `${selectedItemCount} öge seçildi`,
    actions: selectionActions,
    onCancel: useCallback(() => {
      addLog('selectionHud:iptal', 'Seçim HUD kapatıldı', 'info');
      setActiveHudMode(null);
    }, []),
  });

  // 2. İlerleme HUD'ı
  useProgressHud({
    isActive: activeHudMode === 'progress',
    title: 'İzleme Listesi Eşitleniyor...',
    description: `%${progressPercent} tamamlandı`,
    progress: progressPercent,
    icon: 'solar:refresh-circle-bold',
    onCancel: useCallback(() => {
      addLog('progressHud:iptal', 'İlerleme HUD iptal edildi', 'warning');
      setActiveHudMode(null);
    }, []),
  });

  // 3. Hızlı Bağlam Eylem Tepsisi
  const contextHudActions = useMemo(
    () => [
      {
        key: 'filter-movies',
        label: 'Filmler',
        icon: 'solar:clapperboard-bold',
        onClick: () => {
          addLog('contextHud:filmler', 'Filmler filtrelendi', 'success');
          setActiveHudMode(null);
        },
      },
      {
        key: 'filter-series',
        label: 'Diziler',
        icon: 'solar:tv-bold',
        onClick: () => {
          addLog('contextHud:diziler', 'Diziler filtrelendi', 'success');
          setActiveHudMode(null);
        },
      },
      {
        key: 'filter-anime',
        label: 'Animasyon',
        icon: 'solar:star-bold',
        onClick: () => {
          addLog('contextHud:animasyon', 'Animasyon filtrelendi', 'success');
          setActiveHudMode(null);
        },
      },
    ],
    [],
  );

  useContextActionHud({
    isActive: activeHudMode === 'actions',
    title: 'Hızlı Filtre Eylemleri',
    description: 'Nav dock üzerinden tek tıkla filtreleme',
    icon: 'solar:tuning-2-bold',
    actions: contextHudActions,
    onCancel: useCallback(() => {
      addLog('contextHud:iptal', 'Filtre HUD kapatıldı', 'info');
      setActiveHudMode(null);
    }, []),
  });

  // 4. Navigasyon Koruması (Nav Guard)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleGuardBlock = useCallback(({ to }) => {
    addLog(
      'koruma:engellendi',
      `Sayfadan ayrılma engellendi! Hedef: ${to} (Kaydedilmemiş değişiklikler var)`,
      'error',
    );
  }, []);

  useNavigationGuard({
    when: hasUnsavedChanges,
    message:
      'Modül test alanında kaydedilmemiş değişiklikler var. Sayfadan ayrılmak istiyor musunuz?',
    onBlock: handleGuardBlock,
  });

  // Test gezinme denemesi (Korumayı test etmek için)
  const handleAttemptNavigate = async (targetUrl) => {
    addLog('gezinme:deneme', `Gezinme başlatılıyor: ${targetUrl}...`, 'info');
    const didNavigate = await navigate(targetUrl);
    if (!didNavigate) {
      addLog(
        'gezinme:bloke',
        `Geçiş engellendi! Nav guard devrede.`,
        'warning',
      );
    } else {
      addLog('gezinme:izin', `Geçişe izin verildi`, 'success');
    }
  };

  // 5. Breadcrumb Override
  const [overrideBreadcrumb, setOverrideBreadcrumb] = useState(false);
  const [breadcrumbCustomTitle, setBreadcrumbCustomTitle] = useState('Modül Geliştirici Stüdyosu');

  useRegisterBreadcrumbOverride(
    overrideBreadcrumb
      ? {
          path: pathname,
          title: breadcrumbCustomTitle,
          icon: 'solar:pin-bold',
        }
      : undefined,
  );

  // 6. Görev Merkezi
  const [activeOpId, setActiveOpId] = useState(null);

  const handleStartOperation = () => {
    const op = operations.start({ label: 'Veritabanı Yedeklemesi & Senkronizasyon', progress: 0.1 });
    setActiveOpId(op.id);
    addLog('operations.start', `Görev ID: ${op.id} başlatıldı`, 'info');

    let current = 0.1;
    const interval = setInterval(() => {
      current += 0.25;
      if (current >= 1.0) {
        clearInterval(interval);
        operations.complete(op.id, { success: true });
        setActiveOpId(null);
        addLog('operations.complete', `Görev ${op.id} başarıyla sonuçlandı (%100)`, 'success');
      } else {
        operations.update(op.id, { progress: Math.min(0.95, current) });
        addLog('operations.update', `İlerleme: %${Math.round(current * 100)}`);
      }
    }, 400);
  };

  const handleOpenSurface = () => {
    addLog('openSurface', 'Tekil Test Yüzeyi açılıyor...');
    navActions.openSurface({
      component: TestNavSurface,
      props: { input: { message: 'Manuel Tetikleme' } },
      title: 'Test Yüzeyi',
    });
  };

  const handleOpenMultiStepFlow = () => {
    addLog('openSurfaceFlow', 'Gerçek Çok Adımlı Sihirbaz (3 Adım) açılıyor...');
    navActions.openSurfaceFlow(MULTI_STEP_FLOW, { message: 'Sihirbaz Başlatıldı' });
  };

  return (
    <div className="space-y-6">
      {/* Üst Sekmeler */}
      <SegmentedTabs
        tabs={[
          { id: 'demos', label: 'İnteraktif Demolar', icon: 'solar:compass-bold', badge: '5' },
          { id: 'edge_cases', label: 'Uç Durumlar & Koruma', icon: 'solar:shield-check-bold', badge: '3' },
          { id: 'code', label: 'API & Kod Örnekleri', icon: 'solar:code-bold' },
        ]}
        activeTab={currentTab}
        onChange={setCurrentTab}
      />

      {/* Navigasyon Durumu Paneli */}
      <Section
        title="Canlı Navigasyon Durumu"
        badge={activeHudMode ? `HUD: ${activeHudMode}` : 'Dock Hazır'}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StateBadge
            label="HUD Modu"
            value={activeHudMode || 'Yok'}
            variant={activeHudMode ? 'info' : 'neutral'}
          />
          <StateBadge
            label="Yüzey (Surface)"
            value={navState.activeSurface ? 'Açık' : 'Kapalı'}
            variant={navState.activeSurface ? 'success' : 'neutral'}
          />
          <StateBadge
            label="Gezinme Koruması"
            value={hasUnsavedChanges ? 'Devrede' : 'Pasif'}
            variant={hasUnsavedChanges ? 'error' : 'neutral'}
          />
          <StateBadge
            label="Aktif Operasyon"
            value={activeOpId ? 'Yürütülüyor' : 'Yok'}
            variant={activeOpId ? 'warning' : 'neutral'}
          />
        </div>

        <JsonViewer
          data={{
            activeSurface: navState.activeSurface,
            activeHudMode,
            hasUnsavedChanges,
            activeOperationId: activeOpId,
            breadcrumbOverride: overrideBreadcrumb ? breadcrumbCustomTitle : null,
          }}
          title="useNavigationState() Özeti"
        />
      </Section>

      {/* SEKME 1: İNTERAKTİF DEMOLAR */}
      {currentTab === 'demos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DemoCard
              title="Çoklu Seçim HUD'ı"
              subtitle="useSelectionHud()"
              badge="Selection"
              badgeVariant="info"
              icon="solar:check-square-bold"
              action={
                <ActionBtn
                  size="xs"
                  onClick={() => setActiveHudMode((prev) => (prev === 'selection' ? null : 'selection'))}
                  variant={activeHudMode === 'selection' ? 'danger' : 'primary'}
                >
                  {activeHudMode === 'selection' ? 'Kapat' : 'HUD Aç (5 Öge)'}
                </ActionBtn>
              }
            >
              Dock üzerinde seçim sayacını, tümünü seçme ve toplu silme eylemlerini render eder.
            </DemoCard>

            <DemoCard
              title="İlerleme HUD'ı"
              subtitle="useProgressHud()"
              badge="Progress"
              badgeVariant="warning"
              icon="solar:refresh-circle-bold"
              action={
                <ActionBtn
                  size="xs"
                  onClick={() => setActiveHudMode((prev) => (prev === 'progress' ? null : 'progress'))}
                  variant={activeHudMode === 'progress' ? 'danger' : 'default'}
                >
                  {activeHudMode === 'progress' ? 'Kapat' : 'HUD Aç (%65)'}
                </ActionBtn>
              }
            >
              Senkronizasyon veya dosya transferi için dairesel/çubuklu ilerleme göstergesi sunar.
            </DemoCard>

            <DemoCard
              title="Hızlı Filtre HUD'ı"
              subtitle="useContextActionHud()"
              badge="Context"
              badgeVariant="success"
              icon="solar:tuning-2-bold"
              action={
                <ActionBtn
                  size="xs"
                  onClick={() => setActiveHudMode((prev) => (prev === 'actions' ? null : 'actions'))}
                  variant={activeHudMode === 'actions' ? 'danger' : 'default'}
                >
                  {activeHudMode === 'actions' ? 'Kapat' : 'Filtreleri Göster'}
                </ActionBtn>
              }
            >
              Dock üzerinde anında yatay buton tepsisi açarak kategori ve medya filtreleri sunar.
            </DemoCard>

            <DemoCard
              title="Tekil Nav Yüzeyi"
              subtitle="openSurface()"
              badge="Surface"
              badgeVariant="purple"
              icon="solar:panel-bottom-bold"
              action={
                <ActionBtn size="xs" onClick={handleOpenSurface} variant="default">
                  Yüzey Aç
                </ActionBtn>
              }
            >
              Nav dock alanına doğrudan gömülen tam genişlikli geçici arayüz katmanı.
            </DemoCard>

            <DemoCard
              title="Çok Adımlı Kurulum Sihirbazı"
              subtitle="createSurfaceFlowDefinition()"
              badge="3-Step Flow"
              badgeVariant="success"
              icon="solar:round-transfer-horizontal-bold"
              action={
                <ActionBtn size="xs" onClick={handleOpenMultiStepFlow} variant="primary">
                  Sihirbazı Başlat
                </ActionBtn>
              }
            >
              Adım göstergeli, ileri/geri geçişli ve form durumunu saklayan gerçek 3 adımlı sihirbaz.
            </DemoCard>

            <DemoCard
              title="Arka Plan Görev Takibi"
              subtitle="useNavigationOperations()"
              badge="Operations"
              badgeVariant="info"
              icon="solar:play-circle-bold"
              action={
                <ActionBtn
                  size="xs"
                  onClick={handleStartOperation}
                  disabled={Boolean(activeOpId)}
                  variant="default"
                >
                  {activeOpId ? 'Yürütülüyor...' : 'Görevi Başlat'}
                </ActionBtn>
              }
            >
              İlerleme bildiren uzun süreli arka plan görevlerini başlatır ve tamamlandığında kapatır.
            </DemoCard>
          </div>
        </div>
      )}

      {/* SEKME 2: UÇ DURUMLAR & KORUMA */}
      {currentTab === 'edge_cases' && (
        <div className="space-y-4">
          <NoticeBanner
            title="Navigasyon Koruması (Nav Guard)"
            description="Kullanıcı sayfada kaydedilmemiş veri girmişse (kirli form durumu), sayfa geçişleri kilitlenir ve onay alınmadan yönlendirmeye izin verilmez."
            variant="warning"
            icon="solar:lock-bold"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DemoCard
              title="Gezinme Kilidi Anahtarı"
              subtitle={hasUnsavedChanges ? 'Koruma Devrede (Kilitli)' : 'Koruma Pasif'}
              badge={hasUnsavedChanges ? 'Kilitli' : 'Açık'}
              badgeVariant={hasUnsavedChanges ? 'error' : 'neutral'}
              icon="solar:shield-warning-bold"
              action={
                <ActionBtn
                  size="xs"
                  onClick={() => {
                    setHasUnsavedChanges((prev) => !prev);
                    addLog('koruma', `Gezinme koruması ${!hasUnsavedChanges ? 'AÇILDI' : 'KAPATILDI'}`);
                  }}
                  variant={hasUnsavedChanges ? 'danger' : 'primary'}
                >
                  {hasUnsavedChanges ? 'Korumayı Kaldır' : 'Korumayı Aktif Et'}
                </ActionBtn>
              }
            >
              Koruma açıkken aşağıdaki rotalara gitmeyi deneyin. Sistem geçişi bloke edecektir:
              <div className="mt-2 flex flex-wrap gap-2">
                <ActionBtn size="xs" onClick={() => handleAttemptNavigate('/')}>
                  Ana Sayfa (/)
                </ActionBtn>
                <ActionBtn size="xs" onClick={() => handleAttemptNavigate('/account')}>
                  Hesap (/account)
                </ActionBtn>
              </div>
            </DemoCard>

            <DemoCard
              title="Dinamik Breadcrumb Başlığı"
              subtitle="useRegisterBreadcrumbOverride()"
              badge="Breadcrumb"
              badgeVariant="info"
              icon="solar:pin-bold"
              action={
                <ActionBtn
                  size="xs"
                  onClick={() => {
                    setOverrideBreadcrumb((prev) => !prev);
                    addLog('breadcrumb', `Özel başlık ${!overrideBreadcrumb ? 'aktif edildi' : 'kaldırıldı'}`);
                  }}
                  variant={overrideBreadcrumb ? 'primary' : 'default'}
                >
                  {overrideBreadcrumb ? 'Özel Başlık Aktif' : 'Özel Başlık Uygula'}
                </ActionBtn>
              }
            >
              <TextInput
                label="Özel Segment Başlığı"
                value={breadcrumbCustomTitle}
                onChange={setBreadcrumbCustomTitle}
              />
            </DemoCard>
          </div>

          <Section title="Navigasyon Modülü Yetenek Matrisi">
            <FeatureChecklist
              features={[
                { name: 'Dock Surface Mounting', desc: 'Nav dock üzerine tam entegre yüzey render etme', tested: true },
                { name: 'Multi-Step Surface Flows', desc: 'createSurfaceFlowDefinition ile adımlı sihirbazlar', tested: true },
                { name: 'Selection HUD', desc: 'Çoklu öge seçimi ve toplu işlem tepsisi', tested: true },
                { name: 'Progress HUD', desc: 'Asenkron işler için dairesel ve çubuklu ilerleme gösterimi', tested: true },
                { name: 'Navigation Guard', desc: 'Kaydedilmemiş değişikliklerde rota değişimini yakalama', tested: true },
                { name: 'Breadcrumb Overrides', desc: 'Rota segment isimlerini dinamik olarak ezme', tested: true },
              ]}
            />
          </Section>
        </div>
      )}

      {/* SEKME 3: APİ & KOD ÖRNEKLERİ */}
      {currentTab === 'code' && (
        <div className="space-y-4">
          <CodeSnippet
            title="1. Seçim HUD'ı Kurulumu (Selection HUD)"
            code={`import { useSelectionHud } from '@/domains/shell/navigation/huds/selection-hud';

function MediaList({ selectedMovies, onClearSelection, onDeleteSelected }) {
  useSelectionHud({
    isActive: selectedMovies.length > 0,
    count: selectedMovies.length,
    title: \`\${selectedMovies.length} film seçildi\`,
    actions: [
      {
        key: 'delete-all',
        label: 'Seçilenleri Sil',
        isDestructive: true,
        onClick: onDeleteSelected,
      },
    ],
    onCancel: onClearSelection,
  });

  return <div>Film Listesi...</div>;
}`}
          />

          <CodeSnippet
            title="2. Gezinme Koruması (Nav Guard)"
            code={`import { useNavigationGuard } from '@/modules/nav';

function MovieEditorForm({ isDirty }) {
  useNavigationGuard({
    when: isDirty,
    message: 'Kaydedilmemiş değişiklikler kaybolacak. Çıkmak istediğinize emin misiniz?',
    onBlock: ({ to }) => console.warn('Gezinme engellendi:', to),
  });

  return <form>Form Alanları...</form>;
}`}
          />

          <CodeSnippet
            title="3. Çok Adımlı Yüzey Akışı Başlatma"
            code={`import { createSurfaceFlowDefinition, useNavigationActions } from '@/modules/nav';

const WIZARD_FLOW = createSurfaceFlowDefinition({
  id: 'setup-wizard',
  createSurface: ({ input }) => ({
    component: MyWizardComponent,
    props: { initialStep: 1 },
    title: 'Kurulum Sihirbazı',
  }),
});

function TriggerButton() {
  const { openSurfaceFlow } = useNavigationActions();
  return <Button onClick={() => openSurfaceFlow(WIZARD_FLOW)}>Sihirbazı Başlat</Button>;
}`}
          />
        </div>
      )}

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Navigasyon Yaşam Döngüsü & Olay Günlüğü" />
    </div>
  );
}
