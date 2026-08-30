'use client';

import { useEffect, useState } from 'react';
import { ActionButton, Field, INPUT_BASE_CLASSES, SectionCard } from './account-edit-primitives';

function isVerifiedMfaFactor(factor) {
  return String(factor?.status || '')
    .trim()
    .toLowerCase() === 'verified';
}
import { getOAuthProviderIcon, getOAuthProviderLabel } from '@/domains/auth/utils/oauth';
import { Button, Input } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/ui/class-names';

function SurfaceEmailSection({ emailFlow, setEmailFlow, handleCompleteEmailChange }) {
  const [newEmail, setNewEmail] = useState(emailFlow?.newEmail || '');

  const handleChange = (event) => {
    const value = event.target.value;
    setNewEmail(value);
    setEmailFlow?.((prev) => ({ ...prev, newEmail: value }));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        type="email"
        value={newEmail}
        onChange={handleChange}
        placeholder="New email"
        aria-label="New email"
        className={INPUT_BASE_CLASSES}
      />
      <ActionButton
        type="button"
        onClick={handleCompleteEmailChange}
        disabled={emailFlow?.isSubmitting || !newEmail.trim()}
        className="w-full"
      >
        {emailFlow?.isSubmitting ? 'Verifying' : 'Verify and update email'}
      </ActionButton>
    </div>
  );
}

function SurfaceDeleteSection({ deleteFlow, setDeleteFlow, handleDeleteAccount }) {
  const [confirmText, setConfirmText] = useState(deleteFlow?.confirmText || '');

  const handleChange = (event) => {
    const value = event.target.value;
    setConfirmText(value);
    setDeleteFlow?.((prev) => ({ ...prev, confirmText: value }));
  };

  const canDelete = confirmText === 'DELETE';

  return (
    <div className="flex flex-col gap-2.5">
      <Input
        value={confirmText}
        onChange={handleChange}
        placeholder="Type DELETE to confirm"
        aria-label="Type DELETE to confirm"
        className={INPUT_BASE_CLASSES}
      />
      <ActionButton
        type="button"
        tone="danger"
        onClick={handleDeleteAccount}
        disabled={deleteFlow?.isSubmitting || !canDelete}
        className="w-full"
      >
        {deleteFlow?.isSubmitting ? 'Deleting' : 'Delete account'}
      </ActionButton>
    </div>
  );
}

