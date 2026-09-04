'use client';

import { useState } from 'react';
import { cn } from '@/ui/class-names';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';

// Safe JSON serialization that handles circular structures, DOM elements, and errors
export function safeStringify(data) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      data,
      (_key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value instanceof Error) {
          return { name: value.name, message: value.message, stack: value.stack };
        }
        if (value instanceof Set) return Array.from(value);
        if (value instanceof Map) return Object.fromEntries(value);
        if (typeof window !== 'undefined') {
          if (value instanceof Window) return '[Window]';
          if (value instanceof Document) return '[Document]';
          if (value instanceof Element) return `[Element <${value.tagName.toLowerCase()}>]`;
          if (value instanceof Node) return '[Node]';
        }
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      },
      2,
    );
  } catch (err) {
    return `[JSON Error: ${err.message}]`;
  }
}

export function Section({ title, description, children, badge, actions, className }) {
  return (
    <div
      className={cn(
        'space-y-4 rounded-2xl border border-white/10 bg-[#0c0c0e]/80 p-5 backdrop-blur-xl sm:p-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold tracking-wide text-white">{title}</h3>
          {badge && (
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-white/70">
              {badge}
            </span>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {description && <p className="-mt-2 text-xs leading-relaxed text-white/50">{description}</p>}
      <div>{children}</div>
    </div>
  );
}

export function StateBadge({ label, value, variant = 'neutral' }) {
  const variantStyles = {
    neutral: 'bg-white/5 text-white/70 border-white/10',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs',
        variantStyles[variant] || variantStyles.neutral,
      )}
    >
      <span className="text-white/50">{label}:</span>
      <span className="font-semibold text-white">{String(value ?? '—')}</span>
    </div>
  );
}

export function MetricPill({ icon, label, value, color = 'neutral' }) {
  const colors = {
    neutral: 'text-white/80 border-white/10 bg-white/5',
    emerald: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10',
    amber: 'text-amber-300 border-amber-500/20 bg-amber-500/10',
    rose: 'text-rose-300 border-rose-500/20 bg-rose-500/10',
    sky: 'text-sky-300 border-sky-500/20 bg-sky-500/10',
    purple: 'text-purple-300 border-purple-500/20 bg-purple-500/10',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-xs',
        colors[color] || colors.neutral,
      )}
    >
      {icon && <Icon icon={icon} size={14} className="shrink-0 opacity-70" />}
      <span className="opacity-60">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

export function ActionBtn({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  size = 'sm',
  className,
  icon,
}) {
  const variantStyles = {
    default: 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10',
    primary: 'bg-white text-black hover:bg-white/80 border-transparent font-medium shadow-sm',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30',
    success: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30',
    purple: 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border-purple-500/30',
  };

  const sizeStyles = {
    xs: 'px-2.5 py-1 text-xs h-7',
    sm: 'px-3 py-1.5 text-xs h-8',
    md: 'px-4 py-2 text-sm h-9',
  };

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border transition-colors disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant] || variantStyles.default,
        sizeStyles[size] || sizeStyles.sm,
        className,
      )}
    >
      {icon && <Icon icon={icon} size={14} className="shrink-0" />}
      <span>{children}</span>
    </Button>
  );
}

export function TextInput({ label, value, onChange, placeholder, type = 'text', className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label className="block text-xs font-medium text-white/50">{label}</label>}
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 font-mono text-xs text-white transition-colors placeholder:text-white/40 focus:border-white/20 focus:bg-white/10 focus:outline-none"
      />
    </div>
  );
}

export function SelectInput({ label, value, onChange, options = [], className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label className="block text-xs font-medium text-white/50">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-9 w-full rounded-xl border border-white/10 bg-[#121216] px-2.5 text-xs text-white transition-colors focus:border-white/20 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-neutral-900 text-white">
            {opt.label || opt.value}
          </option>
        ))}
      </select>
    </div>
  );
}

export function JsonViewer({ data, title = 'JSON', maxHeight = '160px', defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const formatted = safeStringify(data);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2 font-mono text-xs text-white/60">
          <Icon
            icon={isOpen ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
            size={12}
            className="text-white/50"
          />
          <span className="font-semibold text-white/80">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen && (
            <Button
              type="button"
              onClick={handleCopy}
              className="font-mono text-xs text-white/50 transition-colors hover:text-white"
            >
              {copied ? 'Kopyalandı ✓' : 'Kopyala'}
            </Button>
          )}
          <span className="font-mono text-xs text-white/40">{isOpen ? 'Gizle' : 'Görüntüle'}</span>
        </div>
      </div>
      {isOpen && (
        <pre
          className="overflow-auto border-t border-white/5 p-3 font-mono text-xs leading-relaxed text-white/70"
          style={{ maxHeight }}
        >
          {formatted || 'null'}
        </pre>
      )}
    </div>
  );
}

