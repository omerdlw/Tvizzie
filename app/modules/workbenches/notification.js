'use client';

import { useEffect, useState } from 'react';
import {
  CRITICAL_TYPES,
  getStorageItem,
  removeStorageItem,
  useNotificationActions,
  useNotificationState,
  useToast,
} from '@/modules/notification';
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

export default function WorkbenchNotification() {
  const [currentTab, setCurrentTab] = useState('demos');
  const toast = useToast();
  const { notifications } = useNotificationState();
  const { showNotification, dismissNotification } = useNotificationActions();

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

  // Toast form girdileri
  const [toastMessage, setToastMessage] = useState('İşlem başarıyla tamamlandı');
  const [toastDescription, setToastDescription] = useState(
    'Tüm değişiklikler veritabanı ile eşitlendi.',
  );
  const [toastDuration, setToastDuration] = useState(4000);
  const [useDedupeKey, setUseDedupeKey] = useState(false);

  // Depolama izleme durumu
  const [storedCritical, setStoredCritical] = useState({});

  const refreshStorage = () => {
    const data = getStorageItem('critical_notifications', {});
    setStoredCritical(data || {});
  };

  useEffect(() => {
    refreshStorage();
  }, [notifications]);

  // Toast tetikleyicileri
  const handleSuccessToast = () => {
    addLog('toast.success', toastMessage);
    toast.success(toastMessage, {
      description: toastDescription,
      duration: Number(toastDuration),
      dedupeKey: useDedupeKey ? 'ozel-dedupe-anahtari' : undefined,
      allowInProduction: true,
    });
  };

  const handleWarningToast = () => {
    addLog('toast.warning', toastMessage, 'warning');
    toast.warning(toastMessage, {
      description: toastDescription,
      duration: Number(toastDuration),
      dedupeKey: useDedupeKey ? 'ozel-dedupe-anahtari' : undefined,
    });
  };

  const handleErrorToast = () => {
    addLog('toast.error', toastMessage, 'error');
    toast.error(toastMessage, {
      description: toastDescription,
      duration: Number(toastDuration),
      dedupeKey: useDedupeKey ? 'ozel-dedupe-anahtari' : undefined,
    });
  };

  const handleInfoToast = () => {
    addLog('toast.info', toastMessage);
    toast.info(toastMessage, {
      description: toastDescription,
      duration: Number(toastDuration),
      dedupeKey: useDedupeKey ? 'ozel-dedupe-anahtari' : undefined,
      allowInProduction: true,
    });
  };

  // Geri Alınabilir Silme (Undo Flow)
  const handleUndoFlow = () => {
    addLog('toast:eylemli', '"Interstellar" silindi bildirimi (6 saniye Geri Al süresi)...');
    toast.success('Film kütüphaneden silindi', {
      description: 'Bu işlemi 6 saniye içerisinde geri alabilirsiniz.',
      duration: 6000,
      allowInProduction: true,
      action: {
        label: 'Geri Al (Undo)',
        onClick: () => {
          addLog('toast:geriAl', 'Film kütüphaneye geri yüklendi!', 'success');
          toast.info('İşlem geri alındı', {
            description: '"Interstellar" yeniden listenize eklendi.',
            duration: 3000,
            allowInProduction: true,
          });
        },
      },
    });
  };

  // Kritik bildirim tetikleyicileri
  const handleTriggerCritical = (type) => {
    addLog('showNotification(kritik)', `Kritik bildirim fırlatıldı: ${type}`, 'warning');
    showNotification(type, {
      id: `critical-${type.toLowerCase()}`,
      message: `Sistem Uyarısı: ${type.replace(/_/g, ' ')}`,
      description: 'Bu bildirim sayfayı yenileseniz bile localStorage üzerinde saklanır.',
      actions: [
        {
          label: 'Anladım',
          dismiss: true,
          onClick: () => addLog('kritik:aksiyon', `${type} bildirimi onaylandı`, 'info'),
        },
      ],
    });
  };

  // Ağ Durumu Simülasyonu
  const handleSimulateOffline = () => {
    addLog('ag:offline', 'İnternet bağlantısı kesildi simülasyonu başlatıldı', 'error');
    showNotification(CRITICAL_TYPES.OFFLINE, {
      id: 'network-offline-banner',
      message: 'İnternet Bağlantısı Kesildi',
      description: 'İçerikler önbellekten gösteriliyor. Bağlantı gelince eşitlenecek.',
      actions: [
        {
          label: 'Tekrar Dene',
          dismiss: false,
          onClick: () => addLog('ag:dene', 'Bağlantı tekrar deneniyor...', 'info'),
        },
      ],
    });
  };

  const handleSimulateOnline = () => {
    dismissNotification('network-offline-banner');
    addLog('ag:online', 'Bağlantı tekrar kuruldu! Kritik uyarı kaldırıldı.', 'success');
    toast.success('Yeniden Çevrimiçisiniz', {
      description: 'Tüm kuyruktaki işlemler başarıyla sunucuya aktarıldı.',
      duration: 4000,
      allowInProduction: true,
    });
  };

  // Dedupe Spam Testi
  const handleSpamWithoutDedupe = () => {
    for (let i = 1; i <= 3; i++) {
      toast.warning(`Spam Bildirimi #${i}`, { duration: 4000 });
    }
    addLog('spam:filtresiz', '3 adet ayrı bildirim kuyruğa eklendi (dedupeKey YOK)', 'warning');
  };

  const handleSpamWithDedupe = () => {
    for (let i = 1; i <= 3; i++) {
      toast.warning('Bu bildirim tekilleştirildi', {
        description: 'dedupeKey sayesinde 3 kez tetiklense bile tek bir kart olarak kalır.',
        dedupeKey: 'stabil-tekil-anahtar',
        duration: 4000,
      });
    }
    addLog('spam:tekilli', '3 çağrı yapıldı ancak dedupeKey sayesinde tek kart güncellendi', 'success');
  };

  const handleClearCriticalStorage = () => {
    removeStorageItem('critical_notifications');
    refreshStorage();
    addLog('depolama', 'localStorage üzerindeki critical_notifications temizlendi', 'info');
  };

  const handleDismissAll = () => {
    Object.keys(notifications).forEach((id) => dismissNotification(id));
    addLog('dismissAll', 'Aktif tüm bildirimler kapatıldı', 'info');
  };

  const activeCount = Object.keys(notifications).length;

  return (
    <div className="space-y-6">
      {/* Üst Sekmeler */}
      <SegmentedTabs
        tabs={[
          { id: 'demos', label: 'Toast Bildirimleri', icon: 'solar:bell-bold', badge: '5' },
          { id: 'edge_cases', label: 'Kalıcı & Kritik Uyarılar', icon: 'solar:shield-warning-bold', badge: '4' },
          { id: 'code', label: 'API & Kod Örnekleri', icon: 'solar:code-bold' },
        ]}
        activeTab={currentTab}
        onChange={setCurrentTab}
      />

      {/* Durum & Kuyruk */}
      <Section
        title="Bildirim Durumu & Kuyruk Takibi"
        badge={activeCount > 0 ? `${activeCount} Aktif Bildirim` : 'Kuyruk Boş'}
        actions={
          activeCount > 0 ? (
            <ActionBtn size="xs" onClick={handleDismissAll} variant="danger">
              Tümünü Kapat ({activeCount})
            </ActionBtn>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StateBadge
            label="Aktif Kuyruk"
            value={activeCount}
            variant={activeCount > 0 ? 'warning' : 'neutral'}
          />
          <StateBadge
            label="Kalıcı Depolanan"
            value={Object.keys(storedCritical).length}
            variant={Object.keys(storedCritical).length > 0 ? 'error' : 'neutral'}
          />
        </div>

        <JsonViewer data={notifications} title="useNotificationState() Ham Kuyruk" />
      </Section>

      {/* SEKME 1: TOAST BİLDİRİMLERİ */}
      {currentTab === 'demos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DemoCard
              title="Başarılı Toast (Success)"
              subtitle="toast.success()"
              badge="Success"
              badgeVariant="success"
              icon="solar:check-circle-bold"
              action={
                <ActionBtn size="xs" onClick={handleSuccessToast} variant="success">
                  Fırlat
                </ActionBtn>
              }
            >
              Tamamlanan işlemler için yeşil onay bildirimi.
            </DemoCard>

            <DemoCard
              title="Uyarı Bildirimi (Warning)"
              subtitle="toast.warning()"
              badge="Warning"
              badgeVariant="warning"
              icon="solar:danger-triangle-bold"
              action={
                <ActionBtn size="xs" onClick={handleWarningToast} variant="warning">
                  Fırlat
                </ActionBtn>
              }
            >
              Kullanıcının dikkat etmesi gereken durumlar için sarı uyarı.
            </DemoCard>

            <DemoCard
              title="Hata Bildirimi (Error)"
              subtitle="toast.error()"
              badge="Error"
              badgeVariant="error"
              icon="solar:shield-cross-bold"
              action={
                <ActionBtn size="xs" onClick={handleErrorToast} variant="danger">
                  Fırlat
                </ActionBtn>
              }
            >
              Başarısız ağ veya validasyon hataları için kırmızı bildirim.
            </DemoCard>

            <DemoCard
              title="Geri Alınabilir Silme (Undo)"
              subtitle="action: { label, onClick }"
              badge="Action"
              badgeVariant="purple"
              icon="solar:round-transfer-diagonal-bold"
              action={
                <ActionBtn size="xs" onClick={handleUndoFlow} variant="primary">
                  Sil ve Geri Al Sun
                </ActionBtn>
              }
            >
              Silme sonrasında 6 saniyelik &quot;Geri Al&quot; düğmesi barındırır.
            </DemoCard>

            <DemoCard
              title="Bilgi Bildirimi (Info)"
              subtitle="toast.info()"
              badge="Info"
              badgeVariant="info"
              icon="solar:info-circle-bold"
              action={
                <ActionBtn size="xs" onClick={handleInfoToast} variant="default">
                  Fırlat
                </ActionBtn>
              }
            >
              Arka plan süreçleri ve genel bilgilendirmeler için mavi bildirim.
            </DemoCard>

            <DemoCard
              title="Özel Toast Yapılandırma"
              subtitle="Süre ve mükerrer ayarı"
              badge="Config"
              badgeVariant="neutral"
              icon="solar:slider-minimalistic-horizontal-bold"
              action={
                <ActionBtn size="xs" onClick={handleSuccessToast} variant="primary">
                  Özel Toast Fırlat
                </ActionBtn>
              }
            >
              <TextInput label="Başlık" value={toastMessage} onChange={setToastMessage} />
            </DemoCard>
          </div>
        </div>
      )}

      {/* SEKME 2: KALICI & KRİTİK UYARILAR */}
      {currentTab === 'edge_cases' && (
        <div className="space-y-4">
          <NoticeBanner
            title="Kritik Bildirimler ve Tarayıcı Yenileme Dayanıklılığı"
            description="CRITICAL_TYPES bildirimleri (Offline, Session Expired vb.) localStorage üzerinde saklanır. Sayfa F5 ile yenilense bile kullanıcı sorunu çözene kadar açık kalır."
            variant="warning"
            icon="solar:shield-warning-bold"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DemoCard
              title="Ağ Durumu Simülatörü (Offline / Online)"
              subtitle="CRITICAL_TYPES.OFFLINE"
              badge="Network"
              badgeVariant="error"
              icon="solar:wifi-off-bold"
              action={
                <div className="flex gap-1.5">
                  <ActionBtn size="xs" onClick={handleSimulateOffline} variant="danger">
                    Çevrimdışı Ol
                  </ActionBtn>
                  <ActionBtn size="xs" onClick={handleSimulateOnline} variant="success">
                    Çevrimiçi Ol
                  </ActionBtn>
                </div>
              }
            >
              Çevrimdışı olunduğunda kalıcı banner açılır; bağlantı geri geldiğinde otomatik temizlenir.
            </DemoCard>

            <DemoCard
              title="Spam & Tekilleştirme Laboratuvarı"
              subtitle="dedupeKey Farkı"
              badge="Dedupe"
              badgeVariant="info"
              icon="solar:copy-bold"
              action={
                <div className="flex gap-1.5">
                  <ActionBtn size="xs" onClick={handleSpamWithoutDedupe} variant="danger">
                    3x Spamlama
                  </ActionBtn>
                  <ActionBtn size="xs" onClick={handleSpamWithDedupe} variant="success">
                    3x Dedupe İle
                  </ActionBtn>
                </div>
              }
            >
              Tekilleştirme anahtarı verildiğinde aynı uyarı 10 kez de fırlatılsa tek kart olarak kalır.
            </DemoCard>

            <DemoCard
              title="Oturum Süresi Doldu"
              subtitle="CRITICAL_TYPES.SESSION_EXPIRED"
              badge="Auth"
              badgeVariant="error"
              icon="solar:lock-bold"
              action={
                <ActionBtn size="xs" onClick={() => handleTriggerCritical(CRITICAL_TYPES.SESSION_EXPIRED)} variant="danger">
                  Tetikle
                </ActionBtn>
              }
            >
              Kullanıcının oturum süresi dolduğunda tüm sayfada beliren ve yeniden giriş isteyen kilit uyarısı.
            </DemoCard>

            <DemoCard
              title="Sunucu Hatası (500)"
              subtitle="CRITICAL_TYPES.SERVER_ERROR"
              badge="Server"
              badgeVariant="error"
              icon="solar:server-bold"
              action={
                <ActionBtn size="xs" onClick={() => handleTriggerCritical(CRITICAL_TYPES.SERVER_ERROR)} variant="danger">
                  Tetikle
                </ActionBtn>
              }
            >
              Kritik API arızası durumunda kullanıcıya gösterilen kalıcı sistem uyarısı.
            </DemoCard>
          </div>

          <Section
            title="localStorage['critical_notifications'] Canlı İnceleyici"
            actions={
              <ActionBtn size="xs" onClick={handleClearCriticalStorage} variant="danger">
                Hafızayı Temizle
              </ActionBtn>
            }
          >
            <JsonViewer data={storedCritical} title="localStorage İçeriği (Sayfa Yenilense Bile Korunur)" />
          </Section>

          <Section title="Bildirim Modülü Yetenek Matrisi">
            <FeatureChecklist
              features={[
                { name: '4 Toast Türü', desc: 'success, warning, error, info seviyeleri', tested: true },
                { name: 'Geri Al Aksiyonları', desc: 'action: { label, onClick } ile interaktif butonlar', tested: true },
                { name: 'Kalıcı Kritik Türler', desc: 'OFFLINE, SESSION_EXPIRED, SERVER_ERROR, PERMISSION_DENIED', tested: true },
                { name: 'localStorage Persistence', desc: 'Yenileme sonrası kritik bildirimlerin kaybolmaması', tested: true },
                { name: 'Deduplication (dedupeKey)', desc: 'Spam ve mükerrer bildirim yığılmasını engelleme', tested: true },
                { name: 'Auto-Dismiss Timers', desc: 'Dismissible toast bildirimlerinin süre bitiminde kapanması', tested: true },
              ]}
            />
          </Section>
        </div>
      )}

      {/* SEKME 3: APİ & KOD ÖRNEKLERİ */}
      {currentTab === 'code' && (
        <div className="space-y-4">
          <CodeSnippet
            title="1. Geri Alınabilir Toast Fırlatma"
            code={`import { useToast } from '@/modules/notification';

function DeleteMovieButton({ movie, onDelete, onRestore }) {
  const toast = useToast();

  const handleDelete = () => {
    onDelete(movie.id);

    toast.success('Film kütüphaneden çıkarıldı', {
      description: 'Bu işlemi 6 saniye içerisinde geri alabilirsiniz.',
      duration: 6000,
      allowInProduction: true,
      action: {
        label: 'Geri Al',
        onClick: () => onRestore(movie),
      },
    });
  };

  return <Button onClick={handleDelete}>Filmi Sil</Button>;
}`}
          />

          <CodeSnippet
            title="2. Mükerrer Engelleme (dedupeKey) Kullanımı"
            code={`toast.error('Bağlantı hatası oluştu', {
  description: 'Lütfen birkaç saniye sonra tekrar deneyin.',
  dedupeKey: 'api-connection-error', // Aynı hata üst üste binerse yeni kart açmaz!
});`}
          />

          <CodeSnippet
            title="3. Kalıcı Kritik Bildirim Yayınlama"
            code={`import { useNotificationActions, CRITICAL_TYPES } from '@/modules/notification';

function NetworkWatcher() {
  const { showNotification } = useNotificationActions();

  const handleOffline = () => {
    showNotification(CRITICAL_TYPES.OFFLINE, {
      id: 'network-offline',
      message: 'İnternet bağlantınız koptu',
      actions: [
        { label: 'Yeniden Dene', onClick: testConnection, dismiss: false },
      ],
    });
  };
}`}
          />
        </div>
      )}

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Bildirim Yaşam Döngüsü & Olay Günlüğü" />
    </div>
  );
}

