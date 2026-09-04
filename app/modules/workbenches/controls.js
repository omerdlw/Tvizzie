'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useControlsLayout } from '@/modules/controls';
import { useControlsRegistration } from '@/modules/registry';
import { ActionBtn, JsonViewer, LogConsole, Section, StateBadge } from './shared';

export default function WorkbenchControls() {
  const pathname = usePathname();
  const layout = useControlsLayout();

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

  // Kontrol çiftleri anahtarları
  const [enableOrder0Pair, setEnableOrder0Pair] = useState(true);
  const [enableOrder1Pair, setEnableOrder1Pair] = useState(false);
  const [enableUnpairedLeft, setEnableUnpairedLeft] = useState(false);

  // Kontroller içindeki sahte filtre durumları
  const [selectedFilter, setSelectedFilter] = useState('Tümü');
  const [selectedSort, setSelectedSort] = useState('Popüler');

  // Aktif anahtarlara göre kayıt girdilerini oluştur
  const registrationEntries = [];

  // 1. Order 0 Simetrik Çift (Sol + Sağ Eşleşir)
  if (enableOrder0Pair) {
    registrationEntries.push(
      {
        id: 'filter-controls',
        path: pathname,
        side: 'left',
        order: 0,
        content: (
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1 backdrop-blur-md">
            {['Tümü', 'Filmler', 'Diziler'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setSelectedFilter(f);
                  addLog('kontrol:filtre', `Filtre seçimi: ${f}`, 'success');
                }}
                className={`cursor-pointer rounded-lg px-2 py-1 font-mono text-xs transition-colors ${
                  selectedFilter === f
                    ? 'bg-white font-semibold text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        ),
      },
      {
        id: 'sort-controls',
        path: pathname,
        side: 'right',
        order: 0,
        content: (
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/80 p-1 backdrop-blur-md">
            {['Popüler', 'Puan', 'En Yeni'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSelectedSort(s);
                  addLog('kontrol:siralama', `Sıralama seçimi: ${s}`, 'success');
                }}
                className={`cursor-pointer rounded-lg px-2 py-1 font-mono text-xs transition-colors ${
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

  // 2. Order 1 Simetrik Çift (Order 0'ın üstüne istiflenir)
  if (enableOrder1Pair) {
    registrationEntries.push(
      {
        id: 'view-mode-controls',
        path: pathname,
        side: 'left',
        order: 1,
        content: (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/80 px-3 py-1.5 font-mono text-xs text-white/70 backdrop-blur-md">
            <span>Izgara Görünümü</span>
          </div>
        ),
      },
      {
        id: 'refresh-action-controls',
        path: pathname,
        side: 'right',
        order: 1,
        content: (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/80 px-3 py-1.5 font-mono text-xs text-white/70 backdrop-blur-md">
            <button
              type="button"
              onClick={() => addLog('kontrol:senkronize', 'Kütüphane eşitlendi', 'info')}
              className="cursor-pointer transition-colors hover:text-sky-300"
            >
              Şimdi Eşitle
            </button>
          </div>
        ),
      },
    );
  }

  // 3. Eşleşmeyen Tek Başına Sol Kontrol (Eşleşme kuralı ihlali - Sistem bunu gizler)
  if (enableUnpairedLeft) {
    registrationEntries.push({
      id: 'unpaired-orphan-control',
      path: pathname,
      side: 'left',
      order: 2,
      content: (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/20 px-3 py-1.5 font-mono text-xs text-rose-300">
          Yetim Kontrol (Render edilmemeli!)
        </div>
      ),
    });
  }

  // useControlsRegistration ile Registry'e yayınlama
  useControlsRegistration(registrationEntries.length > 0 ? registrationEntries : null, {
    source: 'controls-workbench',
  });

  return (
    <div className="space-y-6">
      {/* Kontrol Geometrisi */}
      <Section
        title="Kontrol Geometrisi"
        badge={layout ? (layout.isHidden ? 'Gizli' : 'Monte Edildi') : 'Bağlı Değil'}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="Bağlı"
            value={Boolean(layout) ? 'Evet' : 'Hayır'}
            variant={layout ? 'success' : 'neutral'}
          />
          <StateBadge
            label="Gizli"
            value={layout?.isHidden ? 'Evet' : 'Hayır'}
            variant={layout?.isHidden ? 'warning' : 'neutral'}
          />
          <StateBadge label="Filtre" value={selectedFilter} variant="info" />
          <StateBadge label="Sıralama" value={selectedSort} variant="info" />
        </div>

        <JsonViewer
          data={{
            duzenGeometrisi: layout,
            kayitliOgeSayisi: registrationEntries.length,
            aktifYol: pathname,
          }}
          title="useControlsLayout()"
        />
      </Section>

      {/* Ray Eşleştirme */}
      <Section title="Ray Eşleştirme">
        <div className="space-y-3">
          {/* Çift 0 */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div>
              <div className="text-xs font-medium text-white">Order 0 Çifti</div>
              <div className="text-xs text-white/50">Filtre & Sıralama rayları</div>
            </div>
            <ActionBtn
              onClick={() => {
                setEnableOrder0Pair((prev) => !prev);
                addLog(
                  'toggle:order0',
                  `Order 0 çifti ${!enableOrder0Pair ? 'açıldı' : 'kapatıldı'}`,
                );
              }}
              variant={enableOrder0Pair ? 'primary' : 'default'}
              size="xs"
            >
              {enableOrder0Pair ? 'Aktif' : 'Kapalı'}
            </ActionBtn>
          </div>

          {/* Çift 1 */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div>
              <div className="text-xs font-medium text-white">Order 1 Çifti</div>
              <div className="text-xs text-white/50">Görünüm & Eşitleme</div>
            </div>
            <ActionBtn
              onClick={() => {
                setEnableOrder1Pair((prev) => !prev);
                addLog(
                  'toggle:order1',
                  `Order 1 çifti ${!enableOrder1Pair ? 'açıldı' : 'kapatıldı'}`,
                );
              }}
              variant={enableOrder1Pair ? 'primary' : 'default'}
              size="xs"
            >
              {enableOrder1Pair ? 'Aktif' : 'Kapalı'}
            </ActionBtn>
          </div>

          {/* Sınır Durumu: Yetim Kontrol */}
          <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
            <div>
              <div className="text-xs font-medium text-rose-300">Yetim Kontrol (Tek Taraflı)</div>
              <div className="text-xs text-rose-200/50">Simetrik eşi yoksa ekranda çizilmez</div>
            </div>
            <ActionBtn
              onClick={() => {
                setEnableUnpairedLeft((prev) => !prev);
                addLog(
                  'toggle:yetim',
                  `Yetim kontrol ${!enableUnpairedLeft ? 'kaydedildi' : 'kaldırıldı'}`,
                );
              }}
              variant={enableUnpairedLeft ? 'danger' : 'default'}
              size="xs"
            >
              {enableUnpairedLeft ? 'Kaydedildi' : 'Pasif'}
            </ActionBtn>
          </div>
        </div>
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Logs" />
    </div>
  );
}
