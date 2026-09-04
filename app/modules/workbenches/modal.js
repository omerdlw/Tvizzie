'use client';

import { useState } from 'react';
import {
  MODAL_CHROME,
  MODAL_POSITIONS,
  ModalContainer,
  useModal,
  useModalActions,
} from '@/modules/modal';
import { useModalRegistration } from '@/modules/registry';
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
  SelectInput,
  StateBadge,
  TextInput,
} from './shared';

// ── 1. Sinematik Medya Detay Modalı ──────────────────────────────────────────
function TestMediaModal({ close, data }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const media = data || {
    title: 'Interstellar (Yıldızlararası)',
    year: '2014',
    rating: '8.7',
    genre: 'Bilim Kurgu • Macera',
    duration: '169 dk',
    overview:
      'İnsanlığın son günlerinde, eski bir NASA pilotu olan Cooper ve bir araştırma ekibi, yaşanabilir yeni bir gezegen bulmak için solucan deliğinden geçer.',
    backdrop: 'https://image.tmdb.org/t/p/original/rAiYTnrLEhvF7zIjIzoHaDuSIu.jpg',
  };

  return (
    <ModalContainer
      header={{
        title: media.title,
        showClose: true,
        actions: (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              onClick={() => setIsFavorited((prev) => !prev)}
              className="cursor-pointer rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title="Favorilere Ekle"
            >
              <Icon
                icon={isFavorited ? 'solar:heart-bold' : 'solar:heart-linear'}
                size={16}
                className={isFavorited ? 'text-rose-500' : ''}
              />
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined') navigator.clipboard?.writeText(window.location.href);
              }}
              className="cursor-pointer rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              title="Bağlantıyı Paylaş"
            >
              <Icon icon="solar:share-bold" size={16} />
            </Button>
          </div>
        ),
      }}
      footer={{
        left: (
          <span className="font-mono text-[11px] text-white/50">
            IMDb: <strong className="text-amber-400">★ {media.rating}</strong> ({media.year})
          </span>
        ),
        right: (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => close({ action: 'dismissed' })}
              className="cursor-pointer rounded-lg px-3 py-1.5 font-mono text-xs text-white/70 hover:text-white"
            >
              Kapat
            </Button>
            <Button
              type="button"
              onClick={() => close({ action: 'play', mediaId: media.id || 'interstellar' })}
              className="cursor-pointer rounded-lg bg-white px-3.5 py-1.5 font-mono text-xs font-semibold text-black transition-opacity hover:opacity-90"
            >
              Oynatmaya Başla
            </Button>
          </div>
        ),
      }}
      close={close}
    >
      <div className="space-y-3 p-4 font-sans text-xs">
        <div
          className="relative h-36 w-full overflow-hidden rounded-xl bg-cover bg-center"
          style={{ backgroundImage: `url(${media.backdrop})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-2.5 left-3">
            <span className="rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-md">
              {media.genre} • {media.duration}
            </span>
          </div>
        </div>
        <p className="leading-relaxed text-white/70">{media.overview}</p>
      </div>
    </ModalContainer>
  );
}

// ── 2. Çerçevesiz (Bare Chrome) Video Oynatıcı Modalı ──────────────────────────
function TestBareVideoModal({ close, data }) {
  return (
    <div className="relative w-[90vw] max-w-2xl overflow-hidden rounded-2xl border border-white/20 bg-black/90 shadow-2xl backdrop-blur-2xl">
      <div className="relative aspect-video w-full bg-black">
        <video
          src={data?.videoSrc || '/video.mp4'}
          autoPlay
          controls
          className="h-full w-full object-cover"
        />
        <Button
          type="button"
          onClick={() => close({ playbackTime: 42, completed: true })}
          className="absolute top-3 right-3 z-20 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md transition-transform hover:scale-110"
          title="Kapat"
        >
          <Icon icon="solar:close-circle-bold" size={20} />
        </Button>
      </div>
      <div className="flex items-center justify-between border-t border-white/10 p-3 text-xs text-white/70">
        <div className="font-mono text-[11px] text-white/50">
          MODAL_CHROME.BARE: Panel çerçevesi olmaksızın tam video yüzeyi.
        </div>
        <ActionBtn size="xs" onClick={() => close({ action: 'closed' })}>
          Kapat
        </ActionBtn>
      </div>
    </div>
  );
}

// ── 3. Çok Katmanlı İç İçe Yığın (Nested Stack: 3 Katman) ─────────────────────
function TestNestedLayerModal({ close, data }) {
  const { openModal } = useModalActions();
  const currentLayer = data?.layer || 1;

  const handleOpenNextLayer = () => {
    openModal('TEST_NESTED_LAYER_MODAL', MODAL_POSITIONS.CENTER, {
      data: {
        layer: currentLayer + 1,
        title: `Katman #${currentLayer + 1} - Güvenlik Onayı`,
      },
    });
  };

  return (
    <ModalContainer
      header={{
        title: data?.title || `Yığın Katmanı #${currentLayer}`,
        showClose: true,
      }}
      footer={{
        left: (
          <span className="font-mono text-[11px] text-white/40">
            Aktif Yığın Derinliği: {currentLayer}
          </span>
        ),
        right: (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => close({ layer: currentLayer, action: 'closed_single' })}
              className="cursor-pointer rounded-lg px-3 py-1.5 font-mono text-xs text-white/70 hover:text-white"
            >
              Bu Katmanı Kapat
            </Button>
            {currentLayer < 3 ? (
              <Button
                type="button"
                onClick={handleOpenNextLayer}
                className="cursor-pointer rounded-lg bg-emerald-500 px-3.5 py-1.5 font-mono text-xs font-semibold text-black"
              >
                Katman {currentLayer + 1}&apos;i Üste Aç
              </Button>
            ) : (
              <span className="font-mono text-xs text-amber-400">Maksimum Derinlik (3)</span>
            )}
          </div>
        ),
      }}
      close={close}
    >
      <div className="space-y-3 p-4 font-mono text-xs text-white/70">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="font-semibold text-white">Katman #{currentLayer} Çalışıyor</div>
          <p className="mt-1 text-white/50 text-[11px] leading-relaxed">
            Tvizzie Modal Modülü her yeni katmanı yığına ekler. ESC tuşuna veya dış backdrop&apos;a
            basıldığında yalnız EN ÜSTTEKİ katman kapanır. Alttaki katmanlar durumunu korur.
          </p>
        </div>
      </div>
    </ModalContainer>
  );
}

