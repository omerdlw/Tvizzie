import { cn } from '@/core/utils';
import { DESTRUCTIVE_ACTION_TONE_CLASS } from '@/core/constants';
import {
  AccountHeroReveal,
  AccountNavReveal,
  AccountSectionNav,
  AccountSectionReveal,
} from '@/features/account/shared/layout';
import { AccountGridDivider, AccountGridFrame } from '@/features/account/shared/grid-animation';
import { AccountSectionHeading } from '@/features/account/shared/section-wrapper';
import { ACCOUNT_ROUTE_SHELL_CLASS, ACCOUNT_SECTION_SHELL_CLASS } from '@/features/account/utils';
import AccountHero from '@/features/account/shared/hero';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import NavHeightSpacer from '@/ui/elements/nav-height-spacer';
import Icon from '@/ui/icon';

export const INPUT_BASE_CLASSES =
  'h-11 w-full  border border-white/15 bg-primary px-3 text-sm text-white outline-none transition-colors placeholder:text-white/50 focus:border-white';
export const TEXTAREA_BASE_CLASSES = `${INPUT_BASE_CLASSES} min-h-[150px] resize-y py-3`;

const BUTTON_BASE_CLASSES =
  'border border-white/15 bg-black px-3 py-2 text-white transition-colors hover:bg-white/10 disabled:opacity-60';
const BUTTON_FRAME_CLASSES =
  'inline-flex h-10 items-center justify-center gap-2  px-4 text-[11px] font-bold tracking-widest uppercase transition-colors disabled:cursor-not-allowed';

export function ActionButton({ children, className, tone = 'default', icon = null, ...props }) {
  return (
    <button
      className={cn(
        BUTTON_FRAME_CLASSES,
        tone === 'danger' ? DESTRUCTIVE_ACTION_TONE_CLASS : BUTTON_BASE_CLASSES,
        className
      )}
      {...props}
    >
      {icon ? <Icon icon={icon} size={16} /> : null}
      {children}
    </button>
  );
}

export function StatusState({ title, description }) {
  return (
    <section className="account-detail-grid-subsection bg-transparent">
      <AccountSectionReveal>
        <div className={cn(`${ACCOUNT_SECTION_SHELL_CLASS} flex min-h-[42vh] items-center justify-center`)}>
          <div className="w-full max-w-xl  border border-white/15 bg-black p-6 text-center">
            <p className="text-[11px] font-semibold tracking-widest uppercase">Account Editor</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">{description}</p>
          </div>
        </div>
      </AccountSectionReveal>
    </section>
  );
}

export function EditGridShell({
  children,
  heroProfile,
  likesCount,
  followerCount,
  followingCount,
  listsCount,
  watchedCount,
  watchlistCount,
  profileHandle,
}) {
  return (
    <div className="account-detail-grid-content relative min-h-dvh w-full overflow-hidden bg-black">
      <AccountGridFrame
        routeKey={profileHandle ? `account-edit-${profileHandle}` : 'account-edit'}
        className={cn('flex flex-col gap-0 px-0', ACCOUNT_ROUTE_SHELL_CLASS)}
      >
        <div className="relative">
          <AccountHeroReveal>
            <AccountHero
              profile={heroProfile}
              likesCount={likesCount}
              followerCount={followerCount}
              followingCount={followingCount}
              listsCount={listsCount}
              watchedCount={watchedCount}
              watchlistCount={watchlistCount}
            />
          </AccountHeroReveal>
          <AccountNavReveal className="absolute inset-x-0 top-0 z-20">
            <AccountSectionNav activeKey="overview" username={profileHandle} />
          </AccountNavReveal>
        </div>
        <div className="account-detail-hero-divider">
          <AccountGridDivider />
        </div>
        <main className="account-detail-grid-main">{children}</main>
        <NavHeightSpacer />
      </AccountGridFrame>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
  revealDelay = 0,
  summaryLabel,
}) {
  return (
    <section className="account-detail-grid-subsection bg-transparent">
      <AccountSectionReveal delay={revealDelay}>
        <div className={cn(`${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col`, className)}>
          <AccountSectionHeading title={title} summaryLabel={summaryLabel} />
          <div className={cn('account-detail-section-body', contentClassName)}>
            {description ? <p className="text-sm leading-6 text-white/70">{description}</p> : null}
            {children}
          </div>
        </div>
      </AccountSectionReveal>
    </section>
  );
}

export function SecuritySectionStack({ children }) {
  return (
    <section className="account-detail-grid-subsection bg-transparent">
      <AccountSectionReveal>
        <div className={cn(`${ACCOUNT_SECTION_SHELL_CLASS} flex flex-col`)}>
          <AccountSectionHeading title="Security" />
          <div className="account-detail-section-body grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.62fr)]">
            {children}
          </div>
        </div>
      </AccountSectionReveal>
    </section>
  );
}

export function SecurityCard({ title, children, className, summaryLabel }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-4  border border-white/5 bg-black/40 p-4', className)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="min-w-0 text-sm font-semibold tracking-widest text-white/70 uppercase">{title}</h3>
        {summaryLabel ? <div className="min-w-0 text-right">{summaryLabel}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function EnablePasswordNotice() {
  return (
    <div className=" border border-white/5 bg-white/10 p-4 text-sm leading-6 text-white/70 lg:col-span-2">
      Email/password sign-in is not linked yet. Complete the set password flow below to continue.
    </div>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      <span className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-5 text-white/70">{hint}</span> : null}
    </label>
  );
}

export function MediaField({
  fieldLabel,
  value,
  placeholder = 'https://',
  preview,
  previewAlt,
  previewClassName,
  isUploading,
  isDisabled,
  onChange,
  onClear,
  onOpenUpload,
}) {
  const shouldDisableActions = isDisabled || isUploading;

  return (
    <div className="account-edit-media-field">
      <div className="space-y-3">
        <Field label={fieldLabel}>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className={INPUT_BASE_CLASSES}
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            type="button"
            onClick={onOpenUpload}
            disabled={shouldDisableActions}
            icon={isUploading ? 'solar:refresh-bold' : 'solar:upload-bold'}
          >
            {isUploading ? 'Uploading' : 'Upload Media'}
          </ActionButton>

          <ActionButton type="button" onClick={onClear} disabled={!value || shouldDisableActions}>
            Clear
          </ActionButton>
        </div>
      </div>

      <div className="account-edit-media-preview-wrap">
        <div
          className={cn(
            'account-edit-media-preview overflow-hidden  border border-white/5 bg-white/10',
            previewClassName
          )}
        >
          {preview ? (
            <AdaptiveImage
              mode="img"
              src={preview}
              alt={previewAlt}
              decoding="async"
              className="h-full w-full object-cover"
              wrapperClassName="h-full w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/10 text-white/70">
              <Icon icon="solar:gallery-bold" size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
