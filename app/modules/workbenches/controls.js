'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { resolveControlsPairs, useControlsLayout } from '@/modules/controls';
import { useControlsRegistration } from '@/modules/registry';
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
  StateBadge,
  TextInput,
} from './shared';

export default function WorkbenchControls() {
  const pathname = usePathname();
  const layout = useControlsLayout();

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

  // Pair activation toggles
  const [enableOrder0Pair, setEnableOrder0Pair] = useState(true);
  const [enableOrder1Pair, setEnableOrder1Pair] = useState(false);
  const [enableOrder2Pair, setEnableOrder2Pair] = useState(false);

  // Edge case toggles
  const [enableUnpairedLeft, setEnableUnpairedLeft] = useState(false);
  const [enableUnpairedRight, setEnableUnpairedRight] = useState(false);
  const [enableDuplicateOrderConflict, setEnableDuplicateOrderConflict] = useState(false);

  // Filter & interaction states inside control chips
  const [selectedFilter, setSelectedFilter] = useState('Tümü');
  const [selectedSort, setSelectedSort] = useState('Popüler');
  const [viewMode, setViewMode] = useState('grid');
  const [pageNumber, setPageNumber] = useState(1);

  // Assemble registrations based on active toggles
  const registrationEntries = useMemo(() => {
    const entries = [];

    // 1. Order 0: Primary Pair (Category chips on Left + Sorting chips on Right)
    if (enableOrder0Pair) {
      entries.push(
        {
          id: 'filter-chips-left-0',
          path: pathname,
          side: 'left',
          order: 0,
          content: (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1 backdrop-blur-md shadow-lg">
              {['Tümü', 'Filmler', 'Diziler'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedFilter(cat);
                    addLog('order0:filter', `Filtre seçildi: ${cat}`, 'success');
                  }}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 font-mono text-xs transition-colors ${
                    selectedFilter === cat
                      ? 'bg-white font-semibold text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ),
        },
        {
          id: 'sort-chips-right-0',
          path: pathname,
          side: 'right',
          order: 0,
          content: (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1 backdrop-blur-md shadow-lg">
              {['Popüler', 'Puan', 'En Yeni'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSelectedSort(s);
                    addLog('order0:sort', `Sıralama seçildi: ${s}`, 'success');
                  }}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 font-mono text-xs transition-colors ${
                    selectedSort === s
                      ? 'bg-white font-semibold text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          ),
        },
      );
    }

    // 2. Order 1: Secondary Pair (View Switcher on Left + Sync Action on Right)
    if (enableOrder1Pair) {
      entries.push(
        {
          id: 'view-mode-left-1',
          path: pathname,
          side: 'left',
          order: 1,
          content: (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1 backdrop-blur-md shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setViewMode('grid');
                  addLog('order1:view', 'Izgara moduna geçildi');
                }}
                className={`cursor-pointer rounded-lg px-2 py-1 font-mono text-xs ${
                  viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                Izgara
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  addLog('order1:view', 'Liste moduna geçildi');
                }}
                className={`cursor-pointer rounded-lg px-2 py-1 font-mono text-xs ${
                  viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                Liste
              </button>
            </div>
          ),
        },
        {
          id: 'sync-action-right-1',
          path: pathname,
          side: 'right',
          order: 1,
          content: (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/80 px-3 py-1.5 font-mono text-xs backdrop-blur-md shadow-lg">
              <button
                type="button"
                onClick={() => addLog('order1:sync', 'Kütüphane anlık senkronize edildi', 'success')}
                className="cursor-pointer text-white/80 hover:text-cyan-300 transition-colors"
              >
                Şimdi Eşitle ⚡
              </button>
            </div>
          ),
        },
      );
    }

    // 3. Order 2: Navigation & Pagination Pair (Page Counter on Left + Next/Prev on Right)
    if (enableOrder2Pair) {
      entries.push(
        {
          id: 'pagination-info-left-2',
          path: pathname,
          side: 'left',
          order: 2,
          content: (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/80 px-3 py-1.5 font-mono text-xs text-white/80 backdrop-blur-md shadow-lg">
              <span>Sayfa: {pageNumber} / 10</span>
            </div>
          ),
        },
        {
          id: 'pagination-buttons-right-2',
          path: pathname,
          side: 'right',
          order: 2,
          content: (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1 backdrop-blur-md shadow-lg">
              <button
                type="button"
                disabled={pageNumber <= 1}
                onClick={() => {
                  setPageNumber((p) => Math.max(1, p - 1));
                  addLog('order2:page', `Önceki sayfa: ${pageNumber - 1}`);
                }}
                className="cursor-pointer rounded-lg px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-30"
              >
                ◀ Önceki
              </button>
              <button
                type="button"
                disabled={pageNumber >= 10}
                onClick={() => {
                  setPageNumber((p) => Math.min(10, p + 1));
                  addLog('order2:page', `Sonraki sayfa: ${pageNumber + 1}`);
                }}
                className="cursor-pointer rounded-lg px-2 py-1 text-xs text-white/70 hover:text-white disabled:opacity-30"
              >
                Sonraki ▶
              </button>
            </div>
          ),
        },
      );
    }

    // 4. Edge Case: Unpaired Left Orphan (Omitted by resolveControlsPairs rule!)
    if (enableUnpairedLeft) {
      entries.push({
        id: 'orphan-left-only',
        path: pathname,
        side: 'left',
        order: 99,
        content: (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 font-mono text-xs text-rose-300 shadow-lg">
            Yetim Sol Kontrol (Render Edilmemeli!)
          </div>
        ),
      });
    }

    // 5. Edge Case: Unpaired Right Orphan (Omitted by resolveControlsPairs rule!)
    if (enableUnpairedRight) {
      entries.push({
        id: 'orphan-right-only',
        path: pathname,
        side: 'right',
        order: 98,
        content: (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 font-mono text-xs text-amber-300 shadow-lg">
            Yetim Sağ Kontrol (Render Edilmemeli!)
          </div>
        ),
      });
    }

    // 6. Edge Case: Duplicate Order Conflict (Alphabetical tie-breaking test)
    if (enableDuplicateOrderConflict) {
      entries.push(
        {
          id: 'aaa-first-alphabetical-candidate',
          path: pathname,
          side: 'left',
          order: 0,
          content: (
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-2 py-1 font-mono text-xs text-cyan-300">
              AAA Kazanan (Alfabetik İlk)
            </div>
          ),
        },
        {
          id: 'zzz-second-alphabetical-candidate',
          path: pathname,
          side: 'left',
          order: 0,
          content: (
            <div className="rounded-xl border border-neutral-500/40 bg-neutral-500/20 px-2 py-1 font-mono text-xs text-neutral-400">
              ZZZ Kaybeden
            </div>
          ),
        },
      );
    }

    return entries;
  }, [
    pathname,
    enableOrder0Pair,
    enableOrder1Pair,
    enableOrder2Pair,
    enableUnpairedLeft,
    enableUnpairedRight,
    enableDuplicateOrderConflict,
    selectedFilter,
    selectedSort,
    viewMode,
    pageNumber,
  ]);

  // Publish active entries to Registry
  useControlsRegistration(registrationEntries.length > 0 ? registrationEntries : null, {
    source: 'controls-workbench',
  });

  // Calculate paired outcome for telemetry
  const resolvedPairs = useMemo(
    () => resolveControlsPairs(registrationEntries, pathname),
    [registrationEntries, pathname],
  );

  return (
    <div className="space-y-6">
      {/* Top Metrics Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill
            label="Geometri Montajı"
            value={layout ? (layout.isHidden ? 'Gizli (Hidden)' : 'Monte Edildi') : 'Anchor Bekleniyor'}
            variant={layout ? (layout.isHidden ? 'amber' : 'emerald') : 'neutral'}
          />
          <MetricPill
            label="Kayıtlı Girdiler"
            value={`${registrationEntries.length} Adet`}
            variant="indigo"
          />
          <MetricPill
            label="Çözümlenen Çiftler"
            value={`${resolvedPairs.left.length} Sol / ${resolvedPairs.right.length} Sağ`}
            variant={resolvedPairs.left.length > 0 ? 'emerald' : 'neutral'}
          />
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn
            size="xs"
            variant="neutral"
            icon="solar:refresh-bold"
            onClick={() => {
              setEnableOrder0Pair(true);
              setEnableOrder1Pair(false);
              setEnableOrder2Pair(false);
              setEnableUnpairedLeft(false);
              setEnableUnpairedRight(false);
              setEnableDuplicateOrderConflict(false);
              addLog('reset', 'Kontroller başlangıç çiftlerine sıfırlandı');
            }}
          >
            Varsayılana Dön
          </ActionBtn>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'demos', label: '1. Çift Ray İstifleme (Demos)', icon: 'solar:widget-add-bold' },
          { id: 'edge_cases', label: '2. Simetri & Yetim Kuralı (Edge Cases)', icon: 'solar:shield-warning-bold' },
          { id: 'code', label: '3. API & Kod Sözleşmesi', icon: 'solar:code-bold' },
        ]}
      />

      {/* TAB 1: DEMOS */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="info"
            title="Controls Modülü Çalışma Mantığı"
            description="Controls modülü, Nav dock'unun sol ve sağ kanatlarında çalışan sabit sayfa araç çubuklarıdır. Her katman eşit order değerine sahip bir sol ve sağ çiftten (pair) oluşur. Portal aracılığıyla body üzerine çizilir ve ResizeObserver ile Nav kartının konumunu takip eder."
          />

          <Section title="Ray İstifleme Senaryoları (Order 0, 1, 2)">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Order 0 Pair Card */}
              <DemoCard
                title="Order 0: Temel Filtre & Sıralama"
                badge="Zemin Katman"
                description="Sol tarafta film/dizi filtreleri, sağ tarafta popülerlik sıralama çubukları yer alır."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Aktif Durum:</span>
                    <StateBadge
                      label="Order 0"
                      value={enableOrder0Pair ? 'Açık' : 'Kapalı'}
                      variant={enableOrder0Pair ? 'success' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={enableOrder0Pair ? 'danger' : 'primary'}
                    onClick={() => {
                      setEnableOrder0Pair((p) => !p);
                      addLog('toggle:order0', `Order 0 çifti ${!enableOrder0Pair ? 'açıldı' : 'kapatıldı'}`);
                    }}
                  >
                    {enableOrder0Pair ? 'Çifti Kapat' : 'Order 0 Çiftini Aç'}
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Order 1 Pair Card */}
              <DemoCard
                title="Order 1: Görünüm & Eşitleme"
                badge="1. Katman"
                description="Order 0'ın üstüne istiflenir. Solda Izgara/Liste seçici, sağda 'Şimdi Eşitle' butonu bulunur."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Aktif Durum:</span>
                    <StateBadge
                      label="Order 1"
                      value={enableOrder1Pair ? 'Açık' : 'Kapalı'}
                      variant={enableOrder1Pair ? 'success' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={enableOrder1Pair ? 'danger' : 'primary'}
                    onClick={() => {
                      setEnableOrder1Pair((p) => !p);
                      addLog('toggle:order1', `Order 1 çifti ${!enableOrder1Pair ? 'açıldı' : 'kapatıldı'}`);
                    }}
                  >
                    {enableOrder1Pair ? 'Çifti Kapat' : 'Order 1 Çiftini Aç'}
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Order 2 Pair Card */}
              <DemoCard
                title="Order 2: Sayfalama (Pagination)"
                badge="2. Katman"
                description="En üst seviyeye eklenen sayfalama çubuğu. Solda sayfa numarası, sağda Önceki/Sonraki butonları."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Aktif Durum:</span>
                    <StateBadge
                      label="Order 2"
                      value={enableOrder2Pair ? 'Açık' : 'Kapalı'}
                      variant={enableOrder2Pair ? 'success' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={enableOrder2Pair ? 'danger' : 'primary'}
                    onClick={() => {
                      setEnableOrder2Pair((p) => !p);
                      addLog('toggle:order2', `Order 2 çifti ${!enableOrder2Pair ? 'açıldı' : 'kapatıldı'}`);
                    }}
                  >
                    {enableOrder2Pair ? 'Çifti Kapat' : 'Order 2 Çiftini Aç'}
                  </ActionBtn>
                </div>
              </DemoCard>
            </div>
          </Section>
        </div>
      )}

      {/* TAB 2: EDGE CASES */}
      {activeTab === 'edge_cases' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="warning"
            title="Simetri & Yetim Eleman Kuralları"
            description="Controls sistemi katı bir simetri kuralına sahiptir: Eğer bir ray (örneğin sadece Sol veya sadece Sağ) tek başına kaydedilmişse ve karşı tarafta aynı order değerine sahip bir eşi yoksa, görsel dengeyi korumak için ekrana HİÇ ÇİZİLMEZ."
          />

          <Section title="Yetim Kontrol & Çakışma Arenası">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Unpaired Left */}
              <DemoCard
                title="Yetim Sol Kontrol (Unpaired Left)"
                badge="Kural İhlali"
                description="Order 99 ile sadece sol tarafa kayıt yapılır. Karşı sağ eşi olmadığı için sistem tarafından bastırılır."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Yetim Kayıt:</span>
                    <StateBadge
                      label="Sol Yetim"
                      value={enableUnpairedLeft ? 'Kayıtlı' : 'Pasif'}
                      variant={enableUnpairedLeft ? 'danger' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={enableUnpairedLeft ? 'danger' : 'neutral'}
                    onClick={() => {
                      setEnableUnpairedLeft((p) => !p);
                      addLog('toggle:unpairedLeft', `Sol yetim ${!enableUnpairedLeft ? 'kaydedildi (Gizlenmeli)' : 'kaldırıldı'}`);
                    }}
                  >
                    {enableUnpairedLeft ? 'Yetimi Kaldır' : 'Yetim Sol Kaydet'}
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Unpaired Right */}
              <DemoCard
                title="Yetim Sağ Kontrol (Unpaired Right)"
                badge="Kural İhlali"
                description="Order 98 ile sadece sağ tarafa kayıt yapılır. Karşı sol eşi olmadığı için bastırılır."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Yetim Kayıt:</span>
                    <StateBadge
                      label="Sağ Yetim"
                      value={enableUnpairedRight ? 'Kayıtlı' : 'Pasif'}
                      variant={enableUnpairedRight ? 'danger' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={enableUnpairedRight ? 'danger' : 'neutral'}
                    onClick={() => {
                      setEnableUnpairedRight((p) => !p);
                      addLog('toggle:unpairedRight', `Sağ yetim ${!enableUnpairedRight ? 'kaydedildi (Gizlenmeli)' : 'kaldırıldı'}`);
                    }}
                  >
                    {enableUnpairedRight ? 'Yetimi Kaldır' : 'Yetim Sağ Kaydet'}
                  </ActionBtn>
                </div>
              </DemoCard>

              {/* Duplicate Order Tie-breaker */}
              <DemoCard
                title="Aynı Order Çakışması (Tie-breaker)"
                badge="Alfabetik ID Çözümü"
                description="Aynı order ve aynı side değerine sahip birden fazla eleman kaydedildiğinde ID'si alfabetik olarak önce gelen seçilir."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Çakışma Testi:</span>
                    <StateBadge
                      label="Çakışma"
                      value={enableDuplicateOrderConflict ? 'Aktif' : 'Pasif'}
                      variant={enableDuplicateOrderConflict ? 'info' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={enableDuplicateOrderConflict ? 'danger' : 'neutral'}
                    onClick={() => {
                      setEnableDuplicateOrderConflict((p) => !p);
                      addLog('toggle:conflict', `Alfabetik tie-break ${!enableDuplicateOrderConflict ? 'aktif edildi' : 'kapatıldı'}`);
                    }}
                  >
                    {enableDuplicateOrderConflict ? 'Çakışmayı Kaldır' : 'Alfabetik Çakışma Yarat'}
                  </ActionBtn>
                </div>
              </DemoCard>
            </div>
          </Section>

          <Section title="Controls Modülü Doğrulama Matrisi">
            <FeatureChecklist
              items={[
                { label: 'Simetrik Sol-Sağ çift zorunluluğu (row.left && row.right)', checked: true },
                { label: 'Eşleşmeyen yetim kontrollerin otomatik elenmesi', checked: true },
                { label: 'Order değerine göre aşağıdan yukarıya doğru istiflenme (order 0 zemin, 1 üstü...)', checked: true },
                { label: 'Aynı order ve side çakışmalarında alfabetik ID çözümleme (localeCompare)', checked: true },
                { label: 'Nav bar gizlendiğinde (data-controls-hidden) kontrollerin gizlenmesi', checked: true },
                { label: 'ResizeObserver ve MutationObserver ile akıcı geometri takibi', checked: true },
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
            description="Controls kayıtları her zaman sayfa rotası (pathname) bazlı olmalı ve hem sol hem de sağ bileşenleri eksiksiz içermelidir."
          />

          <CodeSnippet
            title="1. Sayfada Simetrik Kontrol Çifti Tanımlama"
            code={`import { usePathname } from 'next/navigation';
import { useControlsRegistration } from '@/modules/registry';

export default function MovieCatalogPage() {
  const pathname = usePathname();

  useControlsRegistration([
    {
      id: 'movie-filters-left',
      path: pathname,
      side: 'left',
      order: 0,
      content: (
        <div className="flex gap-1 bg-black/80 p-1 rounded-xl">
          <button>Aksiyon</button>
          <button>Dram</button>
        </div>
      ),
    },
    {
      id: 'movie-sort-right',
      path: pathname,
      side: 'right',
      order: 0,
      content: (
        <div className="flex gap-1 bg-black/80 p-1 rounded-xl">
          <button>En Yeni</button>
          <button>Popüler</button>
        </div>
      ),
    },
  ]);

  return <section>Film Listesi...</section>;
}`}
          />

          <CodeSnippet
            title="2. Çok Katmanlı Kontroller (Order 0 ve Order 1)"
            code={`// Order değeri büyüdükçe kontroller dikey olarak birikerek yukarı doğru istiflenir:
useControlsRegistration([
  // Alt Katman (Order 0)
  { id: 'cat-filter', path: pathname, side: 'left', order: 0, content: <CategoryFilter /> },
  { id: 'sort-select', path: pathname, side: 'right', order: 0, content: <SortSelect /> },

  // Üst Katman (Order 1)
  { id: 'view-toggle', path: pathname, side: 'left', order: 1, content: <ViewToggle /> },
  { id: 'batch-actions', path: pathname, side: 'right', order: 1, content: <BatchActions /> },
]);`}
          />
        </div>
      )}

      {/* Telemetry & State Viewer */}
      <Section title="Canlı Geometri & Çözümlenen Çiftler">
        <JsonViewer
          data={{
            duzenGeometrisi: layout,
            kayitliGirdiSayisi: registrationEntries.length,
            cozumlenenSolCiftler: resolvedPairs.left.map((c) => c.id),
            cozumlenenSagCiftler: resolvedPairs.right.map((c) => c.id),
            aktifYol: pathname,
          }}
          title="useControlsLayout() & resolveControlsPairs()"
        />
      </Section>

      {/* Log Console */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Kontrol Olay Günlüğü" />
    </div>
  );
}