function SurfaceSessionsSection({
  sessions: initialSessions = [],
  sessionsLoading = false,
  handleRevokeSession,
  handleSignOutOtherSessions,
  revokingSessions = false,
  sessionAction = null,
  formatDate,
}) {
  const [localSessions, setLocalSessions] = useState(initialSessions);
  const [localSessionAction, setLocalSessionAction] = useState(null);
  const [localRevokingOthers, setLocalRevokingOthers] = useState(false);

  useEffect(() => {
    setLocalSessions(initialSessions);
  }, [initialSessions]);

  const onRevoke = async (session) => {
    const sessionId = session.id;
    if (!sessionId || localSessionAction) return;

    setLocalSessionAction(sessionId);
    try {
      await handleRevokeSession?.(session);
      setLocalSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } finally {
      setLocalSessionAction(null);
    }
  };

  const onSignOutOthers = async () => {
    if (localRevokingOthers || revokingSessions) return;

    setLocalRevokingOthers(true);
    try {
      await handleSignOutOtherSessions?.();
      setLocalSessions((prev) => prev.filter((s) => s.isCurrent));
    } finally {
      setLocalRevokingOthers(false);
    }
  };

  if (sessionsLoading && localSessions.length === 0) {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={`session-skeleton-${index}`}
            className="flex w-full animate-pulse items-center justify-between gap-3 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="size-10 shrink-0 rounded-xl bg-white/10" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="h-3.5 w-32 rounded-full bg-white/10" />
                <div className="h-2.5 w-48 rounded-full bg-white/5" />
              </div>
            </div>
            <div className="h-6 w-16 shrink-0 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  const otherSessions = localSessions.filter((s) => !s.isCurrent);
  const isBusyRevokingOthers = localRevokingOthers || revokingSessions;

  return (
    <div className="flex flex-col gap-2.5">
      {localSessions.length === 0 ? (
        <div className="flex min-h-24 w-full items-center justify-center rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 p-4 text-center">
          <span className="text-xs text-white/40">No active sessions found</span>
        </div>
      ) : (
        localSessions.map((session) => {
          const hasIp = Boolean(session.ip);
          const activeTime = formatDate(session.lastActiveAt);
          const detailText = hasIp
            ? `Last active ${activeTime} · ${session.ip}`
            : `Last active ${activeTime}`;
          const isRevokingThis =
            localSessionAction === session.id || sessionAction === session.id;

          return (
            <div
              key={session.id}
              className="flex w-full items-center justify-between gap-3 rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 p-3 text-white transition-colors"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="center size-10 shrink-0 rounded-xl bg-white/5 ring-1 ring-inset ring-white/5 text-white/70">
                  <Icon icon="solar:monitor-smartphone-bold" size={20} aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-0.5">
                  <span className="truncate text-sm font-semibold text-white">
                    {session.deviceLabel || 'Browser session'}
                  </span>
                  <span className="truncate text-xs text-white/40">{detailText}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center">
                {session.isCurrent ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                    <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    Current
                  </span>
                ) : (
                  <Button
                    type="button"
                    disabled={Boolean(localSessionAction || sessionAction)}
                    onClick={() => void onRevoke(session)}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-error/80 transition-all hover:bg-error/10 hover:text-error disabled:opacity-50"
                  >
                    {isRevokingThis ? 'Revoking' : 'Revoke'}
                  </Button>
                )}
              </div>
            </div>
          );
        })
      )}

      {otherSessions.length > 0 ? (
        <Button
          type="button"
          onClick={() => void onSignOutOthers()}
          disabled={isBusyRevokingOthers}
          className="flex h-11 w-full items-center justify-center rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 text-xs font-semibold text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
        >
          {isBusyRevokingOthers ? 'Signing out' : 'Sign out other sessions'}
        </Button>
      ) : null}
    </div>
  );
}

