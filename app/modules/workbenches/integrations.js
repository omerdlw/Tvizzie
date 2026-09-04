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
import { useBackgroundActions } from '@/modules/background';
import {
  NavSurfaceHeader,
  NavSurfaceShell,
  useNavigationActions,
  useNavigationOperations,
} from '@/modules/nav';
import { Button } from '@/ui/primitives';
import {
  ActionBtn,
  CodeSnippet,
  DemoCard,
  FeatureChecklist,
  LogConsole,
  MetricPill,
  NoticeBanner,
  Section,
  SegmentedTabs,
  StateBadge,
} from './shared';

// Integration Inspection Modal
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
          Bu modal doğrudan bir Sağ Tık Menüsü (Context Menu) eyleminden tetiklenerek açılmıştır.
        </p>
        <p className="text-white/50">
          &quot;Onayla ve Bildirim Fırlat&quot; butonuna bastığınızda, modal kendi sonucunu çağıran
          fonksiyona döner ve sistem anında Geri Almalı (Undo) bir bildirim fırlatır.
        </p>
      </div>
    </ModalContainer>
  );
}

// Integration Template Picker Surface inside Nav Dock
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
          Aşağıdaki butona basarak alt dock yüzeyinin üzerinden bir modal açabilirsiniz:
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
  const backgroundActions = useBackgroundActions();
  const navActions = useNavigationActions();
  const operations = useNavigationOperations();

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

  // Register integration modal into Registry
  useModalRegistration(
    {
      INTEGRATION_INSPECT_MODAL: InspectionModal,
    },
    { source: 'integrations-workbench' },
  );

  // ── Workflow 1: usePageRegistry Master Bundle ──
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

  // ── Workflow 2: Context Menu -> Modal -> Toast Flow ──
  useContextMenuRegistration(
    {
      target: '[data-integration-target="pipeline-item"]',
      priority: 150,
      header: {
        title: 'Boru Hattı Hedef Kartı',
        eyebrow: 'Entegrasyon Akışı',
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
              addLog('akıs:modalOnaylandi', 'Modal onaylandı! Geri almalı başarı bildirimi fırlatılıyor...', 'success');
              toast.success('Boru hattı ögesi onaylandı!', {
                description: 'Kayıt güncellendi. Bu işlemi geri alabilirsiniz.',
                duration: 5000,
                allowInProduction: true,
                action: {
                  label: 'İptal Et (Undo)',
                  onClick: () => addLog('akıs:geriAl', 'Onay geri alma butonuna tıklandı', 'warning'),
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

  // ── Workflow 3: Cinema Mode (Context Menu -> Dim Background -> Loading -> Video Modal) ──
  const handleLaunchCinemaMode = async () => {
    addLog('cinema:start', 'Sinema Modu başlatılıyor: Arka plan karartılıyor ve video yükleniyor...', 'info');
    backgroundActions.setBackground({
      image: 'https://image.tmdb.org/t/p/original/ilRyASD5H1d5cI0mF8y37x0g0F0.jpg',
      overlayOpacity: 0.85,
      overlayColor: 'rgba(0,0,0,0.9)',
      leftGradient: 8,
      rightGradient: 8,
    });

    loadingActions.startLoading({ minDuration: 1200, showOverlay: true });

    setTimeout(async () => {
      loadingActions.stopLoading();
      addLog('cinema:modal', 'Yükleme bitti, Sinematik Video Modal açılıyor...', 'success');
      await openModal('INTEGRATION_INSPECT_MODAL', 'center', {
        props: { title: 'Blade Runner 2049 - 4K Fragman Modu' },
      });
      addLog('cinema:ended', 'Sinema Modu tamamlandı', 'info');
    }, 1200);
  };

  // ── Workflow 4: Nav Task -> Loading Screen -> Completion Toast ──
  const [isOpRunning, setIsOpRunning] = useState(false);

  const handleRunOperationPipeline = () => {
    setIsOpRunning(true);
    addLog('akıs4:basladi', 'Nav Görevi + LoadingOverlay senkronizasyonu başlatılıyor...', 'info');

    loadingActions.startLoading({ minDuration: 1800, showOverlay: true });
    const op = operations.start({ label: 'Tam Sistem Tanılaması', progress: 0.1 });

    let progress = 0.1;
    const interval = setInterval(() => {
      progress += 0.3;
      if (progress >= 1.0) {
        clearInterval(interval);
        operations.complete(op.id, { success: true });
        loadingActions.stopLoading();
        setIsOpRunning(false);
        addLog('akıs4:bitti', 'Görev bitti, yükleme kapandı. Tamamlanma bildirimi fırlatılıyor.', 'success');

        toast.success('Sistem Tanılaması Tamamlandı!', {
          description: 'Tüm mimari modüller yeşil durumda doğrulandı.',
          allowInProduction: true,
        });
      } else {
        operations.update(op.id, { progress: Math.min(0.9, progress) });
      }
    }, 450);
  };

  // ── Workflow 5: Nav Dock Surface -> Modal ──
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
      {/* Top Metrics Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill
            label="usePageRegistry Paketi"
            value={scenario1Active ? 'Aktif (Interstellar)' : 'Pasif'}
            variant={scenario1Active ? 'emerald' : 'neutral'}
          />
          <MetricPill
            label="Nav Operasyon Süreci"
            value={isOpRunning ? 'Çalışıyor...' : 'Boşta'}
            variant={isOpRunning ? 'amber' : 'neutral'}
          />
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn
            size="xs"
            variant="neutral"
            icon="solar:refresh-bold"
            onClick={() => {
              setScenario1Active(false);
              setIsOpRunning(false);
              backgroundActions.resetBackground();
              addLog('reset', 'Tüm entegrasyon durumları varsayılana döndürüldü');
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
          { id: 'demos', label: '1. Çapraz Modül Senaryoları', icon: 'solar:tuning-square-bold' },
          { id: 'edge_cases', label: '2. Kural Doğrulama & Matris', icon: 'solar:shield-check-bold' },
          { id: 'code', label: '3. API & Kod Sözleşmesi', icon: 'solar:code-bold' },
        ]}
      />

      {/* TAB 1: DEMOS */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="info"
            title="Çoklu Modül Orkestrasyonu"
            description="Aşağıdaki senaryolar bağımsız modüllerin (Nav, Background, Loading, ContextMenu, Modal, Notification) tek bir kullanıcı etkileşiminde nasıl senkronize ve kusursuz çalıştığını modeller."
          />

          <Section title="Entegre İş Akışları">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Pipeline 1: usePageRegistry */}
              <DemoCard
                title="1. usePageRegistry Koordinasyon Paketi"
                badge="Tek Hook Koordinasyonu"
                description="Nav başlığı, sinematik uzay arka planı ve sayfa yükleme parametrelerini tek bir bildirimle atomik olarak senkronize eder."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Paket Durumu:</span>
                    <StateBadge
                      label="Durum"
                      value={scenario1Active ? 'Aktif' : 'Pasif'}
                      variant={scenario1Active ? 'success' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={scenario1Active ? 'danger' : 'primary'}
                    icon={scenario1Active ? 'solar:close-circle-bold' : 'solar:play-bold'}
                    onClick={() => {
                      setScenario1Active((prev) => !prev);
                      addLog('senaryo1', `Sayfa paketi ${!scenario1Active ? 'aktif edildi' : 'kapatıldı'}`);
                    }}
                  >
                    {scenario1Active ? 'Paketi Kapat' : 'Paketi Aç'}
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Pipeline 2: Cinema Mode */}
              <DemoCard
                title="2. Sinema Modu Başlatma (Cinema Mode)"
                badge="Background + Loading + Modal"
                description="Karanlık arka plan ışığı açılır, loading katmanı devreye girer ve ardından video modalı kullanıcıya sunulur."
              >
                <div className="space-y-3">
                  <div className="text-xs text-white/60">
                    Akış: Arka Plan Karart ➔ 1200ms Yükleme ➔ Video Modal Aç
                  </div>
                  <ActionBtn
                    fullWidth
                    variant="primary"
                    icon="solar:clapperboard-play-bold"
                    onClick={handleLaunchCinemaMode}
                  >
                    Sinema Modunu Başlat
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Pipeline 3: Context Menu -> Modal -> Toast */}
              <DemoCard
                title="3. Sağ Tık ➔ Modal ➔ Geri Almalı Toast"
                badge="Sağ Tık Deneyimi"
                description="Aşağıdaki karta sağ tıklayın; açılan menüden modalı açın, modal onaylandığında geri almalı (undo) toast fırlatılır."
              >
                <div
                  data-integration-target="pipeline-item"
                  className="cursor-context-menu space-y-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 transition-colors select-none hover:bg-cyan-500/15"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">🎯 Buraya Sağ Tıklayın</span>
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                      Context Target
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60">
                    Sağ tık ➔ İncele ve Onayla ➔ Modal Onayı ➔ Geri Al Toast
                  </p>
                </div>
              </DemoCard>

              {/* Pipeline 4: Operation -> Loading -> Toast */}
              <DemoCard
                title="4. Arka Plan Görevi ➔ Yükleme ➔ Bildirim"
                badge="Operasyon Süreci"
                description="Nav dock üzerinde canlı yüzde takipli operasyon başlatır, tam ekran loading gösterir ve bittiğinde bildirim fırlatır."
              >
                <div className="space-y-3">
                  <div className="text-xs text-white/60">
                    Akış: operations.start() ➔ Yükleme Ekranı ➔ %100 Toast
                  </div>
                  <ActionBtn
                    fullWidth
                    disabled={isOpRunning}
                    variant={isOpRunning ? 'neutral' : 'primary'}
                    icon="solar:play-circle-bold"
                    onClick={handleRunOperationPipeline}
                  >
                    {isOpRunning ? 'Görev Yürütülüyor...' : 'Tanılama Görevini Başlat'}
                  </ActionBtn>
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* Pipeline 5: Surface Bridge */}
          <Section title="5. Nav Dock Yüzeyinden Modal Köprüsü">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="space-y-1">
                <div className="font-semibold text-white">Yüzeyden Modala Geçiş (Surface Bridge)</div>
                <div className="text-xs text-white/50">
                  Nav dock içindeki yüzey (surface) açıkken onun üzerinden bağımsız bir Modal açar ve seçim sonucunu yüzeye döndürür.
                </div>
              </div>
              <ActionBtn
                variant="primary"
                icon="solar:panel-bottom-bold"
                onClick={handleLaunchSurfaceBridge}
              >
                Dock Yüzeyini Aç
              </ActionBtn>
            </div>
          </Section>
        </div>
      )}

      {/* TAB 2: EDGE CASES & MATRIX */}
      {activeTab === 'edge_cases' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="warning"
            title="Modüller Arası Bağımsızlık ve Hata Yalıtımı"
            description="Her modül diğerlerinden bağımsız olarak unmount edilebilir veya çökebilir. ErrorBoundary ve Registry sistemi sayesinde bir modülün çökmesi diğer modülleri etkilemez."
          />

          <Section title="Entegrasyon Doğrulama Matrisi">
            <FeatureChecklist
              items={[
                { label: 'usePageRegistry ile atomik Nav + Background + Loading senkronizasyonu', checked: true },
                { label: 'Context Menu tetikleyicisinden Modal açma ve sonucunu Promise ile alma', checked: true },
                { label: 'Modal onayı sonrası geri almalı (Undo Action) Toast bildirimi fırlatma', checked: true },
                { label: 'Nav Surface içinden Modal açılıp kapandığında yüzey durumunun korunması', checked: true },
                { label: 'Nav Görevi (operations) ile LoadingOverlay eşzamanlı takibi', checked: true },
                { label: 'Sayfa rotası değiştiğinde tüm entegre kayıtların temizlenmesi', checked: true },
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
            description="Sayfa düzeyinde çoklu modül gereksinimlerini tek bir nesne olarak usePageRegistry ile tanımlayın."
          />

          <CodeSnippet
            title="1. usePageRegistry ile Sayfa Orkestrasyonu"
            code={`import { usePageRegistry } from '@/modules/registry';
import { usePathname } from 'next/navigation';

export default function MovieCatalogPage() {
  const pathname = usePathname();

  // Tek seferde Nav, Background ve Loading durumunu declare eder:
  usePageRegistry({
    registry: { source: 'catalog-page', priority: 100 },
    nav: {
      path: pathname,
      title: 'Film Kataloğu',
      icon: 'solar:clapperboard-bold',
    },
    background: {
      image: '/wallpapers/cinema.jpg',
      overlay: true,
      overlayOpacity: 0.4,
      leftGradient: 5,
      rightGradient: 5,
    },
  });

  return <main>Katalog İçeriği...</main>;
}`}
          />

          <CodeSnippet
            title="2. Context Menu ➔ Modal ➔ Toast Geri Alma Deseni"
            code={`import { useModalActions } from '@/modules/modal';
import { useToast } from '@/modules/notification';

function useApprovePipeline() {
  const { openModal } = useModalActions();
  const toast = useToast();

  const handleApprove = async (item) => {
    // 1. Modalı aç ve kullanıcı yanıtını bekle
    const res = await openModal('CONFIRM_MODAL', 'center', { props: { item } });

    // 2. Kullanıcı onayladıysa geri almalı Toast fırlat
    if (res?.approved) {
      toast.success('Öğe onaylandı!', {
        action: {
          label: 'Geri Al',
          onClick: () => rollbackApproval(item.id),
        },
      });
    }
  };

  return { handleApprove };
}`}
          />
        </div>
      )}

      {/* Log Console */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Entegrasyon Olay Günlüğü" />
    </div>
  );
}

