'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  useContextMenuRegistration,
  useModalRegistration,
  usePageRegistry,
} from '@/modules/registry';
import { useModalActions, ModalContainer } from '@/modules/modal';
import { useToast } from '@/modules/notification';
import { useLoadingActions } from '@/modules/loading';
import {
  NavSurfaceHeader,
  NavSurfaceShell,
  useNavigationActions,
  useNavigationOperations,
} from '@/modules/nav';
import { Button } from '@/ui/primitives';
import { ActionBtn, LogConsole, Section, StateBadge } from './shared';

// ── Entegrasyon Test Modalı ──────────────────────────────────────────────────
function InspectionModal({ close, data }) {
  return (
    <ModalContainer
      header={{
        title: data?.title || 'İnceleme ve Onay Modalı',
        showClose: true,
      }}
      footer={{
        left: (
          <Button
            type="button"
            onClick={() => close(null)}
            className="cursor-pointer px-3 py-1.5 font-mono text-xs text-white/70 hover:text-white"
          >
            Vazgeç
          </Button>
        ),
        right: (
          <Button
            type="button"
            onClick={() => close({ approved: true, timestamp: Date.now() })}
            className="cursor-pointer rounded-lg bg-emerald-500 px-3 py-1.5 font-mono text-xs font-semibold text-black"
          >
            Onayla ve Bildirim Fırlat
          </Button>
        ),
      }}
      close={close}
    >
      <div className="space-y-3 p-4 font-mono text-xs text-white/70">
        <p>
          Bu modal doğrudan bir Sağ Tık Menüsü (Context Menu) eyleminden tetiklenerek açılmıştır
        </p>
        <p className="text-white/50">
          &quot;Onayla ve Bildirim Fırlat&quot; butonuna bastığınızda, modal kendi sonucunu çağıran
          fonksiyona döner ve sistem anında Geri Almalı (Undo) bir bildirim fırlatır
        </p>
      </div>
    </ModalContainer>
  );
}

// ── Entegrasyon Test Yüzeyi ──────────────────────────────────────────────────
function TemplatePickerSurface({ close }) {
  const { openModal } = useModalActions();
  const [selectedTemplate, setSelectedTemplate] = useState('Varsayılan Tema Şablonu');

  const handlePick = async () => {
    const result = await openModal('INTEGRATION_INSPECT_MODAL', 'center', {
      props: { title: 'Tema Şablonu Seçimi' },
    });

    if (result?.approved) {
      setSelectedTemplate('Yüksek Performanslı Ultra Şablon');
    }
  };

  return (
    <NavSurfaceShell className="space-y-3 p-4 font-mono text-xs text-white">
      <NavSurfaceHeader
        title="Nav Dock Yüzeyinden Modal Açma"
        description="Alttaki dock yüzeyi içinden açılan modal köprüsü"
        onClose={close}
      />
      <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
        <div>
          Şu an Seçili Olan: <strong className="text-emerald-400">{selectedTemplate}</strong>
        </div>
        <p className="text-xs text-white/50">
          Aşağıdaki butona basarak alt dock yüzeyinin üzerinden bir modal açabilirsiniz
        </p>
        <Button
          type="button"
          onClick={handlePick}
          className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black"
        >
          Yüzey İçinden Modal Başlat
        </Button>
      </div>
    </NavSurfaceShell>
  );
}

