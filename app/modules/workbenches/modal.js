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
import {
  ActionBtn,
  JsonViewer,
  LogConsole,
  Section,
  SelectInput,
  StateBadge,
  TextInput,
} from './shared';

// ── Test Modalı Bileşenleri ──────────────────────────────────────────────────

// 1. Standart Panel Modalı (İçinden ikinci bir katman açabilen)
function TestStandardModal({ close, data }) {
  const { openModal } = useModalActions();

  return (
    <ModalContainer
      header={{
        title: data?.title || 'Standart Test Modalı',
        showClose: true,
      }}
      footer={{
        left: (
          <Button
            type="button"
            onClick={() => close({ eylem: 'iptal_edildi' })}
            className="cursor-pointer px-3 py-1.5 font-mono text-xs text-white/70 hover:text-white"
          >
            Vazgeç
          </Button>
        ),
        right: (
          <Button
            type="button"
            onClick={() => close({ eylem: 'onaylandi', zaman: Date.now() })}
            className="cursor-pointer rounded-lg bg-white px-3 py-1.5 font-mono text-xs font-semibold text-black"
          >
            İşlemi Onayla
          </Button>
        ),
      }}
      close={close}
    >
      <div className="space-y-4 p-4 font-mono text-xs text-white/70">
        <p>
          Bu modal <code>ModalContainer</code> bileşeni içinde başlık, kaydırılabilir gövde ve sabit
          alt butonlarla çalışır
        </p>
        <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="font-semibold text-white">
            Çok Katmanlı Yığın Testi (Modal İçinde Modal):
          </div>
          <p className="text-xs text-white/50">
            Aşağıdaki butona basarak bu modalın üzerine ikinci bir modal katmanı açabilirsiniz.
            Tvizzie z-index ve katman yönetimini otomatik sağlar
          </p>
          <Button
            type="button"
            onClick={() =>
              openModal('TEST_NESTED_MODAL', MODAL_POSITIONS.CENTER, {
                title: 'İç İçe İkinci Katman Modalı',
              })
            }
            className="cursor-pointer rounded-lg bg-white/10 px-3 py-1.5 font-mono text-xs text-white transition-colors hover:bg-white/15"
          >
            İç İçe Modal Katmanı Aç
          </Button>
        </div>
      </div>
    </ModalContainer>
  );
}

// 2. İç İçe İkinci Katman Modalı
function TestNestedModal({ close, data }) {
  return (
    <ModalContainer
      header={{
        title: data?.title || 'İkinci Katman Modalı',
        showClose: true,
      }}
      footer={{
        right: (
          <Button
            type="button"
            onClick={() => close({ katman: 2, kapatildi: true })}
            className="cursor-pointer rounded-lg bg-white px-3 py-1.5 font-mono text-xs font-semibold text-black"
          >
            Üst Katmanı Kapat
          </Button>
        ),
      }}
      close={close}
    >
      <div className="space-y-3 p-4 font-mono text-xs text-white/70">
        <p className="font-semibold text-emerald-400">Modal Yığınında İkinci Katman Açıldı!</p>
        <p className="text-white/50">
          Bu katman kapandığında alttaki ana modal bozulmadan odağını ve durumunu korur
        </p>
      </div>
    </ModalContainer>
  );
}

// 3. Değer Döndüren Form Modalı (Promise Dönüşü)
function TestFormReturnModal({ close }) {
  const [inputValue, setInputValue] = useState('Dönüş Değeri Metni');

  return (
    <ModalContainer
      header={{
        title: 'Sonuç Döndüren Form Modalı',
        showClose: true,
      }}
      footer={{
        right: (
          <Button
            type="button"
            onClick={() => close({ onaylandi: true, girilenMetin: inputValue })}
            className="cursor-pointer rounded-lg bg-emerald-500 px-3 py-1.5 font-mono text-xs font-semibold text-black"
          >
            Formu Gönder ve Sonucu Çağırana İlet
          </Button>
        ),
      }}
      close={close}
    >
      <div className="space-y-3 p-4 font-mono text-xs">
        <label className="block text-white/70">
          openModal() Promise sonucuna iletilecek metni girin:
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="h-9 w-full rounded-lg border border-white/10 bg-black/60 px-3 font-mono text-xs text-white focus:outline-none"
        />
      </div>
    </ModalContainer>
  );
}

// 4. Çerçevesiz (Bare Chrome) Modal
function TestBareModal({ close }) {
  return (
    <div className="max-w-sm space-y-3 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/90 to-black/80 p-6 text-center text-white shadow-2xl backdrop-blur-2xl">
      <div className="font-mono text-sm font-semibold text-purple-300">
        Özel Çerçevesiz (Bare) Modal
      </div>
      <p className="text-xs text-white/70">
        Standart panel çerçevesi olmadan doğrudan özel JSX stiliyle render edilir
      </p>
      <Button
        type="button"
        onClick={() => close({ bareKapatildi: true })}
        className="cursor-pointer rounded-lg bg-purple-500 px-4 py-1.5 font-mono text-xs font-semibold text-black hover:bg-purple-400"
      >
        Modalı Kapat
      </Button>
    </div>
  );
}