export function AccountEditSettings({
  section = null,
  availableOAuthProviders = [],
  currentAuthEmail,
  deleteFlow,
  emailFlow,
  handleCompleteEmailChange,
  handleDeleteAccount,
  handleDeletePasskey,
  handleLinkProvider,
  handleRegisterPasskey,
  handleRenamePasskey,
  handleSignOutOtherSessions,
  handleRevokeSession,
  handleEnrollMfa,
  handleUnenrollMfa,
  handleUnlinkProvider,
  linkedOAuthProviders = [],
  passkeyAction = null,
  passkeySupported = false,
  passkeys = [],
  passkeysLoading = false,
  linkingProvider = null,
  revokingSessions = false,
  sessions = [],
  sessionsLoading = false,
  sessionAction = null,
  mfaFactors = [],
  mfaLoading = false,
  mfaAction = null,
  setDeleteFlow,
  setEmailFlow,
  unlinkingProvider,
  variant = 'default',
}) {
  const [editingPasskeyId, setEditingPasskeyId] = useState(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState('');
  const verifiedMfaFactors = mfaFactors.filter(isVerifiedMfaFactor);
  const hasUnfinishedMfaSetup = mfaFactors.some((factor) => !isVerifiedMfaFactor(factor));
  const showSection = (key) => !section || section === key;

  const beginPasskeyRename = (passkey) => {
    setEditingPasskeyId(passkey?.id || passkey?.passkeyId || null);
    setEditingPasskeyName(passkey?.friendlyName || passkey?.friendly_name || 'Passkey');
  };

  const cancelPasskeyRename = () => {
    setEditingPasskeyId(null);
    setEditingPasskeyName('');
  };

  const submitPasskeyRename = async () => {
    const saved = await handleRenamePasskey?.({
      friendlyName: editingPasskeyName,
      passkeyId: editingPasskeyId,
    });
    if (saved) cancelPasskeyRename();
  };

  const formatDate = (value) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
  };

  if (variant === 'surface' && section === 'email') {
    return (
      <SurfaceEmailSection
        emailFlow={emailFlow}
        setEmailFlow={setEmailFlow}
        handleCompleteEmailChange={handleCompleteEmailChange}
      />
    );
  }

  if (variant === 'surface' && section === 'providers') {
    return (
      <div className="flex flex-col gap-2.5">
        {linkedOAuthProviders.map((provider) => {
          const label = getOAuthProviderLabel(provider);
          const providerIcon = getOAuthProviderIcon(provider);
          const isDisconnecting = unlinkingProvider === provider;

          return (
            <div
              key={provider}
              className="flex h-11 w-full items-center justify-between rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 pl-4 p-1 text-white"
            >
              <div className="flex min-w-0 items-center gap-3">
                {providerIcon ? (
                  <Icon
                    icon={providerIcon}
                    size={18}
                    className="shrink-0 text-white/70"
                    aria-hidden="true"
                  />
                ) : null}
                <span className="truncate text-sm font-medium text-white">{label}</span>
              </div>
              <Button
                type="button"
                disabled={Boolean(unlinkingProvider)}
                onClick={() => handleUnlinkProvider(provider)}
                className="text-xs font-semibold text-error hover:bg-error/10 rounded-[16px] h-full px-2.5 py-1 transition-all disabled:opacity-50"
              >
                {isDisconnecting ? 'Disconnecting' : 'Disconnect'}
              </Button>
            </div>
          );
        })}

        {availableOAuthProviders.map((provider) => {
          const label = getOAuthProviderLabel(provider);
          const providerIcon = getOAuthProviderIcon(provider);
          const isConnecting = linkingProvider === provider;

          return (
            <Button
              key={provider}
              type="button"
              disabled={Boolean(linkingProvider)}
              onClick={() => void handleLinkProvider?.(provider)}
              className="flex h-11 w-full items-center justify-between rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex min-w-0 items-center gap-3">
                {providerIcon ? (
                  <Icon
                    icon={providerIcon}
                    size={18}
                    className="shrink-0 text-white/70"
                    aria-hidden="true"
                  />
                ) : null}
                <span className="truncate text-sm font-medium">
                  {isConnecting ? `Connecting ${label}` : `Connect ${label}`}
                </span>
              </span>
              <Icon icon="solar:link-linear" size={16} className="shrink-0 text-white/40" />
            </Button>
          );
        })}
      </div>
    );
  }

  if (variant === 'surface' && section === 'sessions') {
    return (
      <SurfaceSessionsSection
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        handleRevokeSession={handleRevokeSession}
        handleSignOutOtherSessions={handleSignOutOtherSessions}
        revokingSessions={revokingSessions}
        sessionAction={sessionAction}
        formatDate={formatDate}
      />
    );
  }

  if (variant === 'surface' && section === 'passkeys') {
    return (
      <div className="flex flex-col gap-2.5">
        {passkeys.map((passkey) => {
          const passkeyId = passkey?.id || passkey?.passkeyId;
          const friendlyName = passkey?.friendlyName || passkey?.friendly_name || 'Passkey';
          const isRenaming = editingPasskeyId === passkeyId;
          const isDeleting = passkeyAction === `deleting:${passkeyId}`;
          const isBusy = Boolean(passkeyAction);

          return (
            <div
              key={passkeyId}
              className={cn(
                'w-full rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 text-white',
                isRenaming ? 'flex flex-col gap-2.5 py-2.5' : 'flex h-11 items-center justify-between',
              )}
            >
              {isRenaming ? (
                <>
                  <Input
                    value={editingPasskeyName}
                    onChange={(event) => setEditingPasskeyName(event.target.value)}
                    aria-label="Passkey name"
                    autoFocus
                    className={INPUT_BASE_CLASSES}
                  />
                  <div className="flex gap-2.5">
                    <ActionButton
                      type="button"
                      disabled={!editingPasskeyName.trim() || isBusy}
                      onClick={() => void submitPasskeyRename()}
                      className="flex-1"
                    >
                      {passkeyAction === `renaming:${passkeyId}` ? 'Saving' : 'Save'}
                    </ActionButton>
                    <ActionButton
                      type="button"
                      disabled={isBusy}
                      onClick={cancelPasskeyRename}
                      className="flex-1"
                    >
                      Cancel
                    </ActionButton>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon icon="solar:key-bold" size={18} className="shrink-0 text-white/70" />
                    <span className="truncate text-sm font-medium text-white">{friendlyName}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      disabled={isBusy}
                      onClick={() => beginPasskeyRename(passkey)}
                      className="text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 rounded-lg px-2.5 py-1 transition-all"
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDeletePasskey?.(passkey)}
                      className="text-xs font-semibold text-error/80 hover:text-error hover:bg-error/10 rounded-lg px-2.5 py-1 transition-all"
                    >
                      {isDeleting ? 'Removing' : 'Remove'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        <ActionButton
          type="button"
          icon="solar:key-bold"
          onClick={() => void handleRegisterPasskey?.()}
          disabled={Boolean(passkeyAction) || passkeysLoading}
          className="w-full"
        >
          {passkeyAction === 'adding' ? 'Adding passkey' : 'Add passkey'}
        </ActionButton>
      </div>
    );
  }

  if (variant === 'surface' && section === 'authenticator') {
    return (
      <div className="flex flex-col gap-2.5">
        {verifiedMfaFactors.map((factor) => (
          <div
            key={factor.id}
            className="flex h-11 w-full items-center justify-between rounded-[20px] ring-1 ring-inset ring-white/5 bg-white/5 px-4 text-white"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Icon
                icon="solar:shield-check-bold"
                size={18}
                className="shrink-0 text-emerald-400"
              />
              <span className="truncate text-sm font-medium text-white">
                {factor.friendlyName || 'Authenticator app'}
              </span>
            </div>
            <Button
              type="button"
              disabled={Boolean(mfaAction)}
              onClick={() => void handleUnenrollMfa?.(factor)}
              className="text-xs font-semibold text-error/80 hover:text-error hover:bg-error/10 rounded-lg px-2.5 py-1 transition-all disabled:opacity-50"
            >
              {mfaAction === `removing:${factor.id}` ? 'Removing' : 'Remove'}
            </Button>
          </div>
        ))}

        {!verifiedMfaFactors.length ? (
          <ActionButton
            type="button"
            icon="solar:shield-check-bold"
            onClick={() => void handleEnrollMfa?.()}
            disabled={Boolean(mfaAction) || mfaLoading}
            className="w-full"
          >
            {mfaAction === 'adding'
              ? 'Starting setup'
              : hasUnfinishedMfaSetup
                ? 'Resume setup'
                : 'Add authenticator'}
          </ActionButton>
        ) : null}
      </div>
    );
  }

  if (variant === 'surface' && section === 'delete') {
    return (
      <SurfaceDeleteSection
        deleteFlow={deleteFlow}
        setDeleteFlow={setDeleteFlow}
        handleDeleteAccount={handleDeleteAccount}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {showSection('email') ? <SectionCard
        title="Email sign-in"
        variant={variant}
        summaryLabel={
          currentAuthEmail ? (
            <span className="text-xs font-medium text-white/40 lowercase">{currentAuthEmail}</span>
          ) : null
        }
      >
        <Field label="New email">
          <Input
            type="email"
            value={emailFlow.newEmail}
            onChange={(event) =>
              setEmailFlow((prev) => ({ ...prev, newEmail: event.target.value }))
            }
            className={INPUT_BASE_CLASSES}
          />
        </Field>
        <ActionButton
          type="button"
          onClick={handleCompleteEmailChange}
          disabled={emailFlow.isSubmitting}
          className="w-full sm:w-fit"
        >
          {emailFlow.isSubmitting ? 'Verifying' : 'Verify and update email'}
        </ActionButton>
      </SectionCard> : null}

      {showSection('recovery') ? <SectionCard
        title="Recovery methods"
        variant={variant}
        summaryLabel={`${1 + linkedOAuthProviders.length + passkeys.length} connected`}
      >
        <div className="flex flex-col divide-y divide-white/5 border-y border-white/5 text-sm text-white/70">
          <div className="flex items-center justify-between gap-2.5 py-2.5">
            <span className="flex items-center gap-2.5">
              <Icon icon="solar:letter-bold" size={16} />
              Email
            </span>
            <span className="text-white/40">{currentAuthEmail || 'Not available'}</span>
          </div>
          {linkedOAuthProviders.map((provider) => (
            <div
              key={`recovery-${provider}`}
              className="flex items-center justify-between gap-2.5 py-2.5"
            >
              <span className="flex items-center gap-2.5">
                <Icon icon={getOAuthProviderIcon(provider)} size={16} />
                {getOAuthProviderLabel(provider)}
              </span>
              <span className="text-white/40">Connected</span>
            </div>
          ))}
          {passkeys.map((passkey) => (
            <div
              key={`recovery-passkey-${passkey?.id || passkey?.passkeyId}`}
              className="flex items-center justify-between gap-2.5 py-2.5"
            >
              <span className="flex items-center gap-2.5">
                <Icon icon="solar:key-bold" size={16} />
                {passkey?.friendlyName || passkey?.friendly_name || 'Passkey'}
              </span>
              <span className="text-white/40">Passkey</span>
            </div>
          ))}
        </div>
      </SectionCard> : null}

      {showSection('providers') ? <SectionCard title="Connected providers" variant={variant}>
        {linkedOAuthProviders.length ? (
          <div className="flex flex-col divide-y divide-white/5 border-y border-white/5">
            {linkedOAuthProviders.map((provider) => {
              const label = getOAuthProviderLabel(provider);
              const icon = getOAuthProviderIcon(provider);
              const isDisconnecting = unlinkingProvider === provider;
              return (
                <div key={provider} className="flex items-center justify-between gap-2.5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/50 text-white/70 ring-1 ring-white/5 ring-inset">
                      {icon ? <Icon icon={icon} size={20} aria-hidden="true" /> : null}
                    </span>
                    <span className="truncate text-sm font-medium text-white">{label}</span>
                  </div>
                  <ActionButton
                    type="button"
                    tone="danger"
                    disabled={Boolean(unlinkingProvider)}
                    onClick={() => handleUnlinkProvider(provider)}
                    className="w-full sm:w-auto"
                  >
                    {isDisconnecting ? 'Disconnecting' : `Disconnect ${label}`}
                  </ActionButton>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm leading-6 text-white/40">No OAuth providers connected.</p>
        )}
        {availableOAuthProviders.length ? (
          <div className="flex flex-wrap items-center gap-2.5 border-t border-white/5 pt-2.5">
            <span className="w-full text-xs font-medium text-white/40 uppercase">
              Add a provider
            </span>
            {availableOAuthProviders.map((provider) => {
              const label = getOAuthProviderLabel(provider);
              const icon = getOAuthProviderIcon(provider);
              const isConnecting = linkingProvider === provider;
              return (
                <ActionButton
                  key={provider}
                  type="button"
                  icon={icon}
                  disabled={Boolean(linkingProvider)}
                  onClick={() => void handleLinkProvider?.(provider)}
                >
                  {isConnecting ? `Connecting ${label}` : `Connect ${label}`}
                </ActionButton>
              );
            })}
          </div>
        ) : null}
      </SectionCard> : null}

      {showSection('sessions') ? <SectionCard title="Active sessions" variant={variant}>
        <ActionButton
          type="button"
          onClick={() => void handleSignOutOtherSessions?.()}
          disabled={revokingSessions}
          className="w-full sm:w-fit"
        >
          {revokingSessions ? 'Signing out sessions' : 'Sign out other sessions'}
        </ActionButton>
        <div className="mt-2.5 flex flex-col divide-y divide-white/5 border-y border-white/5">
          {sessionsLoading ? (
            <p className="py-2.5 text-sm text-white/40">Loading sessions</p>
          ) : null}
          {!sessionsLoading && !sessions.length ? (
            <p className="py-2.5 text-sm text-white/40">No active sessions found.</p>
          ) : null}
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-2.5 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 text-sm font-medium text-white">
                  <Icon icon="solar:monitor-smartphone-bold" size={18} />
                  {session.deviceLabel || 'Browser session'}
                  {session.isCurrent ? (
                    <span className="text-success text-xs font-normal">This device</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-white/40">
                  Last active {formatDate(session.lastActiveAt)}
                  {session.ip ? ` · ${session.ip}` : ''}
                </p>
              </div>
              {!session.isCurrent ? (
                <ActionButton
                  type="button"
                  tone="danger"
                  disabled={Boolean(sessionAction)}
                  onClick={() => void handleRevokeSession?.(session)}
                  className="shrink-0"
                >
                  {sessionAction === session.id ? 'Revoking' : 'Revoke'}
                </ActionButton>
              ) : null}
            </div>
          ))}
        </div>
      </SectionCard> : null}

      {passkeySupported && showSection('passkeys') ? (
        <SectionCard title="Passkeys" summaryLabel={`${passkeys.length} connected`} variant={variant}>
          {passkeysLoading ? (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Icon icon="solar:refresh-bold" size={16} />
              Loading passkeys
            </div>
          ) : passkeys.length ? (
            <div className="flex flex-col divide-y divide-white/5 border-y border-white/5">
              {passkeys.map((passkey) => {
                const passkeyId = passkey?.id || passkey?.passkeyId;
                const friendlyName = passkey?.friendlyName || passkey?.friendly_name || 'Passkey';
                const isRenaming = editingPasskeyId === passkeyId;
                const isDeleting = passkeyAction === `deleting:${passkeyId}`;
                const isBusy = Boolean(passkeyAction);

                return (
                  <div
                    key={passkeyId}
                    className="flex flex-col gap-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black/50 text-white/70 ring-1 ring-white/5 ring-inset">
                        <Icon icon="solar:key-bold" size={20} aria-hidden="true" />
                      </span>
                      {isRenaming ? (
                        <Input
                          value={editingPasskeyName}
                          onChange={(event) => setEditingPasskeyName(event.target.value)}
                          aria-label="Passkey name"
                          autoFocus
                          className={INPUT_BASE_CLASSES}
                        />
                      ) : (
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="truncate text-sm font-medium text-white">
                            {friendlyName}
                          </span>
                          <span className="text-xs text-white/40">
                            Last used {formatDate(passkey?.lastUsedAt || passkey?.last_used_at)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2.5 sm:justify-end">
                      {isRenaming ? (
                        <>
                          <ActionButton
                            type="button"
                            disabled={!editingPasskeyName.trim() || Boolean(passkeyAction)}
                            onClick={() => void submitPasskeyRename()}
                          >
                            {passkeyAction === `renaming:${passkeyId}` ? 'Saving' : 'Save'}
                          </ActionButton>
                          <ActionButton
                            type="button"
                            disabled={Boolean(passkeyAction)}
                            onClick={cancelPasskeyRename}
                          >
                            Cancel
                          </ActionButton>
                        </>
                      ) : (
                        <>
                          <ActionButton
                            type="button"
                            disabled={isBusy}
                            onClick={() => beginPasskeyRename(passkey)}
                          >
                            Rename
                          </ActionButton>
                          <ActionButton
                            type="button"
                            tone="danger"
                            disabled={isBusy}
                            onClick={() => handleDeletePasskey?.(passkey)}
                          >
                            {isDeleting ? 'Removing' : 'Remove'}
                          </ActionButton>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm leading-6 text-white/40">No passkeys connected.</p>
          )}
          <ActionButton
            type="button"
            icon="solar:key-bold"
            onClick={() => void handleRegisterPasskey?.()}
            disabled={Boolean(passkeyAction) || passkeysLoading}
            aria-busy={passkeyAction === 'adding'}
            className="w-full sm:w-fit"
          >
            {passkeyAction === 'adding' ? 'Adding passkey' : 'Add passkey'}
          </ActionButton>
        </SectionCard>
      ) : null}

      {showSection('authenticator') ? <SectionCard
        title="Authenticator app"
        variant={variant}
        summaryLabel={verifiedMfaFactors.length ? 'AAL2 ready' : 'Optional'}
      >
        {mfaLoading ? <p className="text-sm text-white/40">Loading authenticator status</p> : null}
        {!mfaLoading && verifiedMfaFactors.length ? (
          <div className="flex flex-col divide-y divide-white/5 border-y border-white/5">
            {verifiedMfaFactors.map((factor) => (
              <div key={factor.id} className="flex items-center justify-between gap-2.5 py-2.5">
                <div className="flex min-w-0 flex-col gap-2.5">
                  <span className="text-sm font-medium text-white">
                    {factor.friendlyName || 'Authenticator app'}
                  </span>
                  <span className="text-xs text-white/40">
                    Enabled {formatDate(factor.createdAt)}
                  </span>
                </div>
                <ActionButton
                  type="button"
                  tone="danger"
                  disabled={Boolean(mfaAction)}
                  onClick={() => void handleUnenrollMfa?.(factor)}
                >
                  {mfaAction === `removing:${factor.id}` ? 'Removing' : 'Remove'}
                </ActionButton>
              </div>
            ))}
          </div>
        ) : null}
        {!mfaLoading && hasUnfinishedMfaSetup ? (
          <p className="text-sm leading-6 text-white/40">
            An earlier setup was not completed. Restart to generate a new setup key.
          </p>
        ) : null}
        {!verifiedMfaFactors.length ? (
          <ActionButton
            type="button"
            onClick={() => void handleEnrollMfa?.()}
            disabled={Boolean(mfaAction) || mfaLoading}
          >
            {mfaLoading
              ? 'Loading authenticator status'
              : mfaAction === 'adding'
                ? 'Starting setup'
                : hasUnfinishedMfaSetup
                  ? 'Restart authenticator setup'
                  : 'Add authenticator'}
          </ActionButton>
        ) : null}
      </SectionCard> : null}

      {showSection('delete') ? <SectionCard title="Delete account" variant={variant} headerClassName="border-error/40">
        <Field label="Type DELETE to confirm">
          <Input
            value={deleteFlow.confirmText}
            onChange={(event) =>
              setDeleteFlow((prev) => ({ ...prev, confirmText: event.target.value }))
            }
            placeholder="DELETE"
            className={INPUT_BASE_CLASSES}
          />
        </Field>
        <ActionButton
          type="button"
          tone="danger"
          onClick={handleDeleteAccount}
          disabled={deleteFlow.isSubmitting}
          className="w-full"
        >
          {deleteFlow.isSubmitting ? 'Deleting' : 'Delete account'}
        </ActionButton>
      </SectionCard> : null}
    </div>
  );
}
