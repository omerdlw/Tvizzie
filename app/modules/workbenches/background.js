'use client';

import { useEffect, useRef, useState } from 'react';
import { useBackgroundActions, useBackgroundState } from '@/modules/background';
import { useBackgroundRegistration } from '@/modules/registry';
import {
  ActionBtn,
  JsonViewer,
  LogConsole,
  Section,
  SelectInput,
  StateBadge,
  TextInput,
} from './shared';

const SAMPLE_IMAGES = [
  {
    label: 'Interstellar Uzay Görseli',
    value: 'https://image.tmdb.org/t/p/original/rAiYTnrLEhvF7zIjIzoHaDuSIu.jpg',
  },
  {
    label: 'Blade Runner 2049 Şehir Görseli',
    value: 'https://image.tmdb.org/t/p/original/ilRyASD5H1d5cI0mF8y37x0g0F0.jpg',
  },
  {
    label: 'Oppenheimer Patlama Görseli',
    value: 'https://image.tmdb.org/t/p/original/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg',
  },
];

const SAMPLE_VIDEO = '/video.mp4';

export default function WorkbenchBackground() {
  const state = useBackgroundState();
  const actions = useBackgroundActions();

  // İlk açılışta aktif bir arkaplan yoksa örnek görseli doğrudan arkaplan modülüne yükle
  useEffect(() => {
    if (!state.hasBackground) {
      actions.setBackground({
        image: SAMPLE_IMAGES[0].value,
        overlay: true,
        overlayOpacity: 0.4,
        leftGradient: 5,
        rightGradient: 5,
        fadeEdges: 24,
        width: '100%',
      });
    }
  }, []);

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

  // Image controls
  const [selectedImage, setSelectedImage] = useState(SAMPLE_IMAGES[0].value);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [imageFit, setImageFit] = useState('cover');
  const [imagePosition, setImagePosition] = useState('center');

  // Gradient & Overlay controls
  const [leftGradient, setLeftGradient] = useState(5);
  const [rightGradient, setRightGradient] = useState(5);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [overlayColor, setOverlayColor] = useState('rgba(0,0,0,0.7)');
  const [fadeEdges, setFadeEdges] = useState(24);
  const [width, setWidth] = useState('100%');
  const [noiseOpacity, setNoiseOpacity] = useState(0.3);

  // Declarative registry registration toggle
  const [isRegistryControlled, setIsRegistryControlled] = useState(false);
  const [registryPriority, setRegistryPriority] = useState(150);

  // Register into Registry when toggled
  useBackgroundRegistration(
    isRegistryControlled
      ? {
          image: customImageUrl || selectedImage,
          overlay: true,
          overlayOpacity: Number(overlayOpacity),
          leftGradient: Number(leftGradient),
          rightGradient: Number(rightGradient),
          fadeEdges: Number(fadeEdges),
          width,
        }
      : null,
    { source: 'modules-workbench', priority: Number(registryPriority) },
  );

  // Mevcut ayarları aktif olan moda (video veya resim) göre uygular
  const handleApplyCurrentSettings = () => {
    try {
      const isVideoActive = state.isVideo && Boolean(state.video);
      const targetSrc = customImageUrl.trim() || selectedImage;

      addLog(
        'setBackground(Ayarlar)',
        `Ayarlar uygulanıyor (Mod: ${isVideoActive ? 'Video' : 'Resim'}, Sol Gradient: ${leftGradient}, Sağ Gradient: ${rightGradient}, Opaklık: ${overlayOpacity})`,
      );

      if (isVideoActive) {
        // Video modundayken videoyu yeniden başlatmadan yalnızca stil ve gradientleri güncelle
        actions.setBackground({
          fit: imageFit,
          position: imagePosition,
          overlay: true,
          overlayOpacity: Number(overlayOpacity),
          overlayColor,
          leftGradient: Number(leftGradient),
          rightGradient: Number(rightGradient),
          fadeEdges: Number(fadeEdges),
          width,
          noiseStyle: { opacity: Number(noiseOpacity) },
        });
      } else {
        actions.setBackground({
          image: targetSrc,
          fit: imageFit,
          position: imagePosition,
          overlay: true,
          overlayOpacity: Number(overlayOpacity),
          overlayColor,
          leftGradient: Number(leftGradient),
          rightGradient: Number(rightGradient),
          fadeEdges: Number(fadeEdges),
          width,
          noiseStyle: { opacity: Number(noiseOpacity) },
        });
      }

      addLog('setBackground:başarılı', 'Ayarlar ve gradientler kesintisiz uygulandı', 'success');
    } catch (err) {
      addLog('setBackground:hata', err.message, 'error');
    }
  };

  const handleApplyImage = (overrideUrl) => {
    try {
      const src = overrideUrl || customImageUrl.trim() || selectedImage;
      addLog('setBackground(Resim)', `Resim arkaplanı uygulanıyor: ${src.slice(0, 40)}...`);
      actions.setBackground({
        image: src,
        video: null,
        fit: imageFit,
        position: imagePosition,
        overlay: true,
        overlayOpacity: Number(overlayOpacity),
        overlayColor,
        leftGradient: Number(leftGradient),
        rightGradient: Number(rightGradient),
        fadeEdges: Number(fadeEdges),
        width,
        noiseStyle: { opacity: Number(noiseOpacity) },
      });
      addLog('setBackground:başarılı', 'Resim arkaplanı başarıyla uygulandı', 'success');
    } catch (err) {
      addLog('setBackground:hata', err.message, 'error');
    }
  };

  const handleApplyVideo = () => {
    try {
      addLog('setBackground(Video)', `Video kaynağı uygulanıyor: ${SAMPLE_VIDEO}`);
      actions.setBackground({
        image: null,
        video: SAMPLE_VIDEO,
        videoClassName: 'bg-center bg-cover',
        isPlaying: true,
        overlay: true,
        overlayOpacity: Number(overlayOpacity),
        leftGradient: Number(leftGradient),
        rightGradient: Number(rightGradient),
        fadeEdges: Number(fadeEdges),
        width,
        videoOptions: {
          autoplay: true,
          muted: true,
          loop: true,
        },
      });
      addLog('setBackground:başarılı', 'Video arkaplanı başlatıldı', 'success');
    } catch (err) {
      addLog('setBackground:hata', err.message, 'error');
    }
  };

  const handleReset = () => {
    try {
      addLog('resetBackground', 'Arkaplan sıfırlanıyor...');
      actions.resetBackground();
      addLog('resetBackground:başarılı', 'Arkaplan temizlendi', 'success');
    } catch (err) {
      addLog('resetBackground:hata', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Arka Plan Durumu */}
      <Section
        title="Arka Plan Durumu"
        badge={state.hasBackground ? (state.isVideo ? 'Video Aktif' : 'Resim Aktif') : 'Kapalı'}
        actions={
          <ActionBtn size="xs" onClick={handleReset} variant="danger">
            Sıfırla
          </ActionBtn>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <StateBadge
            label="Durum"
            value={state.hasBackground ? (state.isVideo ? 'Video' : 'Resim') : 'Kapalı'}
            variant={state.hasBackground ? 'success' : 'neutral'}
          />
          {state.isVideo && (
            <>
              <StateBadge
                label="Oynatma"
                value={state.isPlaying ? 'Oynatılıyor' : 'Duraklatıldı'}
                variant={state.isPlaying ? 'success' : 'warning'}
              />
              <StateBadge
                label="Ses"
                value={state.videoOptions?.muted ? 'Sessiz' : 'Açık'}
                variant={state.videoOptions?.muted ? 'neutral' : 'info'}
              />
            </>
          )}
          <StateBadge label="Sol Gradient" value={state.leftGradient || 0} variant="info" />
          <StateBadge label="Sağ Gradient" value={state.rightGradient || 0} variant="info" />
          <StateBadge label="Opaklık" value={state.overlayOpacity ?? 0.4} />
          <StateBadge label="Genişlik" value={state.width || '100%'} />
        </div>

        <JsonViewer
          data={{
            resimUrl: state.image,
            videoUrl: state.video,
            isVideo: state.isVideo,
            isPlaying: state.isPlaying,
            videoAyarlari: state.videoOptions,
            overlay: state.overlay,
            overlayOpakligi: state.overlayOpacity,
            overlayRengi: state.overlayColor,
            solGradient: state.leftGradient,
            sagGradient: state.rightGradient,
            kenarGecisi: state.fadeEdges,
            genislik: state.width,
            sigdirmaModu: state.fit,
          }}
          title="useBackgroundState()"
        />
      </Section>

      {/* Medya Seçimi */}
      <Section title="Medya Seçimi">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SelectInput
              label="Hazır Resim"
              value={selectedImage}
              onChange={(v) => {
                setSelectedImage(v);
                handleApplyImage(v);
              }}
              options={SAMPLE_IMAGES}
            />
            <SelectInput
              label="Sığdırma"
              value={imageFit}
              onChange={(v) => {
                setImageFit(v);
                setTimeout(handleApplyCurrentSettings, 50);
              }}
              options={[
                { value: 'cover', label: 'cover (Kapla)' },
                { value: 'contain', label: 'contain (Sığdır)' },
                { value: 'fill', label: 'fill (Doldur)' },
              ]}
            />
            <SelectInput
              label="Hizalama"
              value={imagePosition}
              onChange={(v) => {
                setImagePosition(v);
                setTimeout(handleApplyCurrentSettings, 50);
              }}
              options={[
                { value: 'center', label: 'center (Orta)' },
                { value: 'top', label: 'top (Üst)' },
                { value: 'bottom', label: 'bottom (Alt)' },
              ]}
            />
          </div>

          <TextInput
            label="Özel Resim URL"
            value={customImageUrl}
            onChange={setCustomImageUrl}
            placeholder="https://..."
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <ActionBtn
              onClick={() => handleApplyImage()}
              variant="primary"
              icon="solar:gallery-bold"
            >
              Resmi Uygula
            </ActionBtn>
            <ActionBtn onClick={handleApplyVideo} icon="solar:videocamera-record-bold">
              Videoyu Başlat
            </ActionBtn>
            <ActionBtn onClick={handleReset} variant="danger" icon="solar:trash-bin-trash-bold">
              Temizle
            </ActionBtn>
          </div>
        </div>

        {/* Video Oynatma Kontrolleri */}
        {state.isVideo && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
            <ActionBtn
              onClick={actions.toggleVideo}
              icon={state.isPlaying ? 'solar:pause-bold' : 'solar:play-bold'}
            >
              {state.isPlaying ? 'Duraklat' : 'Oynat'}
            </ActionBtn>
            <ActionBtn
              onClick={actions.toggleMute}
              icon={
                state.videoOptions?.muted ? 'solar:volume-cross-bold' : 'solar:volume-loud-bold'
              }
            >
              {state.videoOptions?.muted ? 'Sesi Aç' : 'Sessiz'}
            </ActionBtn>
            <ActionBtn onClick={actions.toggleLoop} icon="solar:restart-bold">
              {state.videoOptions?.loop ? 'Döngü Açık' : 'Döngü Kapalı'}
            </ActionBtn>
          </div>
        )}
      </Section>

      {/* Görsel Ayarlar */}
      <Section title="Görsel Ayarlar & Gradient">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <TextInput
            label="Sol Gradient"
            type="number"
            value={leftGradient}
            onChange={(v) => setLeftGradient(Number(v))}
          />
          <TextInput
            label="Sağ Gradient"
            type="number"
            value={rightGradient}
            onChange={(v) => setRightGradient(Number(v))}
          />
          <TextInput
            label="Opaklık"
            type="number"
            value={overlayOpacity}
            onChange={(v) => setOverlayOpacity(Number(v))}
          />
          <TextInput
            label="Kenar Yumuşatma"
            type="number"
            value={fadeEdges}
            onChange={(v) => setFadeEdges(Number(v))}
          />
          <SelectInput
            label="Genişlik"
            value={width}
            onChange={setWidth}
            options={[
              { value: '100%', label: 'Tam Genişlik' },
              { value: '85%', label: '%85' },
              { value: '70%', label: '%70' },
              { value: '1200px', label: '1200px' },
            ]}
          />
          <TextInput
            label="Noise"
            type="number"
            value={noiseOpacity}
            onChange={(v) => setNoiseOpacity(Number(v))}
          />
          <div className="col-span-2">
            <TextInput label="Overlay Rengi" value={overlayColor} onChange={setOverlayColor} />
          </div>
        </div>

        <div className="pt-2">
          <ActionBtn
            onClick={handleApplyCurrentSettings}
            variant="primary"
            icon="solar:refresh-bold"
          >
            Stilleri Uygula
          </ActionBtn>
        </div>
      </Section>

      {/* Deklaratif Kayıt Testi */}
      <Section
        title="Kayıt Defteri (Registry) Entegrasyonu"
        description="useBackgroundRegistration() hook'u ile arka planı dinamik öncelik değeriyle deklare edin"
        badge={isRegistryControlled ? 'KAYITLI' : 'PASİF'}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/60 p-3">
          <div className="space-y-1">
            <div className="font-mono text-xs font-semibold text-white">
              useBackgroundRegistration() Anahtarı
            </div>
            <div className="font-mono text-xs text-white/50">
              Aktif edildiğinde, arka plan {registryPriority} önceliğiyle Registry havuzuna
              yayınlanır
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24">
              <TextInput
                label="Öncelik"
                type="number"
                value={registryPriority}
                onChange={(v) => setRegistryPriority(Number(v))}
              />
            </div>
            <ActionBtn
              onClick={() => setIsRegistryControlled((prev) => !prev)}
              variant={isRegistryControlled ? 'danger' : 'primary'}
            >
              {isRegistryControlled ? 'Kaydı Kaldır' : 'Deftere Kaydet'}
            </ActionBtn>
          </div>
        </div>
      </Section>

      {/* Olay Günlüğü */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Arka Plan Olay Günlüğü" />
    </div>
  );
}
