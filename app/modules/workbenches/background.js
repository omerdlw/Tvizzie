'use client';

import { useEffect, useState } from 'react';
import { useBackgroundActions, useBackgroundState } from '@/modules/background';
import { useBackgroundRegistration } from '@/modules/registry';
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

const PRESET_LIBRARY = [
  {
    id: 'interstellar',
    title: 'Interstellar - Deep Space',
    category: 'Cinematic Space',
    image: 'https://image.tmdb.org/t/p/original/rAiYTnrLEhvF7zIjIzoHaDuSIu.jpg',
    overlayOpacity: 0.45,
    overlayColor: 'rgba(0,0,0,0.7)',
    leftGradient: 5,
    rightGradient: 5,
    fadeEdges: 24,
    noiseOpacity: 0.05,
    width: '100%',
    fit: 'cover',
    position: 'center',
    badge: '4K Cosmic',
  },
  {
    id: 'bladerunner',
    title: 'Blade Runner 2049 - Cyberpunk Glow',
    category: 'Sci-Fi Neon',
    image: 'https://image.tmdb.org/t/p/original/ilRyASD5H1d5cI0mF8y37x0g0F0.jpg',
    overlayOpacity: 0.35,
    overlayColor: 'rgba(10,5,20,0.65)',
    leftGradient: 7,
    rightGradient: 3,
    fadeEdges: 32,
    noiseOpacity: 0.08,
    width: '100%',
    fit: 'cover',
    position: 'center',
    badge: 'Cyberpunk',
  },
  {
    id: 'oppenheimer',
    title: 'Oppenheimer - Fiery Ignition',
    category: 'Dramatic Drama',
    image: 'https://image.tmdb.org/t/p/original/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg',
    overlayOpacity: 0.5,
    overlayColor: 'rgba(20,5,0,0.75)',
    leftGradient: 6,
    rightGradient: 6,
    fadeEdges: 28,
    noiseOpacity: 0.1,
    width: '100%',
    fit: 'cover',
    position: 'center',
    badge: 'High Contrast',
  },
  {
    id: 'minimal_dark',
    title: 'Minimal Slate - Product Focus',
    category: 'UI Spotlight',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    overlayOpacity: 0.6,
    overlayColor: 'rgba(5,7,12,0.85)',
    leftGradient: 2,
    rightGradient: 2,
    fadeEdges: 16,
    noiseOpacity: 0.04,
    width: '85%',
    fit: 'cover',
    position: 'center',
    badge: 'Subtle Slate',
  },
];

const SAMPLE_VIDEO_SRC = '/video.mp4';