export function LogConsole({ logs = [], onClear, title = 'Logs' }) {
  const [isOpen, setIsOpen] = useState(false);

  if (logs.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/60">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2 font-mono text-xs text-white/60">
          <Icon
            icon={isOpen ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
            size={12}
            className="text-white/50"
          />
          <span className="font-semibold text-white/80">{title}</span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-xs text-white/80 font-bold">
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onClear && (
            <Button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="font-mono text-xs text-white/50 transition-colors hover:text-white"
            >
              Temizle
            </Button>
          )}
          <span className="font-mono text-xs text-white/40">{isOpen ? 'Gizle' : 'Göster'}</span>
        </div>
      </div>
      {isOpen && (
        <div className="max-h-52 space-y-1 overflow-auto border-t border-white/5 p-2 font-mono text-xs">
          {logs.map((log, i) => (
            <div
              key={i}
              className="flex items-start gap-2 border-b border-white/5 py-1 last:border-0"
            >
              <span className="shrink-0 text-white/40">{log.time}</span>
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium',
                  log.type === 'error'
                    ? 'bg-rose-500/20 text-rose-300'
                    : log.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : log.type === 'warning'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-white/10 text-white/70',
                )}
              >
                {log.action}
              </span>
              <span className="break-all text-white/80">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── YENİ: Segmented Tab Bar (Her Modül İçinde Gezinme) ────────────────────────
export function SegmentedTabs({ tabs = [], activeTab, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0a0d] p-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs transition-all',
              isActive
                ? 'bg-white font-semibold text-black shadow-sm'
                : 'text-white/60 hover:bg-white/5 hover:text-white',
            )}
          >
            {tab.icon && <Icon icon={tab.icon} size={14} className="shrink-0" />}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 py-0.2 text-[10px]',
                  isActive ? 'bg-black/15 text-black' : 'bg-white/10 text-white/70',
                )}
              >
                {tab.badge}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// ── YENİ: Demo Kartı (Zengin Vitrin Kartı) ───────────────────────────────────
export function DemoCard({
  title,
  subtitle,
  badge,
  badgeVariant = 'neutral',
  icon,
  children,
  action,
  footer,
  className,
}) {
  return (
    <div
      className={cn(
        'group flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]',
        className,
      )}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80">
                <Icon icon={icon} size={15} />
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-white">{title}</div>
              {subtitle && <div className="text-[11px] text-white/50">{subtitle}</div>}
            </div>
          </div>
          {badge && <StateBadge label="Tip" value={badge} variant={badgeVariant} />}
        </div>
        {children && <div className="text-xs text-white/70">{children}</div>}
      </div>

      {(action || footer) && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
          {footer && <div className="text-[11px] text-white/40">{footer}</div>}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
    </div>
  );
}

// ── YENİ: Özellik ve Sözleşme Kontrol Listesi (Checklist) ───────────────────
export function FeatureChecklist({ features = [] }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {features.map((feat, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-2.5"
        >
          <div
            className={cn(
              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full',
              feat.tested ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40',
            )}
          >
            <Icon icon={feat.tested ? 'solar:check-read-bold' : 'solar:record-minimalistic-bold'} size={11} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-white">{feat.name}</div>
            <div className="text-[11px] text-white/50">{feat.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── YENİ: Kopyalanabilir Kod Parçacığı ───────────────────────────────────────
export function CodeSnippet({ code, title = 'Kod Örneği' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#070709]">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 font-mono text-white/50">
          <Icon icon="solar:code-bold" size={13} />
          <span>{title}</span>
        </div>
        <Button
          type="button"
          onClick={handleCopy}
          className="cursor-pointer font-mono text-[11px] text-white/60 hover:text-white"
        >
          {copied ? 'Kopyalandı ✓' : 'Kopyala'}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-emerald-400/90">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── YENİ: Bilgilendirme ve Kural Kutucuğu (Notice Banner) ───────────────────
export function NoticeBanner({ title, description, variant = 'info', icon }) {
  const variants = {
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    danger: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  };

  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-3.5 text-xs', variants[variant])}>
      {icon && <Icon icon={icon} size={16} className="mt-0.5 shrink-0 opacity-80" />}
      <div className="space-y-0.5">
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="text-white/70 leading-relaxed">{description}</div>}
      </div>
    </div>
  );
}
