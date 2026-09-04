'use client';

import { useEffect, useRef, useState } from 'react';
import { useLoadingActions, useLoadingState } from '@/modules/loading';
import { useLoadingRegistration } from '@/modules/registry';
import { ActionBtn, JsonViewer, LogConsole, Section, StateBadge, TextInput } from './shared';

export default function WorkbenchLoading() {
  const state = useLoadingState();
  const actions = useLoadingActions();

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

  // Geçen süreyi ölçen kronometre
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

  // ESC tuşuna basıldığında yüklemeyi kapatma güvencesi
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

  // Form girdileri
  const [minDurationInput, setMinDurationInput] = useState(2000);
  const [showOverlayOption, setShowOverlayOption] = useState(true);

  // Deklaratif kayıt
  const [isRegistryLoadingActive, setIsRegistryLoadingActive] = useState(false);
  const [registryMinDuration, setRegistryMinDuration] = useState(1500);

  // useLoadingRegistration ile Registry'e kaydetme
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

  // 1. Otomatik Kapanan Asenkron Simülasyon
  const handleSimulateAsyncTask = (durationMs = 2500) => {
    addLog('gorevSimulasyonu', `${durationMs}ms sürecek asenkron işlem başlatılıyor...`, 'info');
    actions.startLoading({
      minDuration: Number(minDurationInput),
      showOverlay: showOverlayOption,
    });

    setTimeout(() => {
      actions.stopLoading();
      addLog(
        'gorevSimulasyonu:bitti',
        `İşlem tamamlandı, stopLoading() çağrıldı (${durationMs}ms)`,
        'success',
      );
    }, durationMs);
  };

  // 2. minDuration Kontrat Testi (Erken stopLoading çağrısı)
  const handleTestMinDurationContract = () => {
    const minDuration = 2500;
    addLog(
      'minDurationTesti',
      `startLoading(${minDuration}ms) başlatılıp sadece 100ms sonra stopLoading() çağrılacak...`,
      'info',
    );
    actions.startLoading({
      minDuration,
      showOverlay: true,
    });

    setTimeout(() => {
      addLog(
        'stopLoading()_cagrildi',
        'stopLoading() +100ms anında çağrıldı! minDuration kuralı gereği ekran 2500ms dolana kadar açık kalır.',
        'warning',
      );
      actions.stopLoading();
    }, 100);
  };

  // 3. Özel Skeleton Render Testi
  const handleCustomSkeleton = () => {
    addLog('ozelSkeleton', 'Özel skeleton bileşeniyle 3 saniyelik yükleme başlatıldı', 'info');
    actions.startLoading({
      minDuration: 3000,
      showOverlay: true,
      skeleton: (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="size-12 animate-spin rounded-full border-2 border-white/10 border-t-white" />
          <div className="font-mono text-xs text-white">Özel Skeleton Katmanı Aktif</div>
          <div className="h-1.5 w-36 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-white" />
          </div>
        </div>
      ),
    });

    setTimeout(() => {
      actions.stopLoading();
      addLog('ozelSkeleton:bitti', 'Özel skeleton kapatıldı', 'success');
    }, 3000);
  };

  return (
    <div className="space-y-4">
      {/* Acil Durdurma Yüzer Butonu (Yükleme tüm ekranı kaplasa bile en üstte tıklanabilir kalır) */}
      {state.isLoading && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-2 rounded-xl border border-rose-500/50 bg-black/80 p-2 shadow-2xl backdrop-blur-md">
          <span className="animate-pulse font-mono text-xs text-rose-300">Yükleme Aktif</span>
          <Button
            type="button"
            onClick={() => {
              actions.stopLoading();
              addLog('acilDurdurma', 'Yükleme kullanıcı tarafından zorla kapatıldı', 'warning');
            }}
            className="cursor-pointer rounded-lg bg-rose-500 px-3 py-1 font-mono text-xs font-bold text-black transition-colors hover:bg-rose-400"
          >
            Durdur
          </Button>
        </div>
      )}

      {/* Yükleme Durumu */}
      <Section
        title="Yükleme Durumu"
        badge={state.isLoading ? 'Yükleniyor' : 'Boşta'}
        actions={
          state.isLoading ? (
            <ActionBtn size="xs" onClick={actions.stopLoading} variant="danger">
              Durdur
            </ActionBtn>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="isLoading"
            value={state.isLoading ? 'Evet' : 'Hayır'}
            variant={state.isLoading ? 'warning' : 'neutral'}
          />
          <StateBadge
            label="isPageLoading"
            value={state.isPageLoading ? 'Evet' : 'Hayır'}
            variant={state.isPageLoading ? 'warning' : 'neutral'}
          />
          <StateBadge label="Minimum Süre" value={`${state.minDuration || 0}ms`} />
          <StateBadge
            label="Overlay"
            value={state.showOverlay ? 'Açık' : 'Kapalı'}
            variant={state.showOverlay ? 'info' : 'neutral'}
          />
          <StateBadge
            label="Geçen Süre"
            value={state.isLoading ? `${elapsedMs}ms` : '0ms'}
            variant={state.isLoading ? 'warning' : 'neutral'}
          />
        </div>

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

      {/* Test Senaryoları */}
      <Section title="Test Senaryoları">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput
            label="Minimum Süre (ms)"
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
              Overlay katmanını göster (showOverlay)
            </label>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <ActionBtn
            onClick={() => handleSimulateAsyncTask(2000)}
            variant="primary"
            icon="solar:play-bold"
          >
            2 Sn Görev
          </ActionBtn>
          <ActionBtn onClick={handleTestMinDurationContract} icon="solar:hourglass-bold">
            minDuration Testi
          </ActionBtn>
          <ActionBtn onClick={handleCustomSkeleton} icon="solar:layers-bold">
            Skeleton ile Yükle
          </ActionBtn>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
          <ActionBtn
            onClick={() => {
              actions.startLoading({
                minDuration: Number(minDurationInput),
                showOverlay: showOverlayOption,
              });
              addLog('startLoading', 'Manuel başlatıldı');
            }}
            icon="solar:play-circle-bold"
          >
            Başlat
          </ActionBtn>
          <ActionBtn onClick={actions.stopLoading} variant="danger" icon="solar:stop-bold">
            Durdur
          </ActionBtn>
          <ActionBtn onClick={() => actions.setLoading(true)}>setLoading(true)</ActionBtn>
          <ActionBtn onClick={() => actions.setLoading(false)}>setLoading(false)</ActionBtn>
        </div>
      </Section>

      {/* Registry Entegrasyonu */}
      <Section
        title="Registry Üzerinden Yükleme"
        badge={isRegistryLoadingActive ? 'Kayıtlı' : 'Pasif'}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-32">
            <TextInput
              label="Süre (ms)"
              type="number"
              value={registryMinDuration}
              onChange={(v) => setRegistryMinDuration(Number(v))}
            />
          </div>
          <ActionBtn
            onClick={() => {
              setIsRegistryLoadingActive((prev) => !prev);
              addLog(
                'registry',
                `Loading kaydı ${!isRegistryLoadingActive ? 'aktif' : 'pasif'} yapıldı`,
              );
            }}
            variant={isRegistryLoadingActive ? 'danger' : 'primary'}
          >
            {isRegistryLoadingActive ? 'Durdur' : 'Registry Kaydı Başlat'}
          </ActionBtn>
        </div>
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Logs" />
    </div>
  );
}
