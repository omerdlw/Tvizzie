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
  validateRegistryValue,
} from '@/modules/registry';
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
  SelectInput,
  StateBadge,
  TextInput,
} from './shared';

export default function WorkbenchRegistry() {
  const { register, unregister } = useRegistryActions();
  const diagnostics = useRegistryDiagnostics();

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

  // Type explorer
  const [selectedType, setSelectedType] = useState(REGISTRY_TYPES.NAV);
  const typeEntries = useRegistryEntries(selectedType);

  // Manual register input fields
  const [regType, setRegType] = useState(REGISTRY_TYPES.BACKGROUND);
  const [regKey, setRegKey] = useState('custom-arena-item');
  const [regValue, setRegValue] = useState('{"theme": "neon-cyber", "intensity": 85}');
  const [regPriority, setRegPriority] = useState(120);
  const [regSource, setRegSource] = useState(REGISTRY_SOURCES.DYNAMIC);
  const [regLifecycle, setRegLifecycle] = useState(REGISTRY_LIFECYCLES.IMMEDIATE);

  // Handle ref for manual registration
  const lastHandleRef = useRef(null);
  const [hasRegisteredHandle, setHasRegisteredHandle] = useState(false);

  // Conflict Battle Arena handles & state
  const conflictHandleLowRef = useRef(null);
  const conflictHandleHighRef = useRef(null);
  const [conflictState, setConflictState] = useState({
    lowRegistered: false,
    highRegistered: false,
  });

  // Schema Validation Sandbox
  const [validationType, setValidationType] = useState(REGISTRY_TYPES.BACKGROUND);
  const [validationInput, setValidationInput] = useState('{"image": "https://example.com/art.jpg", "overlay": true}');
  const [validationResult, setValidationResult] = useState(null);

  const handleRunValidation = () => {
    try {
      let parsed;
      try {
        parsed = JSON.parse(validationInput);
      } catch {
        parsed = validationInput;
      }
      const valid = validateRegistryValue(validationType, parsed);
      setValidationResult({ valid, error: null, evaluatedAt: new Date().toLocaleTimeString() });
      addLog('validateRegistryValue', `${validationType} doğrulaması: ${valid ? 'GEÇERLİ' : 'GEÇERSİZ'}`, valid ? 'success' : 'error');
    } catch (err) {
      setValidationResult({ valid: false, error: err.message, evaluatedAt: new Date().toLocaleTimeString() });
      addLog('validateRegistryValue:hata', err.message, 'error');
    }
  };

  const handleManualRegister = () => {
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(regValue);
      } catch {
        parsedValue = regValue;
      }

      addLog('register', `${regType}::${regKey} (Öncelik: ${regPriority}) kaydediliyor...`);
      const handle = register(regType, regKey, parsedValue, {
        priority: Number(regPriority),
        source: regSource,
        lifecycle: regLifecycle,
      });

      lastHandleRef.current = handle;
      setHasRegisteredHandle(true);
      addLog('register:success', 'Registry havuzuna başarıyla yayınlandı', 'success');
    } catch (err) {
      addLog('register:error', err.message, 'error');
    }
  };

  const handleManualUnregister = () => {
    try {
      addLog('unregister', `${regType}::${regKey} kaydı siliniyor`);
      unregister(regType, regKey, lastHandleRef.current);
      lastHandleRef.current = null;
      setHasRegisteredHandle(false);
      addLog('unregister:success', 'Kayıt Registry havuzundan kaldırıldı', 'success');
    } catch (err) {
      addLog('unregister:error', err.message, 'error');
    }
  };

  // Conflict Arena handlers
  const handleRegisterLow = () => {
    const handle = register(
      REGISTRY_TYPES.BACKGROUND,
      'battle-arena-target',
      { title: 'Düşük Öncelikli Mavi Arka Plan', color: '#1e3a8a', priority: 50 },
      { priority: 50, source: 'low-priority-component' },
    );
    conflictHandleLowRef.current = handle;
    setConflictState((prev) => ({ ...prev, lowRegistered: true }));
    addLog('battle:low', 'Öncelik: 50 kaydı yayınlandı (Mavi)', 'info');
  };

  const handleRegisterHigh = () => {
    const handle = register(
      REGISTRY_TYPES.BACKGROUND,
      'battle-arena-target',
      { title: 'Yüksek Öncelikli Altın Arka Plan', color: '#d97706', priority: 200 },
      { priority: 200, source: 'high-priority-component' },
    );
    conflictHandleHighRef.current = handle;
    setConflictState((prev) => ({ ...prev, highRegistered: true }));
    addLog('battle:high', 'Öncelik: 200 kaydı yayınlandı (Altın) - Daha yüksek olduğu için bu lider!', 'success');
  };

  const handleUnregisterHigh = () => {
    unregister(REGISTRY_TYPES.BACKGROUND, 'battle-arena-target', conflictHandleHighRef.current);
    conflictHandleHighRef.current = null;
    setConflictState((prev) => ({ ...prev, highRegistered: false }));
    addLog('battle:highRemoved', 'Öncelik 200 kaldırıldı -> Öncelik 50 otomatik olarak liderliğe yükselir!', 'warning');
  };

  const handleUnregisterLow = () => {
    unregister(REGISTRY_TYPES.BACKGROUND, 'battle-arena-target', conflictHandleLowRef.current);
    conflictHandleLowRef.current = null;
    setConflictState((prev) => ({ ...prev, lowRegistered: false }));
    addLog('battle:lowRemoved', 'Öncelik 50 kaydı silindi', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill
            label="İncelenen Tür"
            value={selectedType}
            variant="cyan"
          />
          <MetricPill
            label="Türdeki Kayıt Sayısı"
            value={`${typeEntries ? Object.keys(typeEntries).length : 0} Kayıt`}
            variant="indigo"
          />
          <MetricPill
            label="Teşhis Olayları"
            value={`${diagnostics.length} Olay`}
            variant={diagnostics.length > 0 ? 'amber' : 'neutral'}
          />
        </div>
        <div className="flex items-center gap-2">
          {diagnostics.length > 0 && (
            <ActionBtn
              size="xs"
              variant="danger"
              icon="solar:trash-bin-trash-bold"
              onClick={() => {
                clearRegistryDiagnostics();
                addLog('diagnostics:clear', 'Teşhis kayıtları temizlendi');
              }}
            >
              Teşhisi Temizle
            </ActionBtn>
          )}
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'demos', label: '1. Canlı Store Gezgini & Kayıt', icon: 'solar:database-bold' },
          { id: 'edge_cases', label: '2. Öncelik Savaşı & Şema Denetimi', icon: 'solar:shield-warning-bold' },
          { id: 'code', label: '3. API & Kod Sözleşmesi', icon: 'solar:code-bold' },
        ]}
      />

      {/* TAB 1: DEMOS */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="info"
            title="Registry (Merkezi Kayıt Defteri) Mimarisi"
            description="Registry, uygulamanın tüm modülleri (Nav, Background, Controls, ContextMenu, Modal, Loading) arasında deklaratif iletişim kuran merkezi bellek havuzudur. Her modül kendi veri şeması ve öncelik (priority) değerleriyle buraya kaydolur."
          />

          {/* Store Explorer */}
          <Section title="Canlı Hafıza Gezgini (Registry Explorer)">
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <SelectInput
                label="İncelenecek Kayıt Türü (REGISTRY_TYPES)"
                value={selectedType}
                onChange={setSelectedType}
                options={Object.values(REGISTRY_TYPES).map((t) => ({ value: t, label: t }))}
              />
              <JsonViewer
                data={typeEntries || {}}
                title={`useRegistryEntries("${selectedType}")`}
                maxHeight="240px"
              />
            </div>
          </Section>

          {/* Manual Registration Sandbox */}
          <Section title="Kayıt Laboratuvarı (register / unregister)">
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SelectInput
                  label="Hedef Tür"
                  value={regType}
                  onChange={setRegType}
                  options={Object.values(REGISTRY_TYPES).map((t) => ({ value: t, label: t }))}
                />
                <TextInput
                  label="Benzersiz Anahtar (Key)"
                  value={regKey}
                  onChange={setRegKey}
                  placeholder="custom-key..."
                />
                <TextInput
                  label="Öncelik (Priority)"
                  type="number"
                  value={regPriority}
                  onChange={(v) => setRegPriority(Number(v))}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectInput
                  label="Kaynak (Source)"
                  value={regSource}
                  onChange={setRegSource}
                  options={Object.values(REGISTRY_SOURCES).map((s) => ({ value: s, label: s }))}
                />
                <SelectInput
                  label="Yaşam Döngüsü (Lifecycle)"
                  value={regLifecycle}
                  onChange={setRegLifecycle}
                  options={Object.values(REGISTRY_LIFECYCLES).map((l) => ({ value: l, label: l }))}
                />
              </div>

              <TextInput
                label="Değer (JSON Nesnesi veya String)"
                value={regValue}
                onChange={setRegValue}
              />

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <ActionBtn
                  variant="primary"
                  icon="solar:document-add-bold"
                  onClick={handleManualRegister}
                >
                  Havuza Kaydet
                </ActionBtn>
                <ActionBtn
                  variant="danger"
                  icon="solar:trash-bin-trash-bold"
                  disabled={!hasRegisteredHandle}
                  onClick={handleManualUnregister}
                >
                  Kaydı Kaldır
                </ActionBtn>
                {hasRegisteredHandle && (
                  <span className="text-xs text-emerald-400">
                    ✓ Son kayıt handle nesnesi aktif referansta tutuluyor.
                  </span>
                )}
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* TAB 2: EDGE CASES & BATTLE ARENA */}
      {activeTab === 'edge_cases' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="warning"
            title="Öncelik Çözümleme Kuralları (Priority Resolution)"
            description="Aynı kayıt türü ve aynı anahtar için birden fazla bileşen kayıt gönderdiğinde, Registry en yüksek priority değerine sahip olanı aktif değer (effective value) olarak seçer. Lider silindiğinde bir önceki en yüksek kayıt anında otomatik devralır."
          />

          {/* Priority Battle Arena */}
          <Section title="Öncelik Çakışma Arenası (Priority Battle Arena)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DemoCard
                title="Bileşen A (Düşük Öncelik)"
                badge="Priority: 50"
                description="'battle-arena-target' anahtarına mavi arka plan talep eder."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Durum:</span>
                    <StateBadge
                      label="Kayıt"
                      value={conflictState.lowRegistered ? 'Kayıtlı' : 'Kapalı'}
                      variant={conflictState.lowRegistered ? 'info' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={conflictState.lowRegistered ? 'danger' : 'neutral'}
                    onClick={conflictState.lowRegistered ? handleUnregisterLow : handleRegisterLow}
                  >
                    {conflictState.lowRegistered ? 'Öncelik 50 Kaydını Sil' : 'Öncelik 50 ile Kaydet'}
                  </ActionBtn>
                </div>
              </DemoCard>

              <DemoCard
                title="Bileşen B (Yüksek Öncelik)"
                badge="Priority: 200"
                description="'battle-arena-target' anahtarına altın arka plan talep eder. Önceliği yüksek olduğu için liderliği alır."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Durum:</span>
                    <StateBadge
                      label="Liderlik"
                      value={conflictState.highRegistered ? 'LİDER (200)' : 'Kapalı'}
                      variant={conflictState.highRegistered ? 'success' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={conflictState.highRegistered ? 'danger' : 'primary'}
                    onClick={conflictState.highRegistered ? handleUnregisterHigh : handleRegisterHigh}
                  >
                    {conflictState.highRegistered ? 'Öncelik 200 Kaydını Sil' : 'Öncelik 200 ile Lider Ol'}
                  </ActionBtn>
                </div>
              </DemoCard>
            </div>
          </Section>

          {/* Schema Validation Sandbox */}
          <Section title="Şema Doğrulama Laboratuvarı (validateRegistryValue)">
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectInput
                  label="Doğrulanacak Şema Türü"
                  value={validationType}
                  onChange={setValidationType}
                  options={Object.values(REGISTRY_TYPES).map((t) => ({ value: t, label: t }))}
                />
                <TextInput
                  label="Doğrulanacak JSON İçeriği"
                  value={validationInput}
                  onChange={setValidationInput}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <ActionBtn
                  variant="primary"
                  icon="solar:check-circle-bold"
                  onClick={handleRunValidation}
                >
                  Şemayı Denetle
                </ActionBtn>
                {validationResult && (
                  <span className={`font-mono text-xs font-bold ${validationResult.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {validationResult.valid ? '✓ ŞEMA KURALLARINA UYGUN' : `✕ GEÇERSİZ: ${validationResult.error || 'Şema uyuşmazlığı'}`}
                  </span>
                )}
              </div>
            </div>
          </Section>

          <Section title="Registry Modülü Doğrulama Matrisi">
            <FeatureChecklist
              items={[
                { label: 'useRegistryActions (register, unregister) deklaratif işlem yönetimi', checked: true },
                { label: 'Öncelik çakışmalarında otomatik en yüksek priority çözümü', checked: true },
                { label: 'Lider kayıt silindiğinde bir sonraki önceliğin otomatik devralması', checked: true },
                { label: 'validateRegistryValue ile çalışma zamanı şema denetimi', checked: true },
                { label: 'useRegistryDiagnostics ile kayıt hatalarının telemetri takibi', checked: true },
                { label: 'Unmount anında handle referansı ile otomatik temizlik', checked: true },
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
            description="Bileşenlerinizde doğrudan register çağırmak yerine useBackgroundRegistration, useNavRegistration gibi tür-güvenli sarmalayıcıları tercih edin."
          />

          <CodeSnippet
            title="1. Deklaratif Kayıt Hook'u ile Otomatik Yaşam Döngüsü"
            code={`import { useBackgroundRegistration } from '@/modules/registry';

export function MoviePosterBackdrop({ movie }) {
  // Mount olduğunda öncelik 100 ile arka planı yayınlar,
  // Unmount olduğunda kaydı otomatik olarak temizler.
  useBackgroundRegistration(
    {
      image: movie.posterPath,
      overlay: true,
      overlayOpacity: 0.5,
    },
    { source: 'movie-card', priority: 100 }
  );

  return <div>{movie.title}</div>;
}`}
          />

          <CodeSnippet
            title="2. Doğrudan useRegistryActions Kullanımı"
            code={`import { useRegistryActions, REGISTRY_TYPES } from '@/modules/registry';
import { useEffect } from 'react';

export function CustomBanner() {
  const { register, unregister } = useRegistryActions();

  useEffect(() => {
    const handle = register(
      REGISTRY_TYPES.NAV,
      'promo-banner',
      { text: 'Büyük İndirim Günleri!' },
      { priority: 500 }
    );

    return () => {
      unregister(REGISTRY_TYPES.NAV, 'promo-banner', handle);
    };
  }, [register, unregister]);

  return null;
}`}
          />
        </div>
      )}

      {/* Diagnostics Viewer */}
      <Section title="Canlı Registry Teşhis ve Hata Raporları (Diagnostics)">
        <JsonViewer
          data={diagnostics.slice(-10)}
          title="useRegistryDiagnostics()"
          maxHeight="180px"
        />
      </Section>

      {/* Log Console */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Registry Olay Günlüğü" />
    </div>
  );
}

