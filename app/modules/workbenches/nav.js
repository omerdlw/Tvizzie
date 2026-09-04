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
import { ActionBtn, JsonViewer, LogConsole, Section, StateBadge, TextInput } from './shared';

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
            Canlı Telemetri ve Teşhis Kayıtlarını Aç
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-white/70">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="cursor-pointer rounded border-white/10"
            />
            Değişiklikleri Otomatik Kaydet (Auto-Save)
          </label>
        </div>
      )}

      {/* Adım 3: Özet ve Tamamlama */}
      {currentStep === 3 && (
        <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="font-semibold text-emerald-400">3. Adım: Yapılandırma Özeti ve Onay</div>
          <div className="space-y-1 text-white/70">
            <div>
              Seçilen Tema: <strong className="text-white">{selectedTheme}</strong>
            </div>
            <div>
              Telemetri:{' '}
              <strong className="text-white">{enableTelemetry ? 'Açık' : 'Kapalı'}</strong>
            </div>
            <div>
              Otomatik Kaydet:{' '}
              <strong className="text-white">{autoSave ? 'Açık' : 'Kapalı'}</strong>
            </div>
            <div>
              Başlangıç Parametresi:{' '}
              <strong className="text-white">{input?.message || 'Yok'}</strong>
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

  // 1. Seçim HUD'ı
  const selectionActions = useMemo(
    () => [
      {
        key: 'select-all',
        label: 'Tümünü Seç',
        icon: 'solar:check-read-linear',
        onClick: () => addLog('selectionHud:tumunuSec', 'Tümünü seç tıklandı', 'info'),
      },
      {
        key: 'bulk-delete',
        label: 'Seçilenleri Sil',
        icon: 'solar:trash-bin-trash-bold',
        isDestructive: true,
        onClick: () => {
          addLog('selectionHud:topluSil', 'Seçilenler silindi', 'error');
          setActiveHudMode(null);
        },
      },
    ],
    [],
  );

  useSelectionHud({
    isActive: activeHudMode === 'selection',
    count: 5,
    title: '5 öge seçildi',
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
    description: '14 film senkronize ediliyor',
    progress: 65,
    icon: 'solar:refresh-circle-bold',
    onCancel: useCallback(() => {
      addLog('progressHud:iptal', 'İlerleme HUD kapatıldı', 'warning');
      setActiveHudMode(null);
    }, []),
  });

  // 3. Hızlı Bağlam Eylem Tepsisi
  const contextHudActions = useMemo(
    () => [
      {
        key: 'filter-movies',
        label: 'Filmler',
        onClick: () => {
          addLog('contextHud:filmler', 'Filmler filtrelendi', 'success');
          setActiveHudMode(null);
        },
      },
      {
        key: 'filter-series',
        label: 'Diziler',
        onClick: () => {
          addLog('contextHud:diziler', 'Diziler filtrelendi', 'success');
          setActiveHudMode(null);
        },
      },
    ],
    [],
  );

  useContextActionHud({
    isActive: activeHudMode === 'actions',
    title: 'Hızlı Filtre Eylemleri',
    description: 'Nav dock üzerinden filtreleme yapın',
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
      `Sayfadan ayrılma engellendi! Hedef: ${to} (Nav status devreye girdi)`,
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
        `Geçiş engellendi, Nav status aksiyon butonları gösteriliyor`,
        'warning',
      );
    } else {
      addLog('gezinme:izin', `Geçişe izin verildi`, 'success');
    }
  };

  // 5. Breadcrumb Override
  const [overrideBreadcrumb, setOverrideBreadcrumb] = useState(false);
  useRegisterBreadcrumbOverride(
    overrideBreadcrumb
      ? {
          path: pathname,
          title: 'Özel Sayfa Yolu Başlığı',
          icon: 'solar:pin-bold',
        }
      : undefined,
  );

  // 6. Görev Merkezi
  const [activeOpId, setActiveOpId] = useState(null);

  const handleStartOperation = () => {
    const op = operations.start({ label: 'Veritabanı Yedeklemesi', progress: 0.1 });
    setActiveOpId(op.id);
    addLog('operations.start', `Görev ID: ${op.id} başlatıldı`, 'info');

    let current = 0.1;
    const interval = setInterval(() => {
      current += 0.3;
      if (current >= 1.0) {
        clearInterval(interval);
        operations.complete(op.id, { success: true });
        setActiveOpId(null);
        addLog('operations.complete', `Görev ${op.id} başarıyla sonuçlandı`, 'success');
      } else {
        operations.update(op.id, { progress: Math.min(0.9, current) });
        addLog('operations.update', `İlerleme: %${Math.round(current * 100)}`);
      }
    }, 500);
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
      {/* Navigasyon Durumu */}
      <Section
        title="Navigasyon Durumu"
        badge={activeHudMode ? `HUD: ${activeHudMode}` : 'Dock Aktif'}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="HUD"
            value={activeHudMode || 'Yok'}
            variant={activeHudMode ? 'info' : 'neutral'}
          />
          <StateBadge
            label="Yüzey"
            value={navState.activeSurface ? 'Açık' : 'Kapalı'}
            variant={navState.activeSurface ? 'success' : 'neutral'}
          />
          <StateBadge
            label="Koruma"
            value={hasUnsavedChanges ? 'Devrede' : 'Pasif'}
            variant={hasUnsavedChanges ? 'warning' : 'neutral'}
          />
          <StateBadge
            label="Görev"
            value={activeOpId || 'Yok'}
            variant={activeOpId ? 'warning' : 'neutral'}
          />
        </div>

        <JsonViewer
          data={{
            aktifYuzey: navState.activeSurface,
            aktifHudModu: activeHudMode,
            kaydedilmemisDegisiklikler: hasUnsavedChanges,
            breadcrumbDegisimi: overrideBreadcrumb,
            kayitliKart: { baslik: navTitle, aciklama: navDesc, ikon: navIcon },
          }}
          title="Durum Verisi"
        />
      </Section>

      {/* Nav Kartı */}
      <Section title="Nav Kartı">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TextInput label="Başlık" value={navTitle} onChange={setNavTitle} />
          <TextInput label="Açıklama" value={navDesc} onChange={setNavDesc} />
          <TextInput label="İkon" value={navIcon} onChange={setNavIcon} />
        </div>
      </Section>

      {/* HUD Modları */}
      <Section title="HUD Modları">
        <div className="flex flex-wrap gap-2">
          <ActionBtn
            onClick={() => {
              setActiveHudMode((prev) => (prev === 'selection' ? null : 'selection'));
              addLog('hud', 'Seçim HUD değiştirildi');
            }}
            variant={activeHudMode === 'selection' ? 'primary' : 'default'}
            icon="solar:checklist-minimalistic-bold"
          >
            Seçim HUD (5 Öğe)
          </ActionBtn>
          <ActionBtn
            onClick={() => {
              setActiveHudMode((prev) => (prev === 'progress' ? null : 'progress'));
              addLog('hud', 'İlerleme HUD değiştirildi');
            }}
            variant={activeHudMode === 'progress' ? 'primary' : 'default'}
            icon="solar:upload-track-bold"
          >
            İlerleme HUD (%65)
          </ActionBtn>
          <ActionBtn
            onClick={() => {
              setActiveHudMode((prev) => (prev === 'actions' ? null : 'actions'));
              addLog('hud', 'Hızlı Eylem HUD değiştirildi');
            }}
            variant={activeHudMode === 'actions' ? 'primary' : 'default'}
            icon="solar:tuning-2-bold"
          >
            Eylem HUD
          </ActionBtn>
          {activeHudMode && (
            <ActionBtn onClick={() => setActiveHudMode(null)} variant="danger">
              Kapat
            </ActionBtn>
          )}
        </div>
      </Section>

      {/* Yüzeyler */}
      <Section title="Yüzeyler (Surfaces)">
        <div className="flex flex-wrap gap-2">
          <ActionBtn onClick={handleOpenSurface} variant="default" icon="solar:panel-bottom-bold">
            Tekil Yüzey Aç
          </ActionBtn>
          <ActionBtn
            onClick={handleOpenMultiStepFlow}
            variant="primary"
            icon="solar:round-transfer-horizontal-bold"
          >
            Çok Adımlı Akış Aç (3 Adım)
          </ActionBtn>
          <ActionBtn
            onClick={() => navActions.closeSurface()}
            variant="danger"
            icon="solar:close-square-bold"
          >
            Kapat
          </ActionBtn>
        </div>
      </Section>

      {/* Gezinme Koruması */}
      <Section title="Gezinme Koruması (Nav Guard)">
        <div className="space-y-3">
          <div
            className={`rounded-xl border p-4 transition-all ${
              hasUnsavedChanges
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                : 'border-white/10 bg-white/5 text-white/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon
                  icon={hasUnsavedChanges ? 'solar:lock-bold' : 'solar:lock-unlocked-bold'}
                  size={18}
                  className={hasUnsavedChanges ? 'text-rose-400' : 'text-white/50'}
                />
                <span className="text-xs font-medium">
                  {hasUnsavedChanges
                    ? 'Koruma devrede (kaydedilmemiş değişiklik var)'
                    : 'Koruma pasif'}
                </span>
              </div>
              <ActionBtn
                onClick={() => {
                  setHasUnsavedChanges((prev) => !prev);
                  addLog(
                    'koruma',
                    `Navigasyon koruması ${!hasUnsavedChanges ? 'AÇILDI' : 'KAPATILDI'}`,
                  );
                }}
                variant={hasUnsavedChanges ? 'danger' : 'primary'}
                size="xs"
              >
                {hasUnsavedChanges ? 'Korumayı Kapat' : 'Korumayı Aç'}
              </ActionBtn>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/50">Gezinmeyi dene:</span>
            <ActionBtn
              size="xs"
              onClick={() => handleAttemptNavigate('/')}
              icon="solar:home-2-bold"
            >
              Ana Sayfa (/)
            </ActionBtn>
            <ActionBtn
              size="xs"
              onClick={() => handleAttemptNavigate('/account')}
              icon="solar:user-bold"
            >
              Hesap (/account)
            </ActionBtn>
          </div>
        </div>
      </Section>

      {/* Operasyonlar & Breadcrumb */}
      <Section title="Operasyonlar & Breadcrumb">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="text-xs font-medium text-white/70">Görev Takibi (Operations)</div>
            <ActionBtn
              onClick={handleStartOperation}
              disabled={Boolean(activeOpId)}
              className="w-full"
              icon="solar:play-circle-bold"
            >
              {activeOpId ? 'Yürütülüyor' : 'Görevi Başlat'}
            </ActionBtn>
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div className="text-xs font-medium text-white/70">Breadcrumb Başlığı</div>
            <ActionBtn
              onClick={() => {
                setOverrideBreadcrumb((prev) => !prev);
                addLog(
                  'breadcrumb',
                  `Breadcrumb ${!overrideBreadcrumb ? 'uygulandı' : 'kaldırıldı'}`,
                );
              }}
              variant={overrideBreadcrumb ? 'primary' : 'default'}
              className="w-full"
            >
              {overrideBreadcrumb ? 'Özel Başlık Aktif' : 'Özel Başlık Uygula'}
            </ActionBtn>
          </div>
        </div>
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Logs" />
    </div>
  );
}