export default function WorkbenchBackground() {
  const state = useBackgroundState();
  const actions = useBackgroundActions();

  // Workbench unmount olduğunda veya modüller arası geçiş yapıldığında arka planı temizle
  useEffect(() => {
    return () => {
      actions.resetBackground();
    };
  }, [actions]);

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

  // Visual studio interactive controls
  const [activePresetId, setActivePresetId] = useState('interstellar');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [imageFit, setImageFit] = useState('cover');
  const [imagePosition, setImagePosition] = useState('center');
  const [leftGradient, setLeftGradient] = useState(5);
  const [rightGradient, setRightGradient] = useState(5);
  const [overlayOpacity, setOverlayOpacity] = useState(0.45);
  const [overlayColor, setOverlayColor] = useState('rgba(0,0,0,0.7)');
  const [fadeEdges, setFadeEdges] = useState(24);
  const [width, setWidth] = useState('100%');
  const [noiseOpacity, setNoiseOpacity] = useState(0.05);

  // Registry priority testing state
  const [lowPriorityRegistered, setLowPriorityRegistered] = useState(false);
  const [highPriorityRegistered, setHighPriorityRegistered] = useState(false);

  // Declarative registry registrations for testing conflict resolution
  useBackgroundRegistration(
    lowPriorityRegistered
      ? {
          image: PRESET_LIBRARY[0].image,
          overlay: true,
          overlayOpacity: 0.5,
          leftGradient: 3,
          rightGradient: 3,
          fadeEdges: 15,
          width: '100%',
        }
      : null,
    { source: 'low-priority-card', priority: 50 },
  );

  useBackgroundRegistration(
    highPriorityRegistered
      ? {
          image: PRESET_LIBRARY[1].image,
          overlay: true,
          overlayOpacity: 0.3,
          leftGradient: 8,
          rightGradient: 8,
          fadeEdges: 40,
          width: '85%',
        }
      : null,
    { source: 'high-priority-card', priority: 250 },
  );

  // Initialize initial background if empty
  useEffect(() => {
    if (!state.hasBackground) {
      applyPreset(PRESET_LIBRARY[0]);
    }
  }, []);

  const applyPreset = (preset) => {
    try {
      setActivePresetId(preset.id);
      setImageFit(preset.fit);
      setImagePosition(preset.position);
      setLeftGradient(preset.leftGradient);
      setRightGradient(preset.rightGradient);
      setOverlayOpacity(preset.overlayOpacity);
      setOverlayColor(preset.overlayColor);
      setFadeEdges(preset.fadeEdges);
      setWidth(preset.width);
      setNoiseOpacity(preset.noiseOpacity);

      actions.setBackground({
        image: preset.image,
        video: null,
        fit: preset.fit,
        position: preset.position,
        overlay: true,
        overlayOpacity: preset.overlayOpacity,
        overlayColor: preset.overlayColor,
        leftGradient: preset.leftGradient,
        rightGradient: preset.rightGradient,
        fadeEdges: preset.fadeEdges,
        width: preset.width,
        noiseStyle: { opacity: preset.noiseOpacity },
      });

      addLog('applyPreset', `"${preset.title}" preseti başarıyla uygulandı`, 'success');
    } catch (err) {
      addLog('applyPreset:hata', err.message, 'error');
    }
  };

  const handleApplyCustomUrl = () => {
    if (!customImageUrl.trim()) {
      addLog('applyCustomUrl', 'Geçerli bir görsel URL girilmedi', 'warning');
      return;
    }
    try {
      actions.setBackground({
        image: customImageUrl.trim(),
        video: null,
        fit: imageFit,
        position: imagePosition,
        overlay: true,
        overlayOpacity,
        overlayColor,
        leftGradient,
        rightGradient,
        fadeEdges,
        width,
        noiseStyle: { opacity: noiseOpacity },
      });
      addLog('applyCustomUrl:başarılı', `Özel resim yüklendi: ${customImageUrl.slice(0, 35)}...`, 'success');
    } catch (err) {
      addLog('applyCustomUrl:hata', err.message, 'error');
    }
  };

  const handleApplyLiveSettings = () => {
    try {
      const isVideoMode = state.isVideo && Boolean(state.video);
      actions.setBackground({
        ...(isVideoMode ? {} : { image: customImageUrl.trim() || state.image || PRESET_LIBRARY[0].image }),
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
      addLog('updateSettings', 'Tüm görsel ve overlay parametreleri güncellendi', 'info');
    } catch (err) {
      addLog('updateSettings:hata', err.message, 'error');
    }
  };

  const handleStartTrailerVideo = () => {
    try {
      actions.setBackground({
        image: null,
        video: SAMPLE_VIDEO_SRC,
        videoClassName: 'bg-center bg-cover',
        isPlaying: true,
        overlay: true,
        overlayOpacity,
        leftGradient,
        rightGradient,
        fadeEdges,
        width,
        videoOptions: {
          autoplay: true,
          muted: true,
          loop: true,
          playbackRate: 1,
        },
      });
      addLog('startVideo', `Video arka planı başlatıldı (${SAMPLE_VIDEO_SRC})`, 'success');
    } catch (err) {
      addLog('startVideo:hata', err.message, 'error');
    }
  };

  const handleReset = () => {
    try {
      actions.resetBackground();
      addLog('resetBackground', 'Tüm arka plan katmanları temizlendi', 'info');
    } catch (err) {
      addLog('resetBackground:hata', err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header Metrics Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <MetricPill
            label="Aktif Katman"
            value={state.hasBackground ? (state.isVideo ? 'Video Player' : 'Statik Resim') : 'Arka Plan Yok'}
            variant={state.hasBackground ? 'emerald' : 'neutral'}
          />
          <MetricPill label="Genişlik Modu" value={state.width || '100%'} variant="indigo" />
          <MetricPill
            label="Overlay Opaklık"
            value={`${Math.round((state.overlayOpacity ?? 0.4) * 100)}%`}
            variant="cyan"
          />
          {state.isVideo && (
            <MetricPill
              label="Oynatma / Ses"
              value={`${state.isPlaying ? 'Oynatılıyor' : 'Durduruldu'} • ${state.videoOptions?.muted ? 'Sessiz' : 'Sesli'}`}
              variant={state.isPlaying ? 'amber' : 'neutral'}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <ActionBtn size="xs" variant="danger" icon="solar:trash-bin-trash-bold" onClick={handleReset}>
            Sıfırla
          </ActionBtn>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <SegmentedTabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'demos', label: '1. Görsel & Medya Stüdyosu', icon: 'solar:gallery-bold' },
          { id: 'edge_cases', label: '2. Registry & Öncelik Yarışı', icon: 'solar:shield-warning-bold' },
          { id: 'code', label: '3. API & Kod Sözleşmesi', icon: 'solar:code-bold' },
        ]}
      />

      {/* TAB 1: DEMOS */}
      {activeTab === 'demos' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="info"
            title="Sinematik Arka Plan Mimarisi"
            description="Background modülü, sayfa arka planını z-index 0 katmanında Framer Motion geçişleriyle yönetir. Çoklu gradient, kenar yumuşatma (fadeEdges), gürültü dokusu (noise) ve video döngüsünü donanım hızlandırmalı olarak render eder."
          />

          {/* Preset Library Grid */}
          <Section title="Hazır Sinematik Temalar" description="Önceden ayarlanmış görsel, gradient ve overlay kompozisyonları">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PRESET_LIBRARY.map((preset) => {
                const isActive = state.image === preset.image && !state.isVideo;
                return (
                  <DemoCard
                    key={preset.id}
                    title={preset.title}
                    badge={preset.badge}
                    description={`${preset.category} • Opaklık: ${Math.round(preset.overlayOpacity * 100)}% • Kenar Fade: ${preset.fadeEdges}px`}
                  >
                    <div className="space-y-3">
                      <div className="relative h-28 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                        <img
                          src={preset.image}
                          alt={preset.title}
                          className="h-full w-full object-cover opacity-80 transition-transform duration-500 hover:scale-105"
                        />
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundColor: preset.overlayColor,
                            opacity: preset.overlayOpacity,
                          }}
                        />
                      </div>
                      <ActionBtn
                        fullWidth
                        variant={isActive ? 'success' : 'primary'}
                        icon={isActive ? 'solar:check-circle-bold' : 'solar:play-bold'}
                        onClick={() => applyPreset(preset)}
                      >
                        {isActive ? 'Aktif Olarak Kullanılıyor' : 'Bu Temayı Uygula'}
                      </ActionBtn>
                    </div>
                  </DemoCard>
                );
              })}
            </div>
          </Section>

          {/* Video Trailer Mode */}
          <Section
            title="Video Arka Plan & Canlı Player"
            description="Otomatik döngü, sessiz başlangıç ve donanım hızlandırmalı HTML5 Video element denetimi"
            badge={state.isVideo ? 'VIDEO AKTİF' : 'BEKLEMEDE'}
          >
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-semibold text-white">4K Sinematik Fragman Oynatıcısı</div>
                  <div className="text-xs text-white/50">
                    Örnek video kaynağı: <code className="text-cyan-400">{SAMPLE_VIDEO_SRC}</code>
                  </div>
                </div>
                <ActionBtn
                  variant={state.isVideo ? 'danger' : 'primary'}
                  icon={state.isVideo ? 'solar:stop-bold' : 'solar:videocamera-record-bold'}
                  onClick={state.isVideo ? handleReset : handleStartTrailerVideo}
                >
                  {state.isVideo ? 'Videoyu Kapat' : 'Video Fragmanı Başlat'}
                </ActionBtn>
              </div>

              {state.isVideo && (
                <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                  <ActionBtn
                    size="sm"
                    onClick={actions.toggleVideo}
                    icon={state.isPlaying ? 'solar:pause-bold' : 'solar:play-bold'}
                  >
                    {state.isPlaying ? 'Durdur' : 'Oynat'}
                  </ActionBtn>
                  <ActionBtn
                    size="sm"
                    onClick={actions.toggleMute}
                    icon={state.videoOptions?.muted ? 'solar:volume-cross-bold' : 'solar:volume-loud-bold'}
                  >
                    {state.videoOptions?.muted ? 'Sesi Aç' : 'Sessize Al'}
                  </ActionBtn>
                  <ActionBtn size="sm" onClick={actions.toggleLoop} icon="solar:restart-bold">
                    {state.videoOptions?.loop ? 'Döngü Açık (Loop)' : 'Döngü Kapalı'}
                  </ActionBtn>
                </div>
              )}
            </div>
          </Section>

          {/* Live Visual Studio Sliders */}
          <Section
            title="Canlı Görsel Stüdyo & İnce Ayar"
            description="Sol/sağ degrade ışık, overlay renk geçirgenliği, kenar maskeleri ve noise dokusu"
          >
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                <TextInput
                  label="Sol Degrade (0-10)"
                  type="number"
                  value={leftGradient}
                  onChange={(v) => setLeftGradient(Number(v))}
                />
                <TextInput
                  label="Sağ Degrade (0-10)"
                  type="number"
                  value={rightGradient}
                  onChange={(v) => setRightGradient(Number(v))}
                />
                <TextInput
                  label="Overlay Opaklık (0.0 - 1.0)"
                  type="number"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(v) => setOverlayOpacity(Number(v))}
                />
                <TextInput
                  label="Kenar Yumuşatma (px)"
                  type="number"
                  value={fadeEdges}
                  onChange={(v) => setFadeEdges(Number(v))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SelectInput
                  label="Genişlik Boyutu"
                  value={width}
                  onChange={setWidth}
                  options={[
                    { value: '100%', label: 'Tam Ekran (100%)' },
                    { value: '85%', label: 'Odaklı (%85)' },
                    { value: '70%', label: 'Kompakt (%70)' },
                    { value: '1280px', label: 'Maksimum 1280px' },
                  ]}
                />
                <SelectInput
                  label="Sığdırma (Object Fit)"
                  value={imageFit}
                  onChange={setImageFit}
                  options={[
                    { value: 'cover', label: 'cover (Tam kapla)' },
                    { value: 'contain', label: 'contain (Orantılı sığdır)' },
                    { value: 'fill', label: 'fill (Esnet)' },
                  ]}
                />
                <TextInput
                  label="Overlay Rengi (CSS Color)"
                  value={overlayColor}
                  onChange={setOverlayColor}
                  placeholder="rgba(0,0,0,0.7)"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <ActionBtn
                  variant="primary"
                  icon="solar:refresh-bold"
                  onClick={handleApplyLiveSettings}
                >
                  Canlı Ayarları Uygula
                </ActionBtn>
                <div className="text-xs text-white/50">
                  Ayarlar mevcut aktif arka plana anında kesintisiz transition ile uygulanır.
                </div>
              </div>

              {/* Custom Image URL input */}
              <div className="border-t border-white/10 pt-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[280px] flex-1">
                    <TextInput
                      label="Özel Görsel URL"
                      placeholder="https://images.unsplash.com/..."
                      value={customImageUrl}
                      onChange={setCustomImageUrl}
                    />
                  </div>
                  <ActionBtn
                    variant="neutral"
                    icon="solar:link-circle-bold"
                    onClick={handleApplyCustomUrl}
                  >
                    Özel URL Yükle
                  </ActionBtn>
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* TAB 2: EDGE CASES & REGISTRY */}
      {activeTab === 'edge_cases' && (
        <div className="space-y-6">
          <NoticeBanner
            variant="warning"
            title="Registry Öncelik Çakışması Kuralları"
            description="Sayfadaki farklı bileşenler useBackgroundRegistration() çağırarak arka plan talep edebilir. Registry motoru en yüksek öncelik (priority) değerine sahip olanı BackgroundProvider'a enjekte eder."
          />

          <Section
            title="Öncelik Çakışma Arenası (Priority Arena)"
            description="İki farklı bileşenin registry'e farklı önceliklerle kayıt yapmasını simüle edin"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DemoCard
                title="Bileşen A (Düşük Öncelik)"
                badge="Priority: 50"
                description="Interstellar uzay görselini talep eder. Eğer daha yüksek öncelikli bir kayıt varsa devre dışı kalır."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Kayıt Durumu:</span>
                    <StateBadge
                      label="Durum"
                      value={lowPriorityRegistered ? 'Kayıtlı' : 'Pasif'}
                      variant={lowPriorityRegistered ? 'warning' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={lowPriorityRegistered ? 'danger' : 'neutral'}
                    onClick={() => {
                      setLowPriorityRegistered((p) => !p);
                      addLog('registryToggle', `Bileşen A (Priority 50) ${!lowPriorityRegistered ? 'kaydedildi' : 'kaldırıldı'}`);
                    }}
                  >
                    {lowPriorityRegistered ? 'Kaydı Kaldır' : 'Öncelik 50 ile Kaydet'}
                  </ActionBtn>
                </div>
              </DemoCard>

              <DemoCard
                title="Bileşen B (Yüksek Öncelik)"
                badge="Priority: 250"
                description="Blade Runner neon görselini talep eder. Önceliği 250 olduğu için Bileşen A'yı doğrudan ezer."
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Kayıt Durumu:</span>
                    <StateBadge
                      label="Durum"
                      value={highPriorityRegistered ? 'Kayıtlı' : 'Pasif'}
                      variant={highPriorityRegistered ? 'success' : 'neutral'}
                    />
                  </div>
                  <ActionBtn
                    fullWidth
                    variant={highPriorityRegistered ? 'danger' : 'primary'}
                    onClick={() => {
                      setHighPriorityRegistered((p) => !p);
                      addLog('registryToggle', `Bileşen B (Priority 250) ${!highPriorityRegistered ? 'kaydedildi' : 'kaldırıldı'}`);
                    }}
                  >
                    {highPriorityRegistered ? 'Kaydı Kaldır' : 'Öncelik 250 ile Kaydet'}
                  </ActionBtn>
                </div>
              </DemoCard>
            </div>
          </Section>

          <Section title="Background Modülü Doğrulama Matrisi">
            <FeatureChecklist
              items={[
                { label: 'AnimatePresence ile kesintisiz crossfade geçişleri', checked: true },
                { label: 'HTML5 Video arka planı (autoplay, muted, loop, playbackRate)', checked: true },
                { label: 'Çift yönlü dinamik gradient maskeleri (leftGradient, rightGradient)', checked: true },
                { label: 'Kenar yumuşatma gradyanı (fadeEdges) ve WebkitMaskImage desteği', checked: true },
                { label: 'Noise dokusu (overlay mix-blend-mode ve opaklık kontrolü)', checked: true },
                { label: 'Registry deklaratif öncelik çözümü (useBackgroundRegistration)', checked: true },
                { label: 'Bileşen unmount olduğunda registry temizliği (cleanup)', checked: true },
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
            description="Background modülü hem doğrudan eylem (imperative) hem de sayfa bazlı deklaratif (declarative registry) yaklaşımları destekler."
          />

          <CodeSnippet
            title="1. Doğrudan Görsel & Overlay Tanımlama"
            code={`import { useBackgroundActions } from '@/modules/background';

function MediaHero() {
  const { setBackground, resetBackground } = useBackgroundActions();

  const handleOpenCinema = () => {
    setBackground({
      image: 'https://image.tmdb.org/t/p/original/...jpg',
      fit: 'cover',
      position: 'center',
      overlay: true,
      overlayOpacity: 0.5,
      overlayColor: 'rgba(0,0,0,0.8)',
      leftGradient: 6,
      rightGradient: 6,
      fadeEdges: 24,
    });
  };

  return <button onClick={handleOpenCinema}>Sinematik Görseli Aç</button>;
}`}
          />

          <CodeSnippet
            title="2. Video Arka Planı ve Oynatma Kontrolleri"
            code={`import { useBackgroundActions, useBackgroundState } from '@/modules/background';

function TrailerSection() {
  const state = useBackgroundState();
  const { setBackground, toggleVideo, toggleMute } = useBackgroundActions();

  const playTrailer = () => {
    setBackground({
      video: '/trailers/teaser.mp4',
      isPlaying: true,
      overlay: true,
      overlayOpacity: 0.4,
      videoOptions: {
        autoplay: true,
        muted: true,
        loop: true,
      },
    });
  };

  return (
    <div>
      <button onClick={playTrailer}>Fragmanı Arka Planda Başlat</button>
      {state.isVideo && (
        <button onClick={toggleMute}>
          {state.videoOptions?.muted ? 'Sesi Aç' : 'Sessiz'}
        </button>
      )}
    </div>
  );
}`}
          />

          <CodeSnippet
            title="3. Sayfa Yaşam Döngüsünde Deklaratif Kayıt (useBackgroundRegistration)"
            code={`import { useBackgroundRegistration } from '@/modules/registry';

export default function MovieDetailPage({ movie }) {
  // Sayfa mount olduğunda arka plan otomatik olarak kayıt edilir,
  // sayfadan ayrılınca (unmount) arka plan otomatik temizlenir.
  useBackgroundRegistration(
    {
      image: movie.backdropUrl,
      overlay: true,
      overlayOpacity: 0.45,
      leftGradient: 4,
      rightGradient: 4,
      fadeEdges: 20,
    },
    { source: 'movie-detail-page', priority: 100 }
  );

  return <main>{movie.title}</main>;
}`}
          />
        </div>
      )}

      {/* Live State Inspector */}
      <Section title="Canlı Arka Plan Durumu (Telemetry)">
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

      {/* Log Console */}
      <LogConsole logs={logs} onClear={() => setLogs([])} title="Arka Plan Olay Günlüğü" />
    </div>
  );
}

