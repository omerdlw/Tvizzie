'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { usePathname } from 'next/navigation'

import { EVENT_TYPES, globalEvents } from '@/lib/events'
import { useRegistry } from '@/lib/hooks/use-registry'
import { cn } from '@/lib/utils'
import { useNavigation, useNavHeight } from '@/modules/nav/hooks'
import { useToast } from '@/modules/notification/hooks'
import { useNavRegistry } from '@/modules/registry/context'
import Icon from '@/ui/icon'

const STYLE_PRESETS = Object.freeze({
  default: null,
  aurora: {
    card: {
      background:
        'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(0,0,0,0.82) 45%, rgba(245,158,11,0.16) 100%)',
      borderColor: 'rgba(255,255,255,0.16)',
    },
    icon: {
      background: 'rgba(16,185,129,0.18)',
      color: 'white',
    },
    title: {
      color: 'rgba(255,255,255,0.96)',
    },
    description: {
      color: 'rgba(255,255,255,0.72)',
      opacity: 1,
    },
  },
  warning: {
    card: {
      background:
        'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(0,0,0,0.84) 40%, rgba(251,191,36,0.18) 100%)',
      borderColor: 'rgba(248,113,113,0.35)',
    },
    icon: {
      background: 'rgba(248,113,113,0.22)',
      color: 'white',
    },
    title: {
      color: 'rgba(255,245,245,0.98)',
    },
    description: {
      color: 'rgba(255,225,225,0.72)',
      opacity: 1,
    },
  },
})

function Section({ title, description, children, className }) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm',
        className
      )}
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-[0.26em] text-white/72 uppercase">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-white/50">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-[0.22em] text-white/42 uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-white/35">{hint}</span> : null}
    </label>
  )
}

function ControlButton({
  children,
  onClick,
  active = false,
  tone = 'default',
  className,
}) {
  const toneClass =
    tone === 'danger'
      ? active
        ? 'border-error/45 bg-error/20 text-error'
        : 'border-error/20 bg-error/10 text-error/80 hover:bg-error/15'
      : active
        ? 'border-white/25 bg-white/16 text-white'
        : 'border-white/10 bg-white/6 text-white/70 hover:bg-white/10 hover:text-white'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-[18px] border px-4 text-[11px] font-semibold tracking-[0.18em] uppercase transition active:scale-95',
        toneClass,
        className
      )}
    >
      {children}
    </button>
  )
}

function DebugRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/6 py-2 last:border-b-0">
      <span className="text-xs tracking-[0.16em] text-white/38 uppercase">
        {label}
      </span>
      <span
        className={cn(
          'max-w-[65%] truncate text-right text-sm text-white/72',
          mono && 'font-mono text-xs'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function summarizeValue(value) {
  if (!value) return null
  if (typeof value === 'function') return '[function]'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[array:${value.length}]`
  if (typeof value === 'object') {
    if (value?.$$typeof) return '[react-element]'
    return `[object:${Object.keys(value).slice(0, 6).join(', ')}]`
  }
  return String(value)
}

function RegistrySnapshot({ value }) {
  const rows = useMemo(() => {
    if (!value) return []

    return Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, summarizeValue(entry)])
  }, [value])

  if (rows.length === 0) {
    return <p className="text-sm text-white/40">No resolved registry payload.</p>
  }

  return (
    <div className="space-y-2">
      {rows.map(([key, entry]) => (
        <DebugRow key={key} label={key} value={entry} mono={key === 'path'} />
      ))}
    </div>
  )
}

function ActionHarness({
  actionMode,
  actionExpanded,
  onToggleExpanded,
  onToast,
  onOpenConfirmation,
}) {
  if (actionMode === 'none') return null

  if (actionMode === 'compact') {
    return (
      <div className="mt-2.5 flex items-center gap-2">
        <ControlButton className="w-full" onClick={() => onToast('Compact action fired')}>
          Fire Action
        </ControlButton>
        <ControlButton className="w-full" onClick={onOpenConfirmation}>
          Confirm
        </ControlButton>
      </div>
    )
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <ControlButton onClick={() => onToast('Saved from action panel')}>
          Save State
        </ControlButton>
        <ControlButton onClick={onToggleExpanded}>
          {actionExpanded ? 'Collapse' : 'Expand'}
        </ControlButton>
      </div>
      {actionExpanded ? (
        <div className="rounded-[22px] border border-white/10 bg-white/5 p-3 text-sm text-white/62">
          This action block grows and shrinks to verify Nav height tracking.
          Mask mode should keep this panel rendered below the custom mask body.
        </div>
      ) : null}
    </div>
  )
}

function MaskHarness({ maskDensity, onDensityChange, maskClicks, onMaskClick }) {
  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-dashed border-white/15 bg-white/4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-white/38 uppercase">
            Mask Render Surface
          </p>
          <h3 className="mt-1 text-xl font-bold text-white">Custom JSX is in control</h3>
        </div>
        <button
          type="button"
          onClick={onMaskClick}
          className="rounded-[18px] border border-white/10 bg-white/8 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] text-white/72 uppercase transition hover:bg-white/12"
        >
          Clicks {maskClicks}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs tracking-[0.18em] text-white/42 uppercase">
          <span>Mask Density</span>
          <span>{maskDensity}</span>
        </div>
        <input
          type="range"
          min="1"
          max="6"
          value={maskDensity}
          onChange={(event) => onDensityChange(Number(event.target.value))}
          className="w-full accent-white"
        />
      </div>

      <div className="grid gap-2">
        {Array.from({ length: maskDensity }).map((_, index) => (
          <div
            key={index}
            className="rounded-[18px] border border-white/8 bg-black/30 px-4 py-3 text-sm text-white/58"
          >
            Dynamic row {index + 1} keeps the container mounted while replacing the
            standard Nav body.
          </div>
        ))}
      </div>
    </div>
  )
}

function DemoCard({ title, icon, body, tone = 'neutral' }) {
  const toneClasses = {
    accent: 'border-emerald-400/20 bg-emerald-400/8',
    warning: 'border-amber-400/20 bg-amber-400/8',
    neutral: 'border-white/8 bg-white/[0.035]',
  }

  return (
    <div
      className={cn(
        'rounded-[24px] border p-4 backdrop-blur-sm',
        toneClasses[tone]
      )}
    >
      <div className="mb-2 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-[16px] bg-white/8">
          <Icon icon={icon} size={18} />
        </div>
        <h3 className="text-sm font-semibold tracking-[0.18em] text-white/72 uppercase">
          {title}
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-white/50">{body}</p>
    </div>
  )
}

export default function NavTestPage() {
  const pathname = usePathname()
  const toast = useToast()
  const { navHeight } = useNavHeight()
  const { get, register, unregister } = useNavRegistry()
  const {
    activeIndex,
    activeItem,
    expanded,
    navigate,
    navigationItems,
    pathname: activePathname,
    setExpanded,
    statusState,
  } = useNavigation()

  const [title, setTitle] = useState('Nav Test Lab')
  const [description, setDescription] = useState(
    'Confirmation, mask, actions, height, merge priority and overlay precedence'
  )
  const [stylePreset, setStylePreset] = useState('default')
  const [iconMode, setIconMode] = useState('icon')
  const [actionMode, setActionMode] = useState('stacked')
  const [actionExpanded, setActionExpanded] = useState(false)
  const [actionsEnabled, setActionsEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [maskMode, setMaskMode] = useState('none')
  const [maskDensity, setMaskDensity] = useState(3)
  const [maskClicks, setMaskClicks] = useState(0)
  const [confirmationConfig, setConfirmationConfig] = useState(null)
  const [showUserOverride, setShowUserOverride] = useState(false)

  const notify = useCallback(
    (message) => {
      toast.info(message)
    },
    [toast]
  )

  const clearConfirmation = useCallback(() => {
    setConfirmationConfig(null)
  }, [])

  const openConfirmation = useCallback(
    ({ type = 'destructive' } = {}) => {
      const isAsync = type === 'async'
      const isFailure = type === 'failure'

      setConfirmationConfig({
        title:
          type === 'allow'
            ? 'Allow Experimental Override?'
            : 'Delete Mock Payload?',
        description:
          type === 'allow'
            ? 'This uses the same Nav confirmation channel with a non-destructive tone.'
            : 'This dialog is rendered by Nav itself. The page underneath should stay blurred until the flow finishes.',
        confirmText:
          type === 'allow'
            ? 'Allow'
            : isAsync
              ? 'Run Async'
              : isFailure
                ? 'Fail Request'
                : 'Delete',
        cancelText: 'Cancel',
        isDestructive: type !== 'allow',
        tone: type === 'allow' ? 'primary' : undefined,
        onCancel: clearConfirmation,
        onConfirm: async () => {
          if (isAsync) {
            await new Promise((resolve) => setTimeout(resolve, 1200))
            toast.success('Async confirmation resolved and Nav closed itself')
            clearConfirmation()
            return
          }

          if (isFailure) {
            toast.error('Confirmation promise rejected. Nav should remain locked open.')
            throw new Error('nav-test-confirmation-failure')
          }

          toast.success(
            type === 'allow'
              ? 'Non-destructive confirmation completed'
              : 'Destructive confirmation completed'
          )
          clearConfirmation()
        },
      })
    },
    [clearConfirmation, toast]
  )

  const iconValue = useMemo(() => {
    if (iconMode === 'poster') {
      return 'https://api.dicebear.com/7.x/shapes/svg?seed=nav-lab'
    }

    if (iconMode === 'none') return null

    return 'solar:widget-5-bold'
  }, [iconMode])

  const navActions = useMemo(() => {
    if (!actionsEnabled) return null

    return [
      {
        key: 'toast',
        tooltip: 'Toast',
        icon: 'solar:bell-bing-bold',
        order: 40,
        onClick: (event) => {
          event.stopPropagation()
          toast.success('Header action fired')
        },
      },
      {
        key: 'mask-toggle',
        tooltip: 'Toggle Mask',
        icon:
          maskMode === 'none'
            ? 'solar:mask-happly-bold'
            : 'solar:close-circle-bold',
        order: 30,
        onClick: (event) => {
          event.stopPropagation()
          setMaskMode((current) => (current === 'none' ? 'dense' : 'none'))
        },
      },
      {
        key: 'confirm',
        tooltip: 'Open Confirmation',
        icon: 'solar:danger-triangle-bold',
        order: 20,
        onClick: (event) => {
          event.stopPropagation()
          openConfirmation({ type: 'destructive' })
        },
      },
    ]
  }, [actionsEnabled, maskMode, openConfirmation, toast])

  const actionNode = useMemo(() => {
    if (actionMode === 'none') return null

    return (
      <ActionHarness
        actionExpanded={actionExpanded}
        actionMode={actionMode}
        onOpenConfirmation={() => openConfirmation({ type: 'allow' })}
        onToast={notify}
        onToggleExpanded={() => setActionExpanded((current) => !current)}
      />
    )
  }, [actionExpanded, actionMode, notify, openConfirmation])

  const maskNode = useMemo(() => {
    if (maskMode === 'none') return null

    return (
      <MaskHarness
        maskClicks={maskClicks}
        maskDensity={maskDensity}
        onDensityChange={setMaskDensity}
        onMaskClick={() => setMaskClicks((current) => current + 1)}
      />
    )
  }, [maskClicks, maskDensity, maskMode])

  useRegistry({
    nav: {
      title,
      description: description.trim() || null,
      icon: iconValue || undefined,
      actions: navActions,
      action: actionNode,
      confirmation: confirmationConfig,
      isLoading,
      mask: maskNode,
      style: STYLE_PRESETS[stylePreset],
    },
    background: {
      overlay: true,
      overlayOpacity: 0.82,
      noiseStyle: {
        opacity: 0.35,
      },
    },
    loading: {
      isLoading,
    },
  })

  useEffect(() => {
    if (!showUserOverride) return undefined

    register(
      pathname,
      {
        title: `${title} / USER SOURCE`,
        description: 'Merged from a higher priority registry source to test override resolution',
        style: STYLE_PRESETS.warning,
      },
      'user'
    )

    return () => {
      unregister(pathname, 'user')
    }
  }, [pathname, register, showUserOverride, title, unregister])

  const registrySnapshot = get(pathname)

  const emitApiError = useCallback(() => {
    globalEvents.emit(EVENT_TYPES.API_ERROR, {
      status: 503,
      message: 'Injected API failure from /nav-test',
      isCritical: true,
      retry: () => toast.info('Retry callback executed'),
    })
  }, [toast])

  const emitAppError = useCallback(() => {
    globalEvents.emit(EVENT_TYPES.APP_ERROR, {
      message: 'Injected application failure from Nav Test page',
      error: new Error('Nav test application error'),
      resetError: () => toast.info('Reset callback executed'),
    })
  }, [toast])

  const emitAuthStatus = useCallback(
    (type) => {
      globalEvents.emit(type, {
        session: {
          user: {
            id: 'nav-lab',
            name: 'Nav Test',
            email: 'nav@test.local',
          },
        },
        previousSession: {
          user: {
            id: 'nav-lab',
            name: 'Nav Test',
            email: 'nav@test.local',
          },
        },
      })
    },
    []
  )

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 pt-8 pb-24 sm:px-4 md:px-6 lg:pt-14">
        <section className="rounded-[36px] border border-white/10 bg-black/35 p-6 backdrop-blur-md sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold tracking-[0.24em] text-white/42 uppercase">
                Developer Surface
              </p>
              <h1 className="mt-3 font-zuume text-5xl uppercase sm:text-6xl md:text-7xl">
                Nav Test Lab
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/55">
                This page stress-tests standard card rendering, header actions,
                dynamic action height, mask takeover, confirmation overlays,
                status precedence and registry source overrides from one place.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <DemoCard
                title="Confirmation"
                icon="solar:shield-warning-bold"
                tone="warning"
                body="Open destructive, async and failing confirmations to verify blur lock, pending state and close behavior."
              />
              <DemoCard
                title="Mask"
                icon="solar:mask-happly-bold"
                tone="accent"
                body="Replace the entire card body with custom JSX while keeping the action component rendered underneath."
              />
              <DemoCard
                title="Registry Merge"
                icon="solar:layers-bold"
                body="Apply a higher priority user-source override to confirm merge resolution and live state telemetry."
              />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Section
              title="Card Content"
              description="Drive the standard Nav payload and verify live updates inside the floating card."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Title">
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-12 rounded-[18px] border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/8"
                  />
                </Field>

                <Field label="Icon Mode">
                  <div className="grid grid-cols-3 gap-2">
                    {['icon', 'poster', 'none'].map((value) => (
                      <ControlButton
                        key={value}
                        active={iconMode === value}
                        onClick={() => setIconMode(value)}
                      >
                        {value}
                      </ControlButton>
                    ))}
                  </div>
                </Field>

                <Field label="Description" className="md:col-span-2">
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/8"
                  />
                </Field>

                <Field label="Style Preset">
                  <div className="grid grid-cols-3 gap-2">
                    {['default', 'aurora', 'warning'].map((value) => (
                      <ControlButton
                        key={value}
                        active={stylePreset === value}
                        onClick={() => setStylePreset(value)}
                      >
                        {value}
                      </ControlButton>
                    ))}
                  </div>
                </Field>

                <Field label="Loading State">
                  <ControlButton
                    active={isLoading}
                    onClick={() => setIsLoading((current) => !current)}
                  >
                    {isLoading ? 'Disable Loading' : 'Enable Loading'}
                  </ControlButton>
                </Field>
              </div>
            </Section>

            <Section
              title="Action Layer"
              description="Validate header action icons, body action height measurement and their relationship with mask mode."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Action Icons">
                  <ControlButton
                    active={actionsEnabled}
                    onClick={() => setActionsEnabled((current) => !current)}
                  >
                    {actionsEnabled ? 'Icons On' : 'Icons Off'}
                  </ControlButton>
                </Field>

                <Field label="Action Body">
                  <div className="grid grid-cols-3 gap-2">
                    {['none', 'compact', 'stacked'].map((value) => (
                      <ControlButton
                        key={value}
                        active={actionMode === value}
                        onClick={() => setActionMode(value)}
                      >
                        {value}
                      </ControlButton>
                    ))}
                  </div>
                </Field>

                <Field
                  label="Mask Mode"
                  hint="Header action icons should disappear when mask is active."
                >
                  <div className="grid grid-cols-3 gap-2">
                    {['none', 'dense', 'tall'].map((value) => (
                      <ControlButton
                        key={value}
                        active={maskMode === value}
                        onClick={() => setMaskMode(value)}
                      >
                        {value}
                      </ControlButton>
                    ))}
                  </div>
                </Field>

                <Field label="Density">
                  <ControlButton
                    onClick={() =>
                      setMaskDensity((current) => (current >= 6 ? 1 : current + 1))
                    }
                  >
                    Increase Rows
                  </ControlButton>
                </Field>
              </div>
            </Section>

            <Section
              title="Overlay Priority"
              description="Trigger confirmation and status overlays together to verify Nav resolves them in the correct order."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ControlButton onClick={() => openConfirmation({ type: 'destructive' })} tone="danger">
                  Destructive Confirm
                </ControlButton>
                <ControlButton onClick={() => openConfirmation({ type: 'async' })}>
                  Async Confirm
                </ControlButton>
                <ControlButton onClick={() => openConfirmation({ type: 'failure' })}>
                  Failing Confirm
                </ControlButton>
                <ControlButton onClick={emitApiError}>API Error Overlay</ControlButton>
                <ControlButton onClick={emitAppError}>App Error Overlay</ControlButton>
                <ControlButton onClick={() => window.dispatchEvent(new Event('offline'))}>
                  Offline
                </ControlButton>
                <ControlButton onClick={() => window.dispatchEvent(new Event('online'))}>
                  Online
                </ControlButton>
                <ControlButton onClick={() => emitAuthStatus(EVENT_TYPES.AUTH_SIGN_IN)}>
                  Login Status
                </ControlButton>
                <ControlButton onClick={() => emitAuthStatus(EVENT_TYPES.AUTH_SIGN_OUT)}>
                  Logout Status
                </ControlButton>
              </div>
            </Section>

            <Section
              title="Navigation + Merge"
              description="Use direct nav controls and a user-source override to verify stack behavior and registry precedence."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <ControlButton active={expanded} onClick={() => setExpanded((current) => !current)}>
                  {expanded ? 'Collapse Nav' : 'Expand Nav'}
                </ControlButton>
                <ControlButton onClick={() => navigate('/')}>Go Home</ControlButton>
                <ControlButton onClick={() => navigate('/profile')}>Go Profile</ControlButton>
                <ControlButton
                  active={showUserOverride}
                  onClick={() => setShowUserOverride((current) => !current)}
                >
                  {showUserOverride ? 'Disable Override' : 'Enable Override'}
                </ControlButton>
              </div>
            </Section>
          </div>

          <div className="space-y-6">
            <Section
              title="Live Nav State"
              description="Read the state Nav is currently resolving, including overlays and mask/confirmation flags."
            >
              <DebugRow label="Current Route" value={activePathname} mono />
              <DebugRow label="Expanded" value={expanded ? 'true' : 'false'} />
              <DebugRow label="Active Index" value={String(activeIndex)} />
              <DebugRow
                label="Top Item"
                value={activeItem?.title || activeItem?.name || 'n/a'}
              />
              <DebugRow label="Overlay" value={activeItem?.isOverlay ? 'true' : 'false'} />
              <DebugRow
                label="Confirmation"
                value={activeItem?.isConfirmation ? 'true' : 'false'}
              />
              <DebugRow label="Mask" value={activeItem?.isMasked ? 'true' : 'false'} />
              <DebugRow label="Status" value={activeItem?.isStatus ? 'true' : 'false'} />
              <DebugRow
                label="Action Body"
                value={activeItem?.action ? 'present' : activeItem?.isConfirmation ? 'built-in' : 'none'}
              />
              <DebugRow label="Items In Stack" value={String(navigationItems.length)} />
              <DebugRow
                label="Status State"
                value={statusState?.type || 'none'}
              />
            </Section>

            <Section
              title="Resolved Registry"
              description="Snapshot of the merged Nav record for `/nav-test` after all source priorities are applied."
            >
              <RegistrySnapshot value={registrySnapshot} />
            </Section>

            <Section
              title="Visual Noise"
              description="A dense page body makes blur, focus lock and overlay transitions easier to evaluate visually."
            >
              <div className="grid gap-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[24px] border border-white/8 bg-white/[0.035] p-4"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-[16px] bg-white/8">
                        <Icon
                          icon={
                            index % 3 === 0
                              ? 'solar:bolt-bold'
                              : index % 3 === 1
                                ? 'solar:widget-2-bold'
                                : 'solar:sidebar-code-bold'
                          }
                          size={18}
                        />
                      </div>
                      <h3 className="text-sm font-semibold tracking-[0.18em] text-white/72 uppercase">
                        Surface {index + 1}
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed text-white/48">
                      Use this block to judge whether confirmation and status overlays
                      are isolating the Nav card correctly from the rest of the page.
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
        <div className="shrink-0" style={{ height: navHeight }} />
      </div>
    </div>
  )
}