// ── 4. Değer Döndüren Form Modalı ─────────────────────────────────────────────
function TestFormReturnModal({ close }) {
  const [userName, setUserName] = useState('Omer Dilek');
  const [userRole, setUserRole] = useState('Yönetici');

  return (
    <ModalContainer
      header={{
        title: 'Kullanıcı Bilgileri Formu (Promise Return)',
        showClose: true,
      }}
      footer={{
        left: (
          <span className="font-mono text-[11px] text-white/40">
            openModal() sonucuna döner
          </span>
        ),
        right: (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => close(null)}
              className="cursor-pointer rounded-lg px-3 py-1.5 font-mono text-xs text-white/70 hover:text-white"
            >
              İptal
            </Button>
            <Button
              type="button"
              onClick={() => close({ confirmed: true, name: userName, role: userRole, updatedAt: Date.now() })}
              className="cursor-pointer rounded-lg bg-white px-3.5 py-1.5 font-mono text-xs font-semibold text-black"
            >
              Formu Onayla ve Gönder
            </Button>
          </div>
        ),
      }}
      close={close}
    >
      <div className="space-y-3 p-4 font-mono text-xs">
        <TextInput label="Kullanıcı Adı" value={userName} onChange={setUserName} />
        <SelectInput
          label="Rol"
          value={userRole}
          onChange={setUserRole}
          options={[
            { value: 'Yönetici', label: 'Yönetici (Admin)' },
            { value: 'Editör', label: 'İçerik Editörü' },
            { value: 'İzleyici', label: 'Standart İzleyici' },
          ]}
        />
      </div>
    </ModalContainer>
  );
}

