'use client';

import { useState } from 'react';
import { useContextMenu } from '@/modules/context-menu';
import { useContextMenuRegistration } from '@/modules/registry';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
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
} from './shared';

export default function WorkbenchContextMenu() {
  const [currentTab, setCurrentTab] = useState('demos');
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

  // Register all target configurations simultaneously via `menus` array
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

        // 2. Hedef B: Kullanıcı Profil Kartı
        {
          target: '[data-menu-target="user-item"]',
          priority: 100,
          header: {
            title: 'Ahmet Yılmaz (@ahmet)',
            eyebrow: 'Doğrulanmış Üye',
            description: 'Son görülme: 10 dk önce',
            icon: 'solar:user-circle-bold',
          },
          items: [
            {
              key: 'view-profile',
              label: 'Profili Görüntüle',
              icon: 'solar:user-bold',
              onSelect: () => addLog('eylem:profil', 'Kullanıcı profili açıldı', 'info'),
            },
            {
              key: 'send-dm',
              label: 'Doğrudan Mesaj Gönder',
              icon: 'solar:chat-round-dots-bold',
              onSelect: () => addLog('eylem:mesaj', 'Sohbet penceresi açıldı', 'success'),
            },
            'separator',
            {
              key: 'change-role',
              label: 'Rol Değiştir (Yönetici Yap)',
              icon: 'solar:shield-up-bold',
              onSelect: () => addLog('eylem:rol', 'Rol yönetici olarak güncellendi', 'warning'),
            },
            {
              key: 'block-user',
              label: 'Kullanıcıyı Engelle',
              icon: 'solar:user-block-bold',
              danger: true,
              onSelect: () => addLog('eylem:engelle', 'Kullanıcı engellendi', 'error'),
            },
          ],
        },

        // 3. Hedef C: Müzik / Çalma Listesi Satırı
        {
          target: '[data-menu-target="audio-item"]',
          priority: 100,
          header: {
            title: 'Cornfield Chase (Hans Zimmer)',
            eyebrow: 'Orijinal Film Müziği',
            icon: 'solar:music-note-bold',
          },
          items: [
            {
              key: 'play-next',
              label: 'Sıradakine Ekle',
              icon: 'solar:playlist-minimalistic-bold',
              shortcut: '⌘N',
              onSelect: () => addLog('eylem:muzik-kuyruk', 'Çalma sırasına eklendi', 'success'),
            },
            {
              key: 'download-offline',
              label: 'Çevrimdışı İndir (FLAC)',
              icon: 'solar:download-bold',
              onSelect: () => addLog('eylem:indir', 'Kayıpsız parça indiriliyor', 'info'),
            },
          ],
        },

        // 4. Hedef D: Dosya / Kod Ağacı
        {
          target: '[data-menu-target="file-item"]',
          priority: 100,
          header: {
            title: 'app/modules/page.js',
            eyebrow: 'TypeScript / React',
            icon: 'solar:document-text-bold',
          },
          items: [
            {
              key: 'open-editor',
              label: 'Düzenleyicide Aç',
              icon: 'solar:pen-bold',
              shortcut: 'ENTER',
              onSelect: () => addLog('eylem:dosya-ac', 'Dosya düzenleyicide açıldı', 'success'),
            },
            {
              key: 'copy-path',
              label: 'Tam Dosya Yolunu Kopyala',
              icon: 'solar:copy-bold',
              shortcut: '⌘C',
              onSelect: () => addLog('eylem:dosya-yol', 'Yol panoya kopyalandı', 'info'),
            },
            {
              key: 'locked-action',
              label: 'Git ile İt (Yetki Yok)',
              icon: 'solar:lock-bold',
              disabled: true,
              shortcut: '⌘P',
              onSelect: () => addLog('eylem:kilitli', 'Devre dışı buton tetiklenemez!', 'error'),
            },
            'separator',
            {
              key: 'delete-file',
              label: 'Dosyayı Sil',
              icon: 'solar:trash-bin-trash-bold',
              danger: true,
              onSelect: () => addLog('eylem:dosya-sil', 'Dosya silindi', 'error'),
            },
          ],
        },

        // 5. Hedef E: İç İçe Öncelik Testi (Dış Kapsayıcı: Öncelik 100)
        {
          target: '[data-menu-target="priority-container"]',
          priority: 100,
          header: {
            title: 'Dış Kapsayıcı Menüsü (Öncelik: 100)',
            icon: 'solar:box-bold',
          },
          items: [
            {
              key: 'container-action',
              label: 'Kapsayıcı Düzeyinde İşlem',
              onSelect: () => addLog('oncelik:dis', 'Dış kapsayıcı eylemi tetiklendi', 'info'),
            },
          ],
        },

        // 6. Hedef F: İç İçe Öncelik Testi (İç Rozet: Öncelik 200 - Kazanır!)
        {
          target: '[data-menu-target="priority-child"]',
          priority: 200,
          header: {
            title: 'Özel İç Rozet Menüsü (Öncelik: 200 - KAZANIR)',
            icon: 'solar:star-bold',
          },
          items: [
            {
              key: 'child-action',
              label: 'Yüksek Öncelikli İç Eleman Eylemi',
              icon: 'solar:crown-bold',
              onSelect: () => addLog('oncelik:ic', 'Yüksek öncelikli iç eylem kazandı!', 'success'),
            },
          ],
        },

        // 7. Hedef G: onOpen Kapı Kontrolü
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
                'onOpen "false" döndürdüğü için menünün açılması engellendi',
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

  return (
    <div className="space-y-6">
      {/* Üst Sekmeler */}
      <SegmentedTabs
        tabs={[
          { id: 'demos', label: 'İnteraktif Kartlar', icon: 'solar:menu-dots-square-bold', badge: '4' },
          { id: 'edge_cases', label: 'Öncelik & Güvenlik Testleri', icon: 'solar:shield-check-bold', badge: '3' },
          { id: 'code', label: 'API & Kod Örnekleri', icon: 'solar:code-bold' },
        ]}
        activeTab={currentTab}
        onChange={setCurrentTab}
      />

      {/* Durum Özeti */}
      <Section
        title="Sağ Tık Menüsü Durumu"
        badge={isOpen ? 'Menü Açık' : 'Menü Kapalı'}
        actions={
          isOpen ? (
            <ActionBtn size="xs" onClick={closeMenu} variant="danger">
              Menüyü Kapat
            </ActionBtn>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StateBadge
            label="Açık mı"
            value={isOpen ? 'Evet' : 'Hayır'}
            variant={isOpen ? 'success' : 'neutral'}
          />
          <StateBadge label="Koordinat" value={`X: ${position?.x || 0}, Y: ${position?.y || 0}`} />
          <StateBadge label="Eleman Sayısı" value={menuItems?.length || 0} variant="info" />
          <StateBadge label="Aktif Hedef" value={menuContext?.targetSelector || 'Yok'} />
        </div>

        <JsonViewer
          data={{
            isOpen,
            position,
            header: menuConfig?.header,
            itemCount: menuItems?.length || 0,
            menuContext,
          }}
          title="useContextMenu() Durum Verisi"
        />
      </Section>

      {/* SEKME 1: İNTERAKTİF KARTLAR */}
      {currentTab === 'demos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Hedef 1: Medya Kartı */}
            <div
              data-menu-target="media-item"
              className="group cursor-context-menu rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 transition-all select-none hover:border-sky-500/40 hover:bg-sky-500/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                    <Icon icon="solar:clapperboard-play-bold" size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Interstellar (4K UHD)</div>
                    <div className="text-xs text-white/50">Christopher Nolan • 169 dakika</div>
                  </div>
                </div>
                <span className="rounded-lg border border-sky-500/30 bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] text-sky-300">
                  Sağ Tıkla 🖱️
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/70">
                Özel başlık, klavye kısayolları (⌘W, ⌘F), ayırıcı çizgiler ve tehlikeli kırmızı silme işlemi barındırır.
              </p>
            </div>

            {/* Hedef 2: Kullanıcı Profil Kartı */}
            <div
              data-menu-target="user-item"
              className="group cursor-context-menu rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 transition-all select-none hover:border-emerald-500/40 hover:bg-emerald-500/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Icon icon="solar:user-circle-bold" size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Ahmet Yılmaz (@ahmet)</div>
                    <div className="text-xs text-white/50">Kullanıcı Yönetim Menüsü</div>
                  </div>
                </div>
                <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                  Sağ Tıkla 🖱️
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/70">
                Profil görüntüleme, DM gönderme, rol yönetimi ve kırmızı engelleme aksiyonu içerir.
              </p>
            </div>

            {/* Hedef 3: Müzik Parçası */}
            <div
              data-menu-target="audio-item"
              className="group cursor-context-menu rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 transition-all select-none hover:border-purple-500/40 hover:bg-purple-500/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                    <Icon icon="solar:music-note-bold" size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Cornfield Chase</div>
                    <div className="text-xs text-white/50">Hans Zimmer • Film Müziği</div>
                  </div>
                </div>
                <span className="rounded-lg border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 font-mono text-[10px] text-purple-300">
                  Sağ Tıkla 🖱️
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/70">
                Çalma sırasına ekleme (⌘N) ve yüksek çözünürlüklü çevrimdışı indirme seçenekleri sunar.
              </p>
            </div>

            {/* Hedef 4: Dosya / Kod Ağacı */}
            <div
              data-menu-target="file-item"
              className="group cursor-context-menu rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 transition-all select-none hover:border-amber-500/40 hover:bg-amber-500/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                    <Icon icon="solar:document-text-bold" size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">app/modules/page.js</div>
                    <div className="text-xs text-white/50">IDE / Dosya Menüsü</div>
                  </div>
                </div>
                <span className="rounded-lg border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                  Sağ Tıkla 🖱️
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/70">
                Dosyayı açma (ENTER), yolu kopyalama (⌘C), yetkisiz devre dışı işlem ve güvenli silme.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
            <div className="text-xs text-white/60">
              Menüyü fare koordinatlarıyla programatik olarak koddan açma:
            </div>
            <ActionBtn onClick={handleProgrammaticOpen} variant="primary" icon="solar:cursor-bold">
              Programatik Menüyü Aç
            </ActionBtn>
          </div>
        </div>
      )}

      {/* SEKME 2: ÖNCELİK & GÜVENLİK TESTLERİ */}
      {currentTab === 'edge_cases' && (
        <div className="space-y-4">
          <NoticeBanner
            title="Öncelik Çözümlemesi (Priority Resolution)"
            description="İç içe geçmiş DOM elemanlarında birden fazla hedef eşleşirse, Tvizzie en yüksek öncelik (priority) değerine sahip menüyü açar."
            variant="info"
            icon="solar:crown-bold"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* İç İçe Öncelik Arenası */}
            <div
              data-menu-target="priority-container"
              className="cursor-context-menu rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-5 select-none"
            >
              <div className="text-xs font-semibold text-white">
                Dış Kapsayıcı Alanı (Öncelik: 100)
              </div>
              <p className="mt-1 text-[11px] text-white/50">
                Buraya sağ tıklandığında dış kapsayıcının standart menüsü açılır.
              </p>

              <div
                data-menu-target="priority-child"
                className="mt-4 flex cursor-context-menu items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
              >
                <div className="flex items-center gap-2">
                  <Icon icon="solar:star-bold" className="text-amber-400" size={16} />
                  <span className="text-xs font-bold text-amber-200">
                    Özel İç Rozet (Öncelik: 200 - KAZANIR)
                  </span>
                </div>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                  Rozete Sağ Tıkla
                </span>
              </div>
            </div>

            {/* onOpen Kapı Kontrolü */}
            <div
              data-menu-target="intercepted-item"
              className="cursor-context-menu rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 select-none"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-rose-300">
                  onOpen Yetki Kapısı Testi
                </div>
                <span className="rounded bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                  Yetki Testi
                </span>
              </div>
              <p className="mt-1 text-xs text-white/50">
                Eğer aşağıdaki onay kutusu kapalıysa <code>onOpen</code> fonksiyonu <code>false</code> döner ve sağ tık menüsü engellenir.
              </p>
              <label className="mt-4 flex cursor-pointer items-center gap-2 font-mono text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={allowMenuToOpen}
                  onChange={(e) => setAllowMenuToOpen(e.target.checked)}
                  className="size-4 cursor-pointer rounded border-white/10"
                />
                <span>Menünün açılmasına izin ver (onOpen: true)</span>
              </label>
            </div>
          </div>

          <Section title="Sağ Tık Modülü Yetenek Matrisi">
            <FeatureChecklist
              features={[
                { name: 'Selector Targeting', desc: 'CSS seçicisi ile DOM elemanlarını otomatik hedefleme', tested: true },
                { name: 'Priority Resolution', desc: 'İç içe hedeflerde en yüksek priority değerini seçme', tested: true },
                { name: 'Keyboard Navigation', desc: 'Yukarı/aşağı oklar ve ESC ile erişilebilir klavye kontrolü', tested: true },
                { name: 'Custom Header & Icons', desc: 'Menü başlığında görsel, açıklama ve rozet sunma', tested: true },
                { name: 'Disabled & Danger Items', desc: 'Pasif butonları atlama ve tehlikeli kırmızı stil', tested: true },
                { name: 'Programmatic openMenu', desc: 'Koordinat vererek koddan menü tetikleme', tested: true },
              ]}
            />
          </Section>
        </div>
      )}

      {/* SEKME 3: APİ & KOD ÖRNEKLERİ */}
      {currentTab === 'code' && (
        <div className="space-y-4">
          <CodeSnippet
            title="1. Sağ Tık Menüsü Tanımlama ve Kaydetme"
            code={`import { useContextMenuRegistration } from '@/modules/registry';

function MovieGrid() {
  useContextMenuRegistration(
    {
      menus: [
        {
          target: '[data-movie-id]',
          priority: 150,
          header: {
            title: 'Film Seçenekleri',
            icon: 'solar:clapperboard-play-bold',
          },
          items: [
            {
              key: 'play',
              label: 'Oynat',
              icon: 'solar:play-bold',
              shortcut: 'BOŞLUK',
              onSelect: ({ target }) => {
                const id = target.getAttribute('data-movie-id');
                playMovie(id);
              },
            },
            'separator',
            {
              key: 'remove',
              label: 'Listeden Çıkar',
              danger: true,
              onSelect: ({ target }) => removeMovie(target.dataset.movieId),
            },
          ],
        },
      ],
    },
    { source: 'movie-grid-page' }
  );

  return <div>Filmler...</div>;
}`}
          />

          <CodeSnippet
            title="2. Programatik Menü Açma (openMenu)"
            code={`import { useContextMenu } from '@/modules/context-menu';

function ActionButton() {
  const { openMenu } = useContextMenu();

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    openMenu(
      {
        header: { title: 'Hızlı Eylemler' },
        items: [
          { key: 'export', label: 'Dışa Aktar', onSelect: handleExport },
        ],
      },
      rect.right + 4,
      rect.bottom + 4
    );
  };

  return <Button onClick={handleClick}>Menü</Button>;
}`}
          />
        </div>
      )}

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Sağ Tık Menüsü Olay Günlüğü" />
    </div>
  );
}

