'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { InteractiveFeatureBoundary } from '@/app/_shell/interactive-boundary';
import { useAuthState } from '@/modules/auth';
import { useBackgroundState } from '@/modules/background';
import { useModalState } from '@/modules/modal';
import { useNotificationState } from '@/modules/notification';
import { Button } from '@/ui/primitives';
import { cn } from '@/ui/class-names';
import Icon from '@/ui/primitives/icon';

// Module Workbenches
import WorkbenchAccount from './workbenches/account';
import WorkbenchAuth from './workbenches/auth';
import WorkbenchBackground from './workbenches/background';
import WorkbenchContextMenu from './workbenches/context-menu';
import WorkbenchControls from './workbenches/controls';
import WorkbenchErrorBoundary from './workbenches/error-boundary';
import WorkbenchLoading from './workbenches/loading';
import WorkbenchModal from './workbenches/modal';
import WorkbenchNav from './workbenches/nav';
import WorkbenchNotification from './workbenches/notification';
import WorkbenchRegistry from './workbenches/registry';
import WorkbenchIntegrations from './workbenches/integrations';

const MODULE_CATEGORIES = [
  { id: 'shell', name: 'Kabuk & Düzen' },
  { id: 'security', name: 'Kullanıcı & Güvenlik' },
  { id: 'surfaces', name: 'Yüzeyler & Etkileşim' },
  { id: 'infra', name: 'Altyapı & Entegrasyon' },
];

const MODULE_GROUPS = [
  ['nav', 'registry', 'background', 'controls'],
  ['auth', 'account', 'notification'],
  ['modal', 'context-menu', 'loading'],
  ['error-boundary', 'integrations'],
];

const MODULES_REGISTRY = [
  {
    id: 'nav',
    name: 'Navigation',
    category: 'Kabuk & Düzen',
    tag: 'Dock & HUD & Surface',
    description:
      'Akıcı alt dock menüsü, etkileşimli HUD modları (selection, progress, context), yüzey sihirbazları ve gezinme koruması.',
    icon: 'solar:compass-bold',
    component: WorkbenchNav,
  },
  {
    id: 'registry',
    name: 'Registry',
    category: 'Kabuk & Düzen',
    tag: 'External Store & Priority',
    description:
      'Tüm geçici UI tanımlarının merkezi harici hafızası, öncelik çözümlemesi ve strict şema denetleyicisi.',
    icon: 'solar:database-bold',
    component: WorkbenchRegistry,
  },
  {
    id: 'background',
    name: 'Background',
    category: 'Kabuk & Düzen',
    tag: 'Visual Canvas & Video',
    description:
      'Dinamik sinematik afiş, video arka plan oynatıcı, degrade (gradient), kenar yumuşatma ve gren (noise) stüdyosu.',
    icon: 'solar:gallery-bold',
    component: WorkbenchBackground,
  },
  {
    id: 'controls',
    name: 'Page Controls',
    category: 'Kabuk & Düzen',
    tag: 'Symmetric Dock Rails',
    description:
      'Nav dock etrafında simetrik left/right kontrol rayları, sıralama (order) hiyerarşisi ve yetim eleman eliminasyonu.',
    icon: 'solar:slider-minimalistic-horizontal-bold',
    component: WorkbenchControls,
  },
  {
    id: 'auth',
    name: 'Auth',
    category: 'Kullanıcı & Güvenlik',
    tag: 'Session & RBAC & Gate',
    description:
      'Kullanıcı oturumu, RBAC rol/kabiliyet matrisi, <AuthGate> bileşenleri ve açık yönlendirme saldırısı koruması.',
    icon: 'solar:shield-keyhole-bold',
    component: WorkbenchAuth,
  },
  {
    id: 'account',
    name: 'Account',
    category: 'Kullanıcı & Güvenlik',
    tag: 'Profile & Realtime Sync',
    description:
      'Aktif kullanıcı hesabı, profil senkronizasyonu, takma ad çözümleyici ve canlı profil abonelikleri.',
    icon: 'solar:user-circle-bold',
    component: WorkbenchAccount,
  },
  {
    id: 'notification',
    name: 'Notifications',
    category: 'Kullanıcı & Güvenlik',
    tag: 'Toast & Critical & Dedupe',
    description:
      'Hafif toast bildirimleri, geri almalı aksiyonlar, kalıcı kritik sistem uyarıları ve dedupeKey tekilleştirmesi.',
    icon: 'solar:bell-bold',
    component: WorkbenchNotification,
  },
  {
    id: 'modal',
    name: 'Modal',
    category: 'Yüzeyler & Etkileşim',
    tag: 'Stack & Responsive Sheet',
    description:
      'Çok katmanlı modal yığını, responsive drawer/sheet sözleşmesi, bare medya oynatıcı ve Promise dönüşleri.',
    icon: 'solar:maximize-square-bold',
    component: WorkbenchModal,
  },
  {
    id: 'context-menu',
    name: 'Context Menu',
    category: 'Yüzeyler & Etkileşim',
    tag: 'Contextual Actions & Priority',
    description:
      'Seçici hedefli sağ tık menüleri, iç içe öncelik yarışları, klavye kısayolları ve tehlikeli aksiyonlar.',
    icon: 'solar:menu-dots-square-bold',
    component: WorkbenchContextMenu,
  },
  {
    id: 'loading',
    name: 'Loading',
    category: 'Yüzeyler & Etkileşim',
    tag: 'Flicker-Free & Skeleton',
    description:
      'Titreme önleyici minDuration garantisi, özel sinematik skeleton katmanları ve sessiz arka plan yüklemeleri.',
    icon: 'solar:hourglass-bold',
    component: WorkbenchLoading,
  },
  {
    id: 'error-boundary',
    name: 'Error Boundary',
    category: 'Altyapı & Entegrasyon',
    tag: 'Isolation & Observability',
    description:
      'İzole bileşen/modül hata sınırları, dedupe zaman pencereli hata raporlama boru hattı ve kurtarma akışları.',
    icon: 'solar:shield-warning-bold',
    component: WorkbenchErrorBoundary,
  },
  {
    id: 'integrations',
    name: 'Integrations',
    category: 'Altyapı & Entegrasyon',
    tag: 'Cross-Module Workflows',
    description:
      'Modüller arası ortak senaryolar: Context Menu -> Modal -> Toast, Selection HUD -> Background Ops -> Progress.',
    icon: 'solar:layers-bold',
    component: WorkbenchIntegrations,
  },
];

