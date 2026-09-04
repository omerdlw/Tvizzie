'use client';

import { useRef, useState } from 'react';
import {
  clearRegistryDiagnostics,
  REGISTRY_LIFECYCLES,
  REGISTRY_SOURCES,
  REGISTRY_TYPES,
  useRegistryActions,
  useRegistryDiagnostics,
  useRegistryEntries,
} from '@/modules/registry';
import {
  ActionBtn,
  JsonViewer,
  LogConsole,
  Section,
  SelectInput,
  StateBadge,
  TextInput,
} from './shared';

export default function WorkbenchRegistry() {
  const { register, unregister } = useRegistryActions();
  const diagnostics = useRegistryDiagnostics();

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

  // Tür gezgini seçicisi
  const [selectedType, setSelectedType] = useState(REGISTRY_TYPES.NAV);
  const typeEntries = useRegistryEntries(selectedType);

  // Manuel kayıt girdileri
  const [regType, setRegType] = useState(REGISTRY_TYPES.BACKGROUND);
  const [regKey, setRegKey] = useState('ozel-alan-1');
  const [regValue, setRegValue] = useState('{"tema": "siberpunk", "yogunluk": 90}');
  const [regPriority, setRegPriority] = useState(120);
  const [regSource, setRegSource] = useState(REGISTRY_SOURCES.DYNAMIC);
  const [regLifecycle, setRegLifecycle] = useState(REGISTRY_LIFECYCLES.IMMEDIATE);

  // Kayıt tanıtıcısı (Handle bir fonksiyon olduğu için React useState içine DOĞRUDAN KONULMAZ, ref kullanılır)
  const lastHandleRef = useRef(null);
  const [hasRegisteredHandle, setHasRegisteredHandle] = useState(false);

  // Çakışma testi tanıtıcıları
  const conflictHandleLowRef = useRef(null);
  const conflictHandleHighRef = useRef(null);
  const [conflictState, setConflictState] = useState({
    lowRegistered: false,
    highRegistered: false,
  });

  const handleManualRegister = () => {
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(regValue);
      } catch {
        parsedValue = regValue;
      }

      addLog('registry.register', `${regType}::${regKey} kaydediliyor (Öncelik: ${regPriority})`);
      const handle = register(regType, regKey, parsedValue, {
        priority: Number(regPriority),
        source: regSource,
        lifecycle: regLifecycle,
      });

      lastHandleRef.current = handle;
      setHasRegisteredHandle(true);
      addLog('registry.register:basarili', 'Kayıt Defteri harici hafızasına kaydedildi', 'success');
    } catch (err) {
      addLog('registry.register:hata', err.message, 'error');
    }
  };

  const handleManualUnregister = () => {
    try {
      addLog('registry.unregister', `${regType}::${regKey} kaydı siliniyor`);
      unregister(regType, regKey, lastHandleRef.current);
      lastHandleRef.current = null;
      setHasRegisteredHandle(false);
      addLog('registry.unregister:basarili', 'Kayıt başarıyla silindi', 'success');
    } catch (err) {
      addLog('registry.unregister:hata', err.message, 'error');
    }
  };

  // Öncelik Çakışması Simülasyonu
  const handleRegisterLow = () => {
    const handle = register(
      REGISTRY_TYPES.BACKGROUND,
      'cakisma-test-alani',
      { etiket: 'Düşük Öncelikli Veri (Mavi)', renk: 'blue' },
      { priority: 50, source: 'test-dusuk' },
    );
    conflictHandleLowRef.current = handle;
    setConflictState((prev) => ({ ...prev, lowRegistered: true }));
    addLog('cakisma:dusukOncelik', 'Öncelik: 50 ("Mavi") kaydedildi', 'info');
  };

  const handleRegisterHigh = () => {
    const handle = register(
      REGISTRY_TYPES.BACKGROUND,
      'cakisma-test-alani',
      { etiket: 'Yüksek Öncelikli Kazanan (Altın)', renk: 'gold' },
      { priority: 100, source: 'test-yuksek' },
    );
    conflictHandleHighRef.current = handle;
    setConflictState((prev) => ({ ...prev, highRegistered: true }));
    addLog(
      'cakisma:yuksekOncelik',
      'Öncelik: 100 ("Altın") kaydedildi - Önceliği yüksek olduğu için bu kazanır!',
      'success',
    );
  };

  const handleUnregisterHigh = () => {
    unregister(REGISTRY_TYPES.BACKGROUND, 'cakisma-test-alani', conflictHandleHighRef.current);
    conflictHandleHighRef.current = null;
    setConflictState((prev) => ({ ...prev, highRegistered: false }));
    addLog(
      'cakisma:yuksekSilindi',
      'Öncelik 100 kaydı silindi. Öncelik 50 olan kayıt otomatik olarak görevi devralır!',
      'warning',
    );
  };

  const handleUnregisterLow = () => {
    unregister(REGISTRY_TYPES.BACKGROUND, 'cakisma-test-alani', conflictHandleLowRef.current);
    conflictHandleLowRef.current = null;
    setConflictState((prev) => ({ ...prev, lowRegistered: false }));
    addLog('cakisma:dusukSilindi', 'Öncelik 50 kaydı silindi', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Hafıza Gezgini */}
      <Section
        title="Hafıza Gezgini"
        badge={`${typeEntries ? Object.keys(typeEntries).length : 0} Kayıt`}
      >
        <div className="mb-3">
          <SelectInput
            label="Kayıt Türü"
            value={selectedType}
            onChange={setSelectedType}
            options={Object.values(REGISTRY_TYPES).map((t) => ({ value: t, label: t }))}
          />
        </div>

        <JsonViewer
          data={typeEntries || {}}
          title={`REGISTRY_TYPES.${selectedType}`}
          maxHeight="200px"
        />
      </Section>

      {/* Kayıt Laboratuvarı */}
      <Section title="Kayıt Laboratuvarı">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectInput
            label="Kayıt Türü"
            value={regType}
            onChange={setRegType}
            options={Object.values(REGISTRY_TYPES).map((t) => ({ value: t, label: t }))}
          />
          <TextInput
            label="Anahtar (Key)"
            value={regKey}
            onChange={setRegKey}
            placeholder="Anahtar adı..."
          />
          <TextInput
            label="Öncelik (Priority)"
            type="number"
            value={regPriority}
            onChange={(v) => setRegPriority(Number(v))}
          />
        </div>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectInput
            label="Kaynak (Source)"
            value={regSource}
            onChange={setRegSource}
            options={Object.values(REGISTRY_SOURCES).map((s) => ({ value: s, label: s }))}
          />
          <SelectInput
            label="Yaşam Döngüsü"
            value={regLifecycle}
            onChange={setRegLifecycle}
            options={Object.values(REGISTRY_LIFECYCLES).map((l) => ({ value: l, label: l }))}
          />
        </div>

        <div className="mb-3">
          <TextInput label="Değer (JSON veya metin)" value={regValue} onChange={setRegValue} />
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionBtn
            onClick={handleManualRegister}
            variant="primary"
            icon="solar:document-add-bold"
          >
            Kaydet
          </ActionBtn>
          <ActionBtn
            onClick={handleManualUnregister}
            disabled={!hasRegisteredHandle}
            variant="danger"
            icon="solar:trash-bin-trash-bold"
          >
            Kaydı Sil
          </ActionBtn>
        </div>
      </Section>

      {/* Öncelik Çakışması */}
      <Section title="Öncelik Çakışması">
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="Öncelik 50"
            value={conflictState.lowRegistered ? 'Kayıtlı' : 'Kapalı'}
            variant={conflictState.lowRegistered ? 'info' : 'neutral'}
          />
          <StateBadge
            label="Öncelik 100"
            value={conflictState.highRegistered ? 'Lider' : 'Kapalı'}
            variant={conflictState.highRegistered ? 'warning' : 'neutral'}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {!conflictState.lowRegistered ? (
            <ActionBtn onClick={handleRegisterLow} icon="solar:add-circle-bold">
              Öncelik 50 Kaydet
            </ActionBtn>
          ) : (
            <ActionBtn onClick={handleUnregisterLow} variant="danger">
              Öncelik 50 Sil
            </ActionBtn>
          )}

          {!conflictState.highRegistered ? (
            <ActionBtn onClick={handleRegisterHigh} variant="primary" icon="solar:star-bold">
              Öncelik 100 Kaydet
            </ActionBtn>
          ) : (
            <ActionBtn onClick={handleUnregisterHigh} variant="danger">
              Öncelik 100 Sil
            </ActionBtn>
          )}
        </div>
      </Section>

      {/* Teşhis ve Telemetri */}
      <Section
        title="Teşhis & Telemetri"
        badge={`${diagnostics.length} Olay`}
        actions={
          diagnostics.length > 0 ? (
            <ActionBtn size="xs" onClick={clearRegistryDiagnostics} variant="danger">
              Temizle
            </ActionBtn>
          ) : null
        }
      >
        <JsonViewer
          data={diagnostics.slice(-10)}
          title="useRegistryDiagnostics()"
          maxHeight="160px"
        />
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Logs" />
    </div>
  );
}
