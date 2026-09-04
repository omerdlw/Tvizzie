'use client';

import { useEffect, useState } from 'react';
import { ComponentError, getErrorReporter, ModuleError } from '@/modules/error-boundary';
import { EVENT_TYPES, globalEvents } from '@/shared';
import { ActionBtn, JsonViewer, LogConsole, Section, StateBadge, TextInput } from './shared';

// Render anında kontrollü olarak bilerek hata fırlatabilen test alt bileşeni
function CrashingChild({ shouldThrow, errorMessage }) {
  if (shouldThrow) {
    throw new Error(errorMessage || 'Planlı test render hatası fırlatıldı!');
  }

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 font-mono text-xs text-emerald-300">
      Bileşen sağlıklı bir şekilde render ediliyor. Aktif bir hata yok.
    </div>
  );
}

export default function WorkbenchErrorBoundary() {
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

  // ComponentError tetikleme durumu
  const [shouldThrowComponent, setShouldThrowComponent] = useState(false);
  const [componentErrorMessage, setComponentErrorMessage] = useState(
    'Kritik alt bileşen render hatası',
  );

  // ModuleError tetikleme durumu
  const [shouldThrowModule, setShouldThrowModule] = useState(false);
  const [moduleErrorMessage, setModuleErrorMessage] = useState('Alt sistem modül çekirdek hatası');

  // Manuel reporter girdi alanları
  const [manualErrorText, setManualErrorText] = useState('Manuel telemetri test hatası');
  const [manualErrorTag, setManualErrorTag] = useState('test-laboratuvari');

  // Yakalanan hata raporları geçmişi
  const [capturedReports, setCapturedReports] = useState([]);

  // globalEvents APP_ERROR dinleyicisi ve özel test raporlayıcı dinleyicisi
  useEffect(() => {
    const reporter = getErrorReporter();

    const testHandlerName = 'playground-reporter-listener';
    reporter.removeHandler(testHandlerName);
    reporter.addHandler({
      name: testHandlerName,
      handle: (report) => {
        setCapturedReports((prev) => [report, ...prev.slice(0, 19)]);
        addLog('reporter.yakalandi', `${report.error?.name}: ${report.error?.message}`, 'warning');
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

  const handleTriggerUnhandledRejection = () => {
    addLog('runtime', 'Global yakalanmamış Promise reddi fırlatılıyor...');
    setTimeout(() => {
      Promise.reject(new Error('GlobalErrorListener için simüle edilmiş Promise reddi'));
    }, 50);
  };

  const handleTriggerWindowError = () => {
    addLog('runtime', 'window.onerror için ErrorEvent fırlatılıyor...');
    if (typeof window !== 'undefined') {
      const errorEvent = new ErrorEvent('error', {
        error: new Error('window.onerror için simüle edilmiş çalışma zamanı hatası'),
        message: 'window.onerror için simüle edilmiş çalışma zamanı hatası',
      });
      window.dispatchEvent(errorEvent);
    }
  };

  const handleManualCapture = () => {
    const reporter = getErrorReporter();
    const error = new Error(manualErrorText);
    reporter.setTag('environment', 'testing');
    reporter.setTag('kaynak_etiketi', manualErrorTag);
    reporter.captureError(error, {
      route: '/modules',
      variant: 'manuel-test',
    });
    addLog('captureError', `Manuel hata kaydedildi: "${manualErrorText}"`, 'info');
  };

  const handleManualMessage = () => {
    const reporter = getErrorReporter();
    reporter.captureMessage(`Test mesajı: ${manualErrorText}`, { level: 'info' });
    addLog('captureMessage', `Manuel mesaj kaydedildi: "${manualErrorText}"`, 'info');
  };

  return (
    <div className="space-y-6">
      {/* Genel Bakış */}
      <Section title="Hata Raporlama Boru Hattı" badge="Gözlenebilirlik">
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="Raporlar"
            value={capturedReports.length}
            variant={capturedReports.length > 0 ? 'warning' : 'neutral'}
          />
          <StateBadge
            label="Bileşen"
            value={shouldThrowComponent ? 'Çöktü' : 'Normal'}
            variant={shouldThrowComponent ? 'error' : 'success'}
          />
          <StateBadge
            label="Modül"
            value={shouldThrowModule ? 'Çöktü' : 'Normal'}
            variant={shouldThrowModule ? 'error' : 'success'}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionBtn
            onClick={handleTriggerUnhandledRejection}
            variant="danger"
            icon="solar:danger-triangle-bold"
          >
            Promise Reddi Fırlat
          </ActionBtn>
          <ActionBtn onClick={handleTriggerWindowError} variant="danger" icon="solar:bug-bold">
            Pencere Hatası Fırlat
          </ActionBtn>
        </div>
      </Section>

      {/* Bileşen Hata Sınırı */}
      <Section title="Bileşen Hata Sınırı (ComponentError)">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <TextInput
              label="Hata Mesajı"
              value={componentErrorMessage}
              onChange={setComponentErrorMessage}
            />
          </div>
          <div className="flex items-end">
            <ActionBtn
              onClick={() => setShouldThrowComponent((prev) => !prev)}
              variant={shouldThrowComponent ? 'default' : 'danger'}
              className="w-full"
            >
              {shouldThrowComponent ? 'Kurtar' : 'Bileşeni Çökert'}
            </ActionBtn>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
          <ComponentError
            message={componentErrorMessage}
            onReset={() => {
              setShouldThrowComponent(false);
              addLog('ComponentError:onReset', 'Bileşen hatası sıfırlandı', 'success');
            }}
          >
            <CrashingChild
              shouldThrow={shouldThrowComponent}
              errorMessage={componentErrorMessage}
            />
          </ComponentError>
        </div>
      </Section>

      {/* Modül Düzeyi Sınır */}
      <Section title="Modül Hata Sınırı (ModuleError)">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <TextInput
              label="Hata Mesajı"
              value={moduleErrorMessage}
              onChange={setModuleErrorMessage}
            />
          </div>
          <div className="flex items-end">
            <ActionBtn
              onClick={() => setShouldThrowModule((prev) => !prev)}
              variant={shouldThrowModule ? 'default' : 'danger'}
              className="w-full"
            >
              {shouldThrowModule ? 'Kurtar' : 'Modülü Çökert'}
            </ActionBtn>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5">
          <ModuleError
            name="TestModulu"
            onReset={() => {
              setShouldThrowModule(false);
              addLog('ModuleError:onReset', 'Modül hatası sıfırlandı', 'success');
            }}
          >
            <CrashingChild shouldThrow={shouldThrowModule} errorMessage={moduleErrorMessage} />
          </ModuleError>
        </div>
      </Section>

      {/* Telemetri */}
      <Section title="Telemetri ve Kaydedici">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput label="Hata Metni" value={manualErrorText} onChange={setManualErrorText} />
          <TextInput label="Etiket" value={manualErrorTag} onChange={setManualErrorTag} />
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <ActionBtn onClick={handleManualCapture} variant="primary" icon="solar:cloud-upload-bold">
            Hata Kaydet
          </ActionBtn>
          <ActionBtn onClick={handleManualMessage} icon="solar:chat-round-bold">
            Mesaj Kaydet
          </ActionBtn>
        </div>

        <JsonViewer
          data={capturedReports[0] || { mesaj: 'Henüz rapor yok' }}
          title="Son Hata Raporu"
        />
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Logs" />
    </div>
  );
}