export default function WorkbenchModal() {
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
      TEST_STANDARD_MODAL: TestStandardModal,
      TEST_NESTED_MODAL: TestNestedModal,
      TEST_FORM_RETURN_MODAL: TestFormReturnModal,
      TEST_BARE_MODAL: TestBareModal,
    },
    { source: 'modal-workbench' },
  );

  const handleOpenStandardModal = async (position = selectedPosition) => {
    try {
      addLog('openModal', `TEST_STANDARD_MODAL açılıyor, Konum: ${position}`);
      const promise = openModal('TEST_STANDARD_MODAL', position, {
        props: { title: customModalTitle },
        chrome: MODAL_CHROME.PANEL,
      });

      const result = await promise;
      setLastReturnedPromiseValue(result);
      addLog('openModal:cozuldu', result || 'Kapatıldı (Değer yok)', 'success');
    } catch (err) {
      addLog('openModal:hata', err.message, 'error');
    }
  };

  const handleOpenFormModal = async () => {
    try {
      addLog('openModal(form)', 'TEST_FORM_RETURN_MODAL açılıyor...');
      const result = await openModal('TEST_FORM_RETURN_MODAL', MODAL_POSITIONS.CENTER);
      setLastReturnedPromiseValue(result);
      addLog('openModal:cozuldu', result || 'Form gönderilmeden kapatıldı', 'success');
    } catch (err) {
      addLog('openModal:hata', err.message, 'error');
    }
  };

  const handleOpenBareModal = async () => {
    try {
      addLog('openModal(bare)', 'TEST_BARE_MODAL (chrome: bare) açılıyor...');
      const result = await openModal('TEST_BARE_MODAL', MODAL_POSITIONS.CENTER, {
        chrome: MODAL_CHROME.BARE,
      });
      setLastReturnedPromiseValue(result);
      addLog('openModal:cozuldu', result || 'Bare modal kapatıldı', 'success');
    } catch (err) {
      addLog('openModal:hata', err.message, 'error');
    }
  };

  const handleOpenResponsiveModal = async () => {
    try {
      addLog('openModal(duyarli)', 'Duyarlı Modal');
      const result = await openModal(
        'TEST_STANDARD_MODAL',
        { mobile: MODAL_POSITIONS.BOTTOM, desktop: MODAL_POSITIONS.RIGHT },
        {
          props: { title: 'Duyarlı Modal' },
        },
      );
      setLastReturnedPromiseValue(result);
      addLog('openModal:cozuldu', result || 'Kapatıldı', 'success');
    } catch (err) {
      addLog('openModal:hata', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal Durumu */}
      <Section
        title="Modal Durumu & Yığın"
        badge={isOpen ? `${modalStack.length} Katman` : 'Kapalı'}
        actions={
          isOpen ? (
            <div className="flex gap-1.5">
              <ActionBtn
                size="xs"
                onClick={() => closeModal({ sebep: 'manuel_kapatma' })}
                variant="danger"
              >
                Kapat
              </ActionBtn>
              <ActionBtn
                size="xs"
                onClick={() => closeAllModals({ sebep: 'tumunu_kapat' })}
                variant="danger"
              >
                Tümünü Kapat
              </ActionBtn>
            </div>
          ) : null
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="Açık"
            value={isOpen ? 'Evet' : 'Hayır'}
            variant={isOpen ? 'success' : 'neutral'}
          />
          <StateBadge label="Katman Sayısı" value={modalStack.length} />
          <StateBadge label="Tür" value={modalType || 'Yok'} variant="info" />
        </div>

        <JsonViewer
          data={{
            acikMi: isOpen,
            yigindakiSayi: modalStack.length,
            aktifModalId: activeModalId,
            modalTuru: modalType,
            yiginListesi: modalStack.map((m) => ({
              id: m.id,
              tur: m.modalType,
              konum: m.position,
            })),
            sonDonenPromiseVerisi: lastReturnedPromiseValue,
          }}
          title="useModal()"
        />
      </Section>

      {/* Test Modalları */}
      <Section title="Test Modalları">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput
            label="Modal Başlığı"
            value={customModalTitle}
            onChange={setCustomModalTitle}
          />
          <SelectInput
            label="Konum"
            value={selectedPosition}
            onChange={setSelectedPosition}
            options={[
              { value: MODAL_POSITIONS.CENTER, label: 'Orta (Merkez)' },
              { value: MODAL_POSITIONS.TOP, label: 'Üst' },
              { value: MODAL_POSITIONS.BOTTOM, label: 'Alt Çekmece' },
              { value: MODAL_POSITIONS.LEFT, label: 'Sol Panel' },
              { value: MODAL_POSITIONS.RIGHT, label: 'Sağ Panel' },
            ]}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <ActionBtn
            onClick={() => handleOpenStandardModal()}
            variant="primary"
            icon="solar:maximize-square-bold"
          >
            Standart Modal Aç
          </ActionBtn>
          <ActionBtn onClick={handleOpenFormModal} icon="solar:pen-new-square-bold">
            Form Modalı (Promise)
          </ActionBtn>
          <ActionBtn onClick={handleOpenBareModal} icon="solar:ghost-bold">
            Çerçevesiz Modal
          </ActionBtn>
          <ActionBtn onClick={handleOpenResponsiveModal} icon="solar:devices-bold">
            Duyarlı Modal
          </ActionBtn>
        </div>

        {/* Hızlı Konum Seçimi */}
        <div className="space-y-2 border-t border-white/10 pt-3">
          <div className="font-mono text-xs text-white/50">Tüm Konumları Hızlıca Dene:</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(MODAL_POSITIONS).map((pos) => (
              <ActionBtn key={pos} size="xs" onClick={() => handleOpenStandardModal(pos)}>
                {pos}
              </ActionBtn>
            ))}
          </div>
        </div>
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole
        logs={logs}
        onClear={() => setLogs([])}
        title="Modal Yaşam Döngüsü ve Dönüş Günlüğü"
      />
    </div>
  );
}
