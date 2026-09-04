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
import { ActionBtn, JsonViewer, LogConsole, Section, StateBadge, TextInput } from './shared';

export default function WorkbenchNotification() {
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

  const handleActionToast = () => {
    addLog('toast:eylemli', 'Geri Al (Undo) butonlu toast bildirimi fırlatıldı');
    toast.success('Dosya silindi', {
      description: 'Bu işlemi 6 saniye içerisinde geri alabilirsiniz.',
      duration: 6000,
      allowInProduction: true,
      action: {
        label: 'Geri Al (Undo)',
        onClick: () => addLog('toast:geriAlTıklandı', 'Geri al butonuna tıklandı!', 'success'),
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
      {/* Durum & Kuyruk */}
      <Section
        title="Bildirim Durumu & Kuyruk"
        badge={activeCount > 0 ? `${activeCount} Aktif` : 'Boş'}
        actions={
          activeCount > 0 ? (
            <ActionBtn size="xs" onClick={handleDismissAll} variant="danger">
              Tümünü Kapat ({activeCount})
            </ActionBtn>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="Aktif"
            value={activeCount}
            variant={activeCount > 0 ? 'warning' : 'neutral'}
          />
          <StateBadge
            label="Kalıcı"
            value={Object.keys(storedCritical).length}
            variant={Object.keys(storedCritical).length > 0 ? 'error' : 'neutral'}
          />
        </div>

        <JsonViewer data={notifications} title="useNotificationState()" />
      </Section>

      {/* Toast Tetikleyicileri */}
      <Section title="Toast Bildirimleri">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput label="Başlık" value={toastMessage} onChange={setToastMessage} />
          <TextInput label="Açıklama" value={toastDescription} onChange={setToastDescription} />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-28">
            <TextInput
              label="Süre (ms)"
              type="number"
              value={toastDuration}
              onChange={(v) => setToastDuration(Number(v))}
            />
          </div>
          <div className="flex items-center gap-2 pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={useDedupeKey}
                onChange={(e) => setUseDedupeKey(e.target.checked)}
                className="rounded border-white/10"
              />
              Mükerrer engelle (dedupeKey)
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionBtn onClick={handleSuccessToast} variant="success" icon="solar:check-circle-bold">
            Başarılı
          </ActionBtn>
          <ActionBtn
            onClick={handleWarningToast}
            variant="default"
            icon="solar:danger-triangle-bold"
          >
            Uyarı
          </ActionBtn>
          <ActionBtn onClick={handleErrorToast} variant="danger" icon="solar:shield-cross-bold">
            Hata
          </ActionBtn>
          <ActionBtn onClick={handleInfoToast} icon="solar:info-circle-bold">
            Bilgi
          </ActionBtn>
          <ActionBtn
            onClick={handleActionToast}
            variant="primary"
            icon="solar:round-transfer-diagonal-bold"
          >
            Geri Al Butonlu
          </ActionBtn>
        </div>
      </Section>

      {/* Kalıcı Kritik Bildirimler */}
      <Section
        title="Kritik Bildirimler (Kalıcı)"
        actions={
          <ActionBtn size="xs" onClick={handleClearCriticalStorage} variant="danger">
            Temizle
          </ActionBtn>
        }
      >
        <div className="flex flex-wrap gap-2">
          <ActionBtn
            onClick={() => handleTriggerCritical(CRITICAL_TYPES.OFFLINE)}
            variant="danger"
            icon="solar:wifi-off-bold"
          >
            Offline Uyarısı
          </ActionBtn>
          <ActionBtn
            onClick={() => handleTriggerCritical(CRITICAL_TYPES.SESSION_EXPIRED)}
            variant="danger"
            icon="solar:lock-bold"
          >
            Oturum Süresi Doldu
          </ActionBtn>
          <ActionBtn
            onClick={() => handleTriggerCritical(CRITICAL_TYPES.PERMISSION_DENIED)}
            variant="danger"
            icon="solar:forbidden-circle-bold"
          >
            İzin Reddedildi
          </ActionBtn>
          <ActionBtn
            onClick={() => handleTriggerCritical(CRITICAL_TYPES.SERVER_ERROR)}
            variant="danger"
            icon="solar:server-bold"
          >
            KRİTİK: SUNUCU HATASI
          </ActionBtn>
        </div>

        <JsonViewer data={storedCritical} title="localStorage['critical_notifications'] İçeriği" />
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Bildirim Olay Günlüğü" />
    </div>
  );
}