export default function WorkbenchIntegrations() {
  const pathname = usePathname();
  const toast = useToast();
  const { openModal } = useModalActions();
  const loadingActions = useLoadingActions();
  const navActions = useNavigationActions();
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

  // Entegrasyon modalını kaydet
  useModalRegistration(
    {
      INTEGRATION_INSPECT_MODAL: InspectionModal,
    },
    { source: 'integrations-workbench' },
  );

  // ── Senaryo 1: usePageRegistry Koordinasyon Paketi ─────────────────────────
  const [scenario1Active, setScenario1Active] = useState(false);

  usePageRegistry(
    scenario1Active
      ? {
          registry: { source: 'scenario-1-bundle', priority: 250 },
          nav: {
            path: pathname,
            title: 'Interstellar Sayfa Paketi',
            description: 'Koordineli sayfa paketi aktif',
            icon: 'solar:clapperboard-play-bold',
          },
          background: {
            image: 'https://image.tmdb.org/t/p/original/rAiYTnrLEhvF7zIjIzoHaDuSIu.jpg',
            overlay: true,
            overlayOpacity: 0.35,
            fadeEdges: 30,
            leftGradient: 6,
            rightGradient: 6,
          },
          loading: {
            isLoading: false,
            minDuration: 500,
          },
        }
      : null,
  );

  // ── Senaryo 2: Context Menu -> Modal -> Toast Akışı ─────────────────────────
  useContextMenuRegistration(
    {
      target: '[data-integration-target="pipeline-item"]',
      priority: 150,
      header: {
        title: 'Boru Hattı Hedef Kartı',
        eyebrow: 'Entegrasyon 2',
        icon: 'solar:layers-bold',
      },
      items: [
        {
          key: 'inspect-modal',
          label: 'Modalda İncele ve Onayla...',
          icon: 'solar:maximize-square-bold',
          onSelect: async () => {
            addLog('akıs:baslangic', 'Sağ tık menüsünden InspectionModal açılıyor...');
            const res = await openModal('INTEGRATION_INSPECT_MODAL', 'center', {
              props: { title: 'Boru Hattı İnceleme Onayı' },
            });

            if (res?.approved) {
              addLog(
                'akıs:modalOnaylandi',
                'Modal onaylandı! Geri almalı başarı bildirimi fırlatılıyor...',
                'success',
              );
              toast.success('Boru hattı ögesi onaylandı!', {
                description: 'Kayıt güncellendi. Bu işlemi geri alabilirsiniz.',
                duration: 5000,
                allowInProduction: true,
                action: {
                  label: 'İptal Et (Undo)',
                  onClick: () =>
                    addLog('akıs:geriAl', 'Onay geri alma butonuna tıklandı', 'warning'),
                },
              });
            } else {
              addLog('akıs:vazgecildi', 'Modal onaylanmadan kapatıldı', 'info');
            }
          },
        },
      ],
    },
    { source: 'integrations-workbench' },
  );

  // ── Senaryo 4: Nav Görevi -> Yükleme Ekranı -> Toast ─────────────────────────
  const [isOpRunning, setIsOpRunning] = useState(false);

  const handleRunOperationPipeline = () => {
    setIsOpRunning(true);
    addLog('akıs4:basladi', 'Nav Görevi + LoadingOverlay senkronizasyonu başlatılıyor...', 'info');

    // 1. Minimum süreli yükleme ekranını başlat
    loadingActions.startLoading({ minDuration: 1800, showOverlay: true });

    // 2. Nav Görevini başlat
    const op = operations.start({ label: 'Tam Sistem Tanılaması', progress: 0.1 });

    let progress = 0.1;
    const interval = setInterval(() => {
      progress += 0.3;
      if (progress >= 1.0) {
        clearInterval(interval);
        operations.complete(op.id, { success: true });
        loadingActions.stopLoading();
        setIsOpRunning(false);
        addLog(
          'akıs4:bitti',
          'Görev bitti, yükleme kapandı. Tamamlanma bildirimi fırlatılıyor.',
          'success',
        );

        toast.success('Sistem Tanılaması Tamamlandı!', {
          description: 'Tüm 11 mimari modül yeşil durumda doğrulandı.',
          allowInProduction: true,
        });
      } else {
        operations.update(op.id, { progress: Math.min(0.9, progress) });
      }
    }, 450);
  };

  // ── Senaryo 3: Nav Dock Yüzeyi -> Modal ──────────────────────────────────────
  const handleLaunchSurfaceBridge = () => {
    addLog('akıs3:basladi', 'TemplatePickerSurface alt dock içine açılıyor...', 'info');
    navActions.openSurface({
      component: TemplatePickerSurface,
      props: {},
      title: 'Yüzey Köprüsü',
    });
  };

  return (
    <div className="space-y-6">
      {/* Senaryo 1: usePageRegistry Koordinasyon Paketi */}
      <Section
        title="1. Koordinasyon Paketi (usePageRegistry)"
        badge={scenario1Active ? 'Aktif' : 'Pasif'}
      >
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
          <div>
            <div className="text-xs font-medium text-white">Nav + Arka Plan + Yükleme</div>
            <p className="text-xs text-white/50">
              Tek bir hook ile tüm katmanları senkronize eder
            </p>
          </div>
          <ActionBtn
            onClick={() => {
              setScenario1Active((prev) => !prev);
              addLog('senaryo1', `Sayfa paketi ${!scenario1Active ? 'aktif edildi' : 'kapatıldı'}`);
            }}
            variant={scenario1Active ? 'danger' : 'primary'}
            size="xs"
          >
            {scenario1Active ? 'Paketi Kapat' : 'Paketi Aç'}
          </ActionBtn>
        </div>
      </Section>

      {/* Senaryo 2: Context Menu -> Modal -> Toast Akışı */}
      <Section title="2. Sağ Tık ➔ Modal ➔ Toast">
        <div
          data-integration-target="pipeline-item"
          className="cursor-context-menu space-y-1 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 transition-colors select-none hover:bg-sky-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-sky-300">Bu Karta Sağ Tıklayın</span>
            <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-xs text-sky-300">
              Menü ➔ Modal ➔ Toast
            </span>
          </div>
          <p className="text-xs text-white/50">
            Menüden &apos;İncele&apos; seçilince modal açılır, onaylanınca Toast fırlatılır
          </p>
        </div>
      </Section>

      {/* Senaryo 3: Nav Dock Yüzeyi -> Modal Akışı */}
      <Section title="3. Nav Dock Yüzeyi ➔ Modal">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
          <div>
            <div className="text-xs font-medium text-white">Yüzeyden Modala Geçiş</div>
            <p className="text-xs text-white/50">Dock yüzeyi açar ve içinden modal tetikler</p>
          </div>
          <ActionBtn
            onClick={handleLaunchSurfaceBridge}
            variant="primary"
            icon="solar:panel-bottom-bold"
            size="xs"
          >
            Yüzeyi Başlat
          </ActionBtn>
        </div>
      </Section>

      {/* Senaryo 4: Nav Görevi -> Yükleme Ekranı -> Toast */}
      <Section title="4. Görev ➔ Yükleme ➔ Toast">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
          <div>
            <div className="text-xs font-medium text-white">Görev Yaşam Döngüsü</div>
            <p className="text-xs text-white/50">İlerleme takibi bittiğinde bildirim verir</p>
          </div>
          <ActionBtn
            onClick={handleRunOperationPipeline}
            disabled={isOpRunning}
            variant="primary"
            icon="solar:play-circle-bold"
            size="xs"
          >
            {isOpRunning ? 'Yürütülüyor' : 'Görevi Başlat'}
          </ActionBtn>
        </div>
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Logs" />
    </div>
  );
}