function PlaygroundContent() {
  const [activeModuleId, setActiveModuleId] = useState('nav');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [layoutWidth, setLayoutWidth] = useState('comfortable'); // 'compact' | 'comfortable' | 'wide'
  const [searchQuery, setSearchQuery] = useState('');

  const authState = useAuthState();
  const bgState = useBackgroundState();
  const modalState = useModalState();
  const notifState = useNotificationState();

  const activeModule = useMemo(() => {
    return MODULES_REGISTRY.find((m) => m.id === activeModuleId) || MODULES_REGISTRY[0];
  }, [activeModuleId]);

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return MODULES_REGISTRY;
    const q = searchQuery.toLowerCase();
    return MODULES_REGISTRY.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.tag.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const activeNotifCount = Object.keys(notifState?.notifications || {}).length;
  const modalStackDepth = modalState?.stack?.length || 0;

  const ActiveComponent = activeModule.component;

  const widthClasses = {
    compact: 'max-w-3xl',
    comfortable: 'max-w-5xl',
    wide: 'max-w-7xl',
  };

  return (
    <div
      className={cn(
        'relative z-10 flex min-h-screen w-full font-sans text-white antialiased transition-colors duration-500',
        bgState?.hasBackground ? 'bg-black/70' : 'bg-[#070709]',
      )}
    >
      {/* Mobile Top Bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-black/80 px-4 backdrop-blur-xl md:hidden">
        <Button
          type="button"
          onClick={() => setIsMobileNavOpen((prev) => !prev)}
          className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white"
          aria-label="Toggle navigation"
        >
          <Icon icon={activeModule.icon} size={18} />
        </Button>
        <div className="flex items-center gap-2 font-mono text-xs font-semibold">
          <span className="text-white/50">Modül:</span>
          <span>{activeModule.name}</span>
        </div>
        <div className="size-2 rounded-full bg-emerald-400" />
      </div>

      {/* Mobile Backdrop */}
      {isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Vertical Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-16 flex-col items-center border-r border-white/10 bg-[#0a0a0d]/95 py-3 backdrop-blur-2xl transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0',
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Top Logo / Home Link */}
        <Link
          href="/"
          title="Ana Sayfa"
          className="flex size-10 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Icon icon="solar:widget-6-bold" size={20} />
        </Link>

        <div className="my-2 h-px w-6 bg-white/10" />

        {/* Module Icon List */}
        <nav className="flex flex-1 scrollbar-none flex-col items-center gap-1.5 overflow-y-auto py-1">
          {MODULE_GROUPS.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col items-center gap-1.5">
              {groupIdx > 0 && <div className="my-1.5 h-px w-6 bg-white/10" />}
              {group.map((modId) => {
                const mod = MODULES_REGISTRY.find((m) => m.id === modId);
                if (!mod) return null;
                const isActive = mod.id === activeModuleId;
                return (
                  <Button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setActiveModuleId(mod.id);
                      setIsMobileNavOpen(false);
                    }}
                    title={`${mod.name} (${mod.tag})`}
                    className={cn(
                      'group relative flex size-10 cursor-pointer items-center justify-center rounded-xl transition-all',
                      isActive
                        ? 'bg-white text-black shadow-lg shadow-white/10'
                        : 'text-white/50 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <Icon icon={mod.icon} size={18} />
                    {/* Tooltip on hover */}
                    <div className="pointer-events-none absolute left-full z-50 ml-3 hidden rounded-xl border border-white/10 bg-[#121216]/95 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-2xl backdrop-blur-md group-hover:block">
                      <div className="font-semibold">{mod.name}</div>
                      <div className="font-mono text-[10px] text-white/50">{mod.tag}</div>
                    </div>
                  </Button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Minimal Footer Status Indicator */}
        <div className="flex shrink-0 items-center justify-center pt-2">
          <div
            className="size-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            title={authState?.user ? `Bağlı: ${authState.user.email || 'Kullanıcı'}` : 'Misafir Modu'}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        {/* Top Sticky Workbench Bar */}
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#070709]/80 px-4 py-3 backdrop-blur-xl sm:px-10">
          {/* Active Module Title & Tag */}
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white">
              <Icon icon={activeModule.icon} size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white sm:text-base">{activeModule.name}</h1>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/70">
                  {activeModule.tag}
                </span>
                <span className="hidden rounded-md border border-white/5 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-white/50 sm:inline">
                  {activeModule.category}
                </span>
              </div>
              <p className="hidden max-w-xl text-xs text-white/50 sm:block">
                {activeModule.description}
              </p>
            </div>
          </div>

          {/* Controls: Width Selector & Live Status Ribbon */}
          <div className="flex items-center gap-3">
            {/* Live Global Health Indicators */}
            <div className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-1 font-mono text-[11px] lg:flex">
              <div
                className="flex items-center gap-1 px-2 py-0.5 text-white/60"
                title="Arka Plan Modülü Durumu"
              >
                <div
                  className={cn(
                    'size-1.5 rounded-full',
                    bgState?.hasBackground ? 'bg-emerald-400' : 'bg-white/20',
                  )}
                />
                <span>BG: {bgState?.hasBackground ? (bgState.isVideo ? 'Video' : 'Görsel') : 'Yok'}</span>
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div
                className="flex items-center gap-1 px-2 py-0.5 text-white/60"
                title="Aktif Modal Yığını Derinliği"
              >
                <Icon icon="solar:maximize-square-bold" size={12} className="opacity-70" />
                <span>Modal: {modalStackDepth}</span>
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div
                className="flex items-center gap-1 px-2 py-0.5 text-white/60"
                title="Aktif Bildirimler"
              >
                <Icon icon="solar:bell-bold" size={12} className="opacity-70" />
                <span>Notif: {activeNotifCount}</span>
              </div>
              <div className="h-3 w-px bg-white/10" />
              <div
                className="flex items-center gap-1 px-2 py-0.5 text-white/60"
                title="Aktif Oturum Rolü"
              >
                <Icon icon="solar:user-bold" size={12} className="opacity-70" />
                <span className="capitalize">{authState?.user?.role || 'Misafir'}</span>
              </div>
            </div>

            {/* Layout Width Selector */}
            <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-0.5">
              {[
                { id: 'compact', label: 'Kompakt', title: '768px Maksimum Genişlik' },
                { id: 'comfortable', label: 'Konforlu', title: '1024px Maksimum Genişlik' },
                { id: 'wide', label: 'Geniş', title: '1280px Maksimum Genişlik' },
              ].map((w) => (
                <Button
                  key={w.id}
                  type="button"
                  onClick={() => setLayoutWidth(w.id)}
                  title={w.title}
                  className={cn(
                    'cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[11px] transition-all',
                    layoutWidth === w.id
                      ? 'bg-white/15 font-semibold text-white'
                      : 'text-white/50 hover:text-white',
                  )}
                >
                  {w.label}
                </Button>
              ))}
            </div>
          </div>
        </header>

        {/* Workbench Content */}
        <main className="flex-1 px-4 py-8 pb-36 sm:px-10">
          <div className={cn('mx-auto transition-all duration-300', widthClasses[layoutWidth])}>
            <Suspense
              fallback={
                <div className="flex h-48 items-center justify-center font-mono text-xs text-white/50">
                  Modül yükleniyor: {activeModule.name}...
                </div>
              }
            >
              <ActiveComponent />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ModulesPlaygroundPage() {
  return (
    <InteractiveFeatureBoundary>
      <PlaygroundContent />
    </InteractiveFeatureBoundary>
  );
}

