'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { InteractiveFeatureBoundary } from '@/app/_shell/interactive-boundary';
import { useAuthState } from '@/modules/auth';
import { useBackgroundState } from '@/modules/background';
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

const MODULE_GROUPS = [
  ['nav', 'registry', 'background', 'controls'],
  ['auth', 'account', 'notification'],
  ['modal', 'context-menu', 'loading'],
  ['error-boundary', 'integrations'],
];

const MODULES_REGISTRY = [
  { id: 'nav', name: 'Navigation', icon: 'solar:compass-bold', component: WorkbenchNav },
  { id: 'registry', name: 'Registry', icon: 'solar:database-bold', component: WorkbenchRegistry },
  {
    id: 'background',
    name: 'Background',
    icon: 'solar:gallery-bold',
    component: WorkbenchBackground,
  },
  {
    id: 'controls',
    name: 'Page Controls',
    icon: 'solar:slider-minimalistic-horizontal-bold',
    component: WorkbenchControls,
  },
  { id: 'auth', name: 'Auth', icon: 'solar:shield-keyhole-bold', component: WorkbenchAuth },
  { id: 'account', name: 'Account', icon: 'solar:user-circle-bold', component: WorkbenchAccount },
  {
    id: 'notification',
    name: 'Notifications',
    icon: 'solar:bell-bold',
    component: WorkbenchNotification,
  },
  { id: 'modal', name: 'Modal', icon: 'solar:maximize-square-bold', component: WorkbenchModal },
  {
    id: 'context-menu',
    name: 'Context Menu',
    icon: 'solar:menu-dots-square-bold',
    component: WorkbenchContextMenu,
  },
  { id: 'loading', name: 'Loading', icon: 'solar:hourglass-bold', component: WorkbenchLoading },
  {
    id: 'error-boundary',
    name: 'Error Boundary',
    icon: 'solar:shield-warning-bold',
    component: WorkbenchErrorBoundary,
  },
  {
    id: 'integrations',
    name: 'Integrations',
    icon: 'solar:layers-bold',
    component: WorkbenchIntegrations,
  },
];

function PlaygroundContent() {
  const [activeModuleId, setActiveModuleId] = useState('nav');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const authState = useAuthState();

  const activeModule = useMemo(() => {
    return MODULES_REGISTRY.find((m) => m.id === activeModuleId) || MODULES_REGISTRY[0];
  }, [activeModuleId]);

  const bgState = useBackgroundState();
  const ActiveComponent = activeModule.component;

  return (
    <div
      className={cn(
        'relative z-10 flex min-h-screen w-full font-sans text-white antialiased transition-colors duration-500',
        bgState?.hasBackground ? 'bg-black/60' : 'bg-[#070709]',
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
        <div className="size-2 rounded-full bg-emerald-400" />
      </div>

      {/* Mobile Backdrop */}
      {isMobileNavOpen && (
        <div
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Vertical Icon-Only Sidebar */}
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
                    title={mod.name}
                    className={cn(
                      'group relative flex size-10 cursor-pointer items-center justify-center rounded-xl transition-all',
                      isActive
                        ? 'bg-white text-black shadow-md'
                        : 'text-white/50 hover:bg-white/10 hover:text-white',
                    )}
                  >
                    <Icon icon={mod.icon} size={18} />
                    {/* Tooltip on hover */}
                    <span className="pointer-events-none absolute left-full z-50 ml-3 hidden rounded-lg border border-white/10 bg-[#121216]/95 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white shadow-xl backdrop-blur-md group-hover:block">
                      {mod.name}
                    </span>
                  </Button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Minimal Footer Dot */}
        <div className="flex shrink-0 items-center justify-center pt-2">
          <div
            className="size-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
            title={authState?.user ? `Connected: ${authState.user.email || 'User'}` : 'Guest Mode'}
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col pt-14 md:pt-0">
        {/* Spacious Workbench Container */}
        <main className="flex-1 px-4 py-8 pb-36 sm:px-10">
          <div className="mx-auto max-w-3xl">
            <Suspense
              fallback={
                <div className="flex h-48 items-center justify-center font-mono text-xs text-white/50">
                  Loading {activeModule.name}
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
