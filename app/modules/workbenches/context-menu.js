'use client';

import { useState } from 'react';
import { useContextMenu } from '@/modules/context-menu';
import { useContextMenuRegistration } from '@/modules/registry';
import { ActionBtn, JsonViewer, LogConsole, Section, StateBadge } from './shared';

export default function WorkbenchContextMenu() {
  const { isOpen, position, menuConfig, menuContext, menuItems, openMenu, closeMenu } =
    useContextMenu();

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

  // State for dynamic targets
  const [clickCount, setClickCount] = useState(0);
  const [allowMenuToOpen, setAllowMenuToOpen] = useState(true);

  // Register all 4 target configurations simultaneously via `menus` array
  // This ensures none of the targets overwrite each other in the registry!
  useContextMenuRegistration(
    {
      menus: [
        // 1. Hedef A: Film & Medya Kartı
        {
          target: '[data-menu-target="media-item"]',
          priority: 100,
          header: {
            title: 'Interstellar (Yıldızlararası)',
            eyebrow: 'Bilim Kurgu • 4K UHD',
            description: 'Christopher Nolan • 169 dakika',
            icon: 'solar:clapperboard-play-bold',
          },
          items: [
            {
              key: 'play',
              label: 'Filmi Başlat',
              icon: 'solar:play-bold',
              shortcut: 'BOŞLUK',
              onSelect: () => addLog('eylem:oynat', 'Interstellar oynatılıyor', 'success'),
            },
            {
              key: 'watchlist',
              label: 'İzleme Listeme Ekle',
              icon: 'solar:bookmark-bold',
              shortcut: '⌘W',
              onSelect: () => addLog('eylem:izleme-listesi', 'İzleme listesine eklendi', 'success'),
            },
            {
              key: 'favorite',
              label: 'Favorilere Ekle',
              icon: 'solar:heart-bold',
              shortcut: '⌘F',
              onSelect: () => addLog('eylem:favori', 'Favorilere eklendi', 'success'),
            },
            'separator',
            {
              key: 'share',
              label: 'Bağlantıyı Kopyala & Paylaş',
              icon: 'solar:share-bold',
              onSelect: () => addLog('eylem:paylas', 'Bağlantı panoya kopyalandı', 'info'),
            },
            'separator',
            {
              key: 'delete',
              label: 'Kütüphaneden Çıkar',
              icon: 'solar:trash-bin-trash-bold',
              danger: true,
              onSelect: () => addLog('eylem:sil', 'Film kütüphaneden çıkarıldı', 'error'),
            },
          ],
          onOpen: () => addLog('onOpen:hedefA', 'Hedef A (Medya Kartı) menüsü açıldı', 'info'),
          onClose: () => addLog('onClose:hedefA', 'Hedef A menüsü kapandı', 'info'),
        },

        // 2. Hedef B: Kısayollar ve Pasif Elemanlar
        {
          target: '[data-menu-target="doc-item"]',
          priority: 100,
          header: {
            title: 'Teknik Şartname Belgesi',
            eyebrow: 'Taslak • v2.4',
            description: 'Okuma ve yazma izni açık',
            icon: 'solar:document-text-bold',
          },
          items: [
            {
              key: 'open-doc',
              label: 'Belgeyi Aç',
              icon: 'solar:folder-open-bold',
              shortcut: 'ENTER',
              onSelect: () => addLog('eylem:belge-ac', 'Belge açıldı', 'success'),
            },
            {
              key: 'edit-doc',
              label: 'İçeriği Düzenle',
              icon: 'solar:pen-bold',
              shortcut: '⌘E',
              onSelect: () => addLog('eylem:duzenle', 'Düzenleme moduna geçildi', 'info'),
            },
            {
              key: 'locked-action',
              label: 'Yayına Al (Devre Dışı)',
              icon: 'solar:lock-bold',
              disabled: true,
              shortcut: '⌘P',
              onSelect: () => addLog('eylem:kilitli', 'Devre dışı buton tetiklenemez!', 'error'),
            },
            'separator',
            {
              key: 'duplicate',
              label: 'Bir Kopyasını Oluştur',
              icon: 'solar:copy-bold',
              shortcut: '⌘D',
              onSelect: () => addLog('eylem:kopyala', 'Belge kopyalandı', 'info'),
            },
          ],
          onOpen: () => addLog('onOpen:hedefB', 'Hedef B (Belge Kartı) menüsü açıldı', 'info'),
        },

        // 3. Hedef C: Dinamik Sayaç
        {
          target: '[data-menu-target="dynamic-item"]',
          priority: 100,
          header: () => ({
            title: `Dinamik Kart (Sayaç: ${clickCount})`,
            eyebrow: 'Bağlam Duyarlı',
            icon: 'solar:tuning-2-bold',
          }),
          items: () => [
            {
              key: 'increment',
              label: `Sayacı Artır (Şu an ${clickCount})`,
              icon: 'solar:add-circle-bold',
              closeOnSelect: false,
              onSelect: () => {
                setClickCount((c) => c + 1);
                addLog('eylem:sayac-artir', `Sayaç ${clickCount + 1} oldu`, 'success');
              },
            },
            {
              key: 'reset',
              label: 'Sayacı Sıfırla (0)',
              icon: 'solar:restart-bold',
              danger: true,
              onSelect: () => {
                setClickCount(0);
                addLog('eylem:sayac-sifirla', 'Sayaç sıfırlandı', 'info');
              },
            },
          ],
          onOpen: () =>
            addLog('onOpen:hedefC', `Hedef C menüsü açıldı (Sayaç: ${clickCount})`, 'info'),
        },

        // 4. Hedef D: onOpen Kapı Kontrolü
        {
          target: '[data-menu-target="intercepted-item"]',
          priority: 100,
          header: {
            title: 'Korumalı Hedef Kartı',
            eyebrow: 'Erişim Kapısı',
            icon: 'solar:shield-warning-bold',
          },
          items: [
            {
              key: 'confidential',
              label: 'Gizli Eylemi Yürüt',
              icon: 'solar:lock-keyhole-bold',
              onSelect: () => addLog('eylem:gizli-islem', 'Gizli işlem onaylandı', 'success'),
            },
          ],
          onOpen: () => {
            if (!allowMenuToOpen) {
              addLog(
                'onOpen:engellendi',
                'onOpen "false" döndürdüğü için menü açılmadı',
                'warning',
              );
              return false;
            }
            addLog('onOpen:izin-verildi', 'Erişim kapısı açık, menü açılıyor', 'success');
            return true;
          },
        },
      ],
    },
    { source: 'context-menu-workbench' },
  );

  // Programmatic Menu Trigger
  const handleProgrammaticOpen = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    addLog(
      'openMenu(programatik)',
      `Koordinat: (${Math.round(rect.right)}, ${Math.round(rect.bottom)})`,
    );
    openMenu(
      {
        header: {
          title: 'Programatik Açılan Menü',
          eyebrow: 'Geliştirici Testi',
          icon: 'solar:code-bold',
        },
        items: [
          {
            key: 'item-1',
            label: 'Birinci Eylem (Buton ile Açıldı)',
            icon: 'solar:bolt-bold',
            onSelect: () => addLog('programatik:eylem1', '1. Eylem seçildi', 'success'),
          },
          {
            key: 'item-2',
            label: 'İkinci Eylem',
            icon: 'solar:check-circle-bold',
            onSelect: () => addLog('programatik:eylem2', '2. Eylem seçildi', 'info'),
          },
        ],
      },
      rect.right + 8,
      rect.bottom + 8,
    );
  };

  const safeMenuContextSnapshot = {
    hedefSecici: menuContext?.targetSelector || null,
    sayfaBasligi: menuContext?.pageMeta?.title || null,
    aktifOgeVerisi: menuContext?.data ? Object.keys(menuContext.data) : null,
  };

  return (
    <div className="space-y-6">
      {/* Durum Özeti */}
      <Section
        title="Sağ Tık Menüsü Durumu"
        badge={isOpen ? 'Açık' : 'Kapalı'}
        actions={
          isOpen ? (
            <ActionBtn size="xs" onClick={closeMenu} variant="danger">
              Kapat
            </ActionBtn>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="Açık"
            value={isOpen ? 'Evet' : 'Hayır'}
            variant={isOpen ? 'success' : 'neutral'}
          />
          <StateBadge label="Konum" value={`X: ${position?.x || 0}, Y: ${position?.y || 0}`} />
          <StateBadge label="Eleman" value={menuItems?.length || 0} />
        </div>

        <JsonViewer
          data={{
            acikMi: isOpen,
            koordinat: position,
            menuBasligi: menuConfig?.header?.title || null,
            toplamEleman: menuItems?.length || 0,
            guvenliBaglam: safeMenuContextSnapshot,
          }}
          title="useContextMenu()"
        />
      </Section>

      {/* İnteraktif Sağ Tık Kartları */}
      <Section title="İnteraktif Sağ Tık Alanları">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Hedef 1 */}
          <div
            data-menu-target="media-item"
            className="cursor-context-menu rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 transition-colors select-none hover:bg-sky-500/10"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-white">
                Hedef A: Film & Medya Kartı
              </span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 font-mono text-xs text-sky-300">
                Sağ Tıkla
              </span>
            </div>
            <p className="mb-2 text-xs text-white/50">
              Interstellar • Özel başlık, ayırıcı çizgiler, tehlikeli işlem (kırmızı silme) ve
              kısayollar içerir
            </p>
            <div className="font-mono text-xs text-white/50">
              hedef: [data-menu-target=&quot;media-item&quot;]
            </div>
          </div>

          {/* Hedef 2 */}
          <div
            data-menu-target="doc-item"
            className="cursor-context-menu rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 transition-colors select-none hover:bg-purple-500/10"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-white">
                Hedef B: Kısayollar ve Pasif Elemanlar
              </span>
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-xs text-purple-300">
                Sağ Tıkla
              </span>
            </div>
            <p className="mb-2 text-xs text-white/50">
              Klavye gezintisi (Yukarı/Aşağı oklar pasif elemanları atlar, ESC kapatır). ⌘E, ⌘D gibi
              kısayollar
            </p>
            <div className="font-mono text-xs text-white/50">
              hedef: [data-menu-target=&quot;doc-item&quot;]
            </div>
          </div>

          {/* Hedef 3 */}
          <div
            data-menu-target="dynamic-item"
            onClick={() => setClickCount((c) => c + 1)}
            className="cursor-context-menu rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 transition-colors select-none hover:bg-amber-500/10"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-white">
                Hedef C: Dinamik Sayaç ({clickCount} Tıklama)
              </span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-xs text-amber-300">
                Sol / Sağ Tık
              </span>
            </div>
            <p className="mb-2 text-xs text-white/50">
              Canlı React state&apos;ini okur. Sol tık sayacı artırır, sağ tık menüsünden de menü
              kapanmadan artırılabilir
            </p>
            <div className="font-mono text-xs text-white/50">
              hedef: [data-menu-target=&quot;dynamic-item&quot;]
            </div>
          </div>

          {/* Hedef 4 */}
          <div
            data-menu-target="intercepted-item"
            className="cursor-context-menu rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 transition-colors select-none hover:bg-rose-500/10"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-white">
                Hedef D: onOpen Kapı Kontrolü
              </span>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-xs text-rose-300">
                Yetki Testi
              </span>
            </div>
            <p className="mb-3 text-xs text-white/50">
              Eğer kapı kapalıysa onOpen fonksiyonu false döner ve menü açılmaz
            </p>
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-white/70">
              <input
                type="checkbox"
                checked={allowMenuToOpen}
                onChange={(e) => setAllowMenuToOpen(e.target.checked)}
                className="cursor-pointer rounded border-white/10"
              />
              Menünün Açılmasına İzin Ver (onOpen Kontrolü)
            </label>
          </div>
        </div>
      </Section>

      {/* Programatik Çağrılar */}
      <Section title="Programatik Tetikleme">
        <div className="flex flex-wrap gap-2">
          <ActionBtn onClick={handleProgrammaticOpen} variant="primary" icon="solar:cursor-bold">
            Menüyü Aç
          </ActionBtn>
          <ActionBtn
            onClick={closeMenu}
            disabled={!isOpen}
            variant="danger"
            icon="solar:close-circle-bold"
          >
            Kapat
          </ActionBtn>
        </div>
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Logs" />
    </div>
  );
}