// ── 5. Responsive Drawer/Sheet Modalı ──────────────────────────────────────────
function TestResponsiveDrawerModal({ close }) {
  return (
    <ModalContainer
      header={{
        title: 'Duyarlı Çekmece (Mobile: Bottom, Desktop: Right)',
        showClose: true,
      }}
      footer={{
        right: (
          <Button
            type="button"
            onClick={() => close({ drawerConfirmed: true })}
            className="cursor-pointer rounded-lg bg-white px-3.5 py-1.5 font-mono text-xs font-semibold text-black"
          >
            Tamamla
          </Button>
        ),
      }}
      close={close}
    >
      <div className="space-y-3 p-4 font-mono text-xs text-white/70">
        <p>
          Ekran boyutunuz mobil ise ekranın altından bir çekmece (Bottom Sheet) olarak açılır.
          Masaüstünde ise ekranın sağından kayan bir panel (Slide-over Sheet) olarak konumlanır.
        </p>
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-sky-200 text-[11px]">
          Sözleşme: <code>openModal(type, &#123; mobile: &apos;bottom&apos;, desktop: &apos;right&apos; &#125;)</code>
        </div>
      </div>
    </ModalContainer>
  );
}

export default function WorkbenchModal() {
  const [currentTab, setCurrentTab] = useState('demos');
  const { modalStack = [], isOpen, activeModalId, modalType } = useModal();
  const { openModal, closeModal, closeAllModals } = useModalActions();

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

  const [selectedPosition, setSelectedPosition] = useState(MODAL_POSITIONS.CENTER);
  const [customModalTitle, setCustomModalTitle] = useState('İnteraktif Test Modalı');
  const [lastReturnedPromiseValue, setLastReturnedPromiseValue] = useState(null);

  // Test modallarını Registry'e kaydet
  useModalRegistration(
    {
      TEST_MEDIA_MODAL: TestMediaModal,
      TEST_BARE_VIDEO_MODAL: TestBareVideoModal,
      TEST_NESTED_LAYER_MODAL: TestNestedLayerModal,
      TEST_FORM_RETURN_MODAL: TestFormReturnModal,
      TEST_RESPONSIVE_DRAWER_MODAL: TestResponsiveDrawerModal,
    },
    { source: 'modal-workbench' },
  );

  // 1. Sinematik Medya Modalı Aç
  const handleOpenMediaModal = async () => {
    try {
      addLog('openModal(media)', 'Sinematik Medya Modalı açılıyor...');
      const result = await openModal('TEST_MEDIA_MODAL', selectedPosition, {
        data: {
          id: 'interstellar-4k',
          title: 'Interstellar (Yıldızlararası)',
          rating: '8.7',
          year: '2014',
          duration: '169 dk',
          genre: 'Bilim Kurgu • Macera',
          overview:
            'Dünya yaşanamaz hale geldiğinde, insanlığın yeni bir yuva bulması için bir grup cesur astronot solucan deliğinde yolculuğa çıkar.',
          backdrop: 'https://image.tmdb.org/t/p/original/rAiYTnrLEhvF7zIjIzoHaDuSIu.jpg',
        },
      });
      setLastReturnedPromiseValue(result);
      addLog('openModal:sonuc', result || 'Kapatıldı', 'success');
    } catch (err) {
      addLog('openModal:hata', err.message, 'error');
    }
  };

  // 2. Çerçevesiz Video Modalı Aç
  const handleOpenBareVideo = async () => {
    try {
      addLog('openModal(bareVideo)', 'Çerçevesiz (Bare Chrome) Video Modalı açılıyor...');
      const result = await openModal('TEST_BARE_VIDEO_MODAL', MODAL_POSITIONS.CENTER, {
        chrome: MODAL_CHROME.BARE,
        data: { videoSrc: '/video.mp4' },
      });
      setLastReturnedPromiseValue(result);
      addLog('openModal:sonuc', result || 'Video modal kapatıldı', 'success');
    } catch (err) {
      addLog('openModal:hata', err.message, 'error');
    }
  };

  // 3. Çok Katmanlı İç İçe Modal Aç
  const handleOpenNestedStack = async () => {
    try {
      addLog('openModal(stack)', '1. Katman açılıyor (İç içe modal zinciri)...');
      const result = await openModal('TEST_NESTED_LAYER_MODAL', MODAL_POSITIONS.CENTER, {
        data: { layer: 1, title: 'Katman #1 - İşlem Başlat' },
      });
      setLastReturnedPromiseValue(result);
      addLog('openModal:sonuc', result || 'Zincir kapatıldı', 'success');
    } catch (err) {
      addLog('openModal:hata', err.message, 'error');
    }
  };

  // 4. Form Modalı Aç (Promise Return)
  const handleOpenFormModal = async () => {
    try {
      addLog('openModal(form)', 'Form Modalı açılıyor (Promise ile değer dönecek)...');
      const result = await openModal('TEST_FORM_RETURN_MODAL', MODAL_POSITIONS.CENTER);
      setLastReturnedPromiseValue(result);
      addLog('openModal:sonuc', result || 'Form iptal edildi', 'success');
    } catch (err) {
      addLog('openModal:hata', err.message, 'error');
    }
  };

  // 5. Duyarlı Çekmece / Sheet Aç
  const handleOpenResponsiveDrawer = async () => {
    try {
      addLog('openModal(duyarli)', 'Duyarlı Çekmece açılıyor (Mobile: Bottom, Desktop: Right)...');
      const result = await openModal(
        'TEST_RESPONSIVE_DRAWER_MODAL',
        { mobile: MODAL_POSITIONS.BOTTOM, desktop: MODAL_POSITIONS.RIGHT },
      );
      setLastReturnedPromiseValue(result);
      addLog('openModal:sonuc', result || 'Çekmece kapatıldı', 'success');
    } catch (err) {
      addLog('openModal:hata', err.message, 'error');
    }
  };

  // ── Uç Durum Testleri ──────────────────────────────────────────────────────
  // 1. Aynı modal tipini üst üste çağırma (Deduplication / Null Return Testi)
  const handleTestSameTypeDedupe = async () => {
    addLog('test:dedupe', 'Aynı modal tipi art arda 2 kez çağrılıyor...');
    // İlk çağrı
    openModal('TEST_MEDIA_MODAL', MODAL_POSITIONS.CENTER);
    // Anında ikinci çağrı
    const secondCall = await openModal('TEST_MEDIA_MODAL', MODAL_POSITIONS.CENTER);
    addLog(
      'test:dedupeSonuc',
      secondCall === null
        ? 'BAŞARILI: İkinci çağrı kural gereği null ile çözüldü (Deduplication devrede)'
        : 'Beklenmeyen sonuç: ' + JSON.stringify(secondCall),
      secondCall === null ? 'success' : 'error',
    );
  };

  // 2. Tümünü Kapat Testi
  const handleTestCloseAll = () => {
    closeAllModals({ sebep: 'toplu_kapatma', zaman: Date.now() });
    addLog('closeAllModals', 'Yığındaki tüm modallar tek hamlede kapatıldı', 'warning');
  };

  return (
    <div className="space-y-6">
      {/* Üst Sekmeler */}
      <SegmentedTabs
        tabs={[
          { id: 'demos', label: 'İnteraktif Demolar', icon: 'solar:play-circle-bold', badge: '5' },
          { id: 'edge_cases', label: 'Uç Durumlar & Kurallar', icon: 'solar:shield-check-bold', badge: '4' },
          { id: 'code', label: 'API & Kod Örnekleri', icon: 'solar:code-bold' },
        ]}
        activeTab={currentTab}
        onChange={setCurrentTab}
      />

      {/* Canlı Modal Durumu Paneli */}
      <Section
        title="Canlı Modal Durumu & Yığın Takibi"
        badge={isOpen ? `${modalStack.length} Katman Aktif` : 'Yığın Boş'}
        actions={
          isOpen ? (
            <div className="flex items-center gap-1.5">
              <ActionBtn size="xs" onClick={() => closeModal({ manuel: true })} variant="danger">
                En Üsttekini Kapat
              </ActionBtn>
              <ActionBtn size="xs" onClick={handleTestCloseAll} variant="danger">
                Tümünü Kapat ({modalStack.length})
              </ActionBtn>
            </div>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StateBadge label="Açık mı" value={isOpen ? 'Evet' : 'Hayır'} variant={isOpen ? 'success' : 'neutral'} />
          <StateBadge label="Yığın Derinliği" value={modalStack.length} variant={modalStack.length > 1 ? 'purple' : 'neutral'} />
          <StateBadge label="Aktif Tür" value={modalType || '—'} variant="info" />
          <StateBadge label="Aktif ID" value={activeModalId || '—'} />
        </div>

        <JsonViewer
          data={{
            isOpen,
            stackDepth: modalStack.length,
            activeModalId,
            modalType,
            stackItems: modalStack.map((m) => ({
              id: m.id,
              type: m.modalType,
              position: m.position,
            })),
            lastReturnedPromiseValue,
          }}
          title="useModal() Durum Özeti"
        />
      </Section>

      {/* SEKME 1: İNTERAKTİF DEMOLAR */}
      {currentTab === 'demos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DemoCard
              title="Sinematik Medya Modalı"
              subtitle="Poster, fragman & başlık aksiyonları"
              badge="Panel"
              badgeVariant="success"
              icon="solar:clapperboard-play-bold"
              action={
                <ActionBtn size="xs" onClick={handleOpenMediaModal} variant="primary">
                  Modalı Başlat
                </ActionBtn>
              }
            >
              Özel başlık barında Favorilere Ekle ve Paylaş butonları barındırır. Sonuçta oynatma komutu döner.
            </DemoCard>

            <DemoCard
              title="Çerçevesiz Video Oynatıcı"
              subtitle="MODAL_CHROME.BARE"
              badge="Bare"
              badgeVariant="purple"
              icon="solar:videocamera-record-bold"
              action={
                <ActionBtn size="xs" onClick={handleOpenBareVideo} variant="default">
                  Videoyu Aç
                </ActionBtn>
              }
            >
              Standart pencere çerçevesi olmadan saydam arka plan üzerinde doğrudan HTML5 video oynatıcı render eder.
            </DemoCard>

            <DemoCard
              title="Çok Katmanlı Yığın (3 Katman)"
              subtitle="İç içe modal yığını (Nested Stack)"
              badge="Stack"
              badgeVariant="warning"
              icon="solar:layers-bold"
              action={
                <ActionBtn size="xs" onClick={handleOpenNestedStack} variant="default">
                  Yığını Başlat
                </ActionBtn>
              }
            >
              Bir modal içerisinden 2. ve 3. katmanları açar. Kapanırken yalnız üstteki katman kapanır.
            </DemoCard>

            <DemoCard
              title="Promise Sonucu Döndüren Form"
              subtitle="Asenkron veri dönüşü"
              badge="Promise"
              badgeVariant="info"
              icon="solar:pen-new-square-bold"
              action={
                <ActionBtn size="xs" onClick={handleOpenFormModal} variant="default">
                  Formu Aç
                </ActionBtn>
              }
            >
              <code>openModal()</code> bir Promise döndürür. Kullanıcı formu onayladığında veri doğrudan çağıran koda iletilir.
            </DemoCard>

            <DemoCard
              title="Duyarlı Çekmece (Sheet)"
              subtitle="Mobilde alt, masaüstünde sağ"
              badge="Responsive"
              badgeVariant="neutral"
              icon="solar:devices-bold"
              action={
                <ActionBtn size="xs" onClick={handleOpenResponsiveDrawer} variant="default">
                  Çekmeceyi Aç
                </ActionBtn>
              }
            >
              <code>&#123; mobile: &apos;bottom&apos;, desktop: &apos;right&apos; &#125;</code> sözleşmesiyle cihaz ekranına göre akıcı yerleşir.
            </DemoCard>

            <DemoCard
              title="Özel Konum Testi"
              subtitle="Tüm pozisyonları doğrudan dene"
              badge="Position"
              badgeVariant="neutral"
              icon="solar:compass-bold"
              action={
                <ActionBtn size="xs" onClick={() => openModal('TEST_MEDIA_MODAL', selectedPosition)} variant="default">
                  Aç ({selectedPosition})
                </ActionBtn>
              }
            >
              <SelectInput
                label="Konum Seçin"
                value={selectedPosition}
                onChange={setSelectedPosition}
                options={[
                  { value: MODAL_POSITIONS.CENTER, label: 'Orta (Center)' },
                  { value: MODAL_POSITIONS.TOP, label: 'Üst (Top)' },
                  { value: MODAL_POSITIONS.BOTTOM, label: 'Alt (Bottom)' },
                  { value: MODAL_POSITIONS.LEFT, label: 'Sol (Left)' },
                  { value: MODAL_POSITIONS.RIGHT, label: 'Sağ (Right)' },
                ]}
              />
            </DemoCard>
          </div>
        </div>
      )}

      {/* SEKME 2: UÇ DURUMLAR & KURALLAR */}
      {currentTab === 'edge_cases' && (
        <div className="space-y-4">
          <NoticeBanner
            title="Modal Modülü Güvenlik & Yaşam Döngüsü Sözleşmesi"
            description="Tvizzie Modal Modülü bellek sızıntılarını, sonsuz modal açılmalarını ve z-index karmaşalarını otomatik kurallarla engeller."
            variant="info"
            icon="solar:shield-warning-bold"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DemoCard
              title="Aynı Tür Tekilleştirme Kuralı (Dedupe)"
              subtitle="Üstte aynı tür açıkken tekrar çağrılması"
              badge="Dedupe"
              badgeVariant="warning"
              icon="solar:copy-bold"
              action={
                <ActionBtn size="xs" onClick={handleTestSameTypeDedupe} variant="warning">
                  Testi Çalıştır
                </ActionBtn>
              }
            >
              Sözleşme Kuralı: Eğer en üstte zaten <code>TEST_MEDIA_MODAL</code> açıksa, yeni bir <code>openModal(&apos;TEST_MEDIA_MODAL&apos;)</code> çağrısı yeni modal açmaz ve anında <code>null</code> döner.
            </DemoCard>

            <DemoCard
              title="Tüm Yığını Tek Hamlede Kapatma"
              subtitle="closeAllModals(result)"
              badge="Batch Close"
              badgeVariant="danger"
              icon="solar:trash-bin-trash-bold"
              action={
                <ActionBtn size="xs" onClick={handleTestCloseAll} variant="danger">
                  Tümünü Temizle
                </ActionBtn>
              }
            >
              Kaç katman olursa olsun (örn. 3 katman açıkken) <code>closeAllModals()</code> tek çağrıda tüm yığını kapatır, scroll kilidini çözer ve odağı geri yükler.
            </DemoCard>
          </div>

          <Section title="Modül Yetenek Matrisi (Doğrulama Kontrol Listesi)">
            <FeatureChecklist
              features={[
                { name: 'Promise Lifecycle', desc: 'openModal() çağrısı close(result) ile çözülen Promise döndürür', tested: true },
                { name: 'Multi-Layer Stack', desc: 'İç içe açılan modallar yığına eklenir ve tek tek kapanır', tested: true },
                { name: 'Responsive Position', desc: 'mobile: bottom, desktop: right/center desteği', tested: true },
                { name: 'Chrome Seviyeleri', desc: 'DEFAULT, PANEL ve BARE (çerçevesiz) desteği', tested: true },
                { name: 'Header Actions', desc: 'Modal başlığında sağ köşeye özel eylem düğmeleri yerleştirme', tested: true },
                { name: 'Dedupe Rule', desc: 'Aynı tip modal üstte açıkken tekrar çağrılırsa null döner', tested: true },
              ]}
            />
          </Section>
        </div>
      )}

      {/* SEKME 3: APİ & KOD ÖRNEKLERİ */}
      {currentTab === 'code' && (
        <div className="space-y-4">
          <CodeSnippet
            title="1. Modal Açma ve Promise Sonucu Alma"
            code={`import { useModalActions, MODAL_POSITIONS } from '@/modules/modal';

function MovieCard({ movie }) {
  const { openModal } = useModalActions();

  const handleInspect = async () => {
    // openModal bir Promise döndürür:
    const result = await openModal('MOVIE_DETAILS_MODAL', MODAL_POSITIONS.CENTER, {
      data: movie,
      header: { title: movie.title, showClose: true },
    });

    if (result?.action === 'play') {
      playMovie(movie.id);
    }
  };

  return <Button onClick={handleInspect}>Detayları Gör</Button>;
}`}
          />

          <CodeSnippet
            title="2. Duyarlı Konumlandırma (Mobile Bottom Sheet, Desktop Right)"
            code={`openModal(
  'SETTINGS_DRAWER',
  { mobile: 'bottom', desktop: 'right' },
  {
    data: { section: 'general' },
    header: { title: 'Ayarlar' },
  }
);`}
          />

          <CodeSnippet
            title="3. Modal Bileşeni Tanımlama & Registry'ye Kaydetme"
            code={`import { ModalContainer } from '@/modules/modal';
import { useModalRegistration } from '@/modules/registry';

function EditProfileModal({ close, data }) {
  return (
    <ModalContainer
      header={{ title: 'Profili Düzenle', showClose: true }}
      footer={{
        right: (
          <Button onClick={() => close({ saved: true })}>
            Kaydet
          </Button>
        )
      }}
      close={close}
    >
      <div className="p-4">Kullanıcı: {data?.username}</div>
    </ModalContainer>
  );
}

// Feature içinde kayıt:
export function useProfileModalRegistration() {
  useModalRegistration(
    { EDIT_PROFILE_MODAL: EditProfileModal },
    { source: 'profile-page' }
  );
}`}
          />
        </div>
      )}

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Modal Yaşam Döngüsü & Olay Günlüğü" />
    </div>
  );
}

