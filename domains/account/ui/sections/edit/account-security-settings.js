'use client';

import { ActionButton, Field, INPUT_BASE_CLASSES, SectionCard } from './account-edit-primitives';
import { getOAuthProviderIcon, getOAuthProviderLabel } from '@/domains/auth/utils/oauth';
import Icon from '@/ui/primitives/icon';

export function AccountSecuritySettings({
  canUsePasswordSecurity,
  currentAuthEmail,
  deleteFlow,
  emailFlow,
  handleCompleteEmailChange,
  handleCompletePasswordChange,
  handleDeleteAccount,
  handleUnlinkProvider,
  handleSetPassword,
  isPasswordLinked,
  linkedOAuthProviders = [],
  passwordFlow,
  setDeleteFlow,
  setEmailFlow,
  setPasswordFlow,
  unlinkingProvider,
}) {
  return (
    <div className="flex flex-col">
      {!canUsePasswordSecurity ? (
        <SectionCard title="Enable Password Sign-In">
          <div className="bg-white/5 p-3 text-sm leading-6 text-white/50">
            Email/password sign-in is not linked yet. Complete the set password flow below to
            continue.
          </div>
        </SectionCard>
      ) : null}

      {canUsePasswordSecurity ? (
        <SectionCard
          title="Change Email"
          summaryLabel={
            currentAuthEmail && (
              <span className="text-[10px] font-medium tracking-normal text-white/50 lowercase">
                {currentAuthEmail}
              </span>
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Current Password">
              <input
                type="password"
                value={emailFlow.currentPassword}
                onChange={(event) =>
                  setEmailFlow((prev) => ({
                    ...prev,
                    currentPassword: event.target.value,
                  }))
                }
                className={INPUT_BASE_CLASSES}
              />
            </Field>

            <Field label="New Email">
              <input
                type="email"
                value={emailFlow.newEmail}
                onChange={(event) =>
                  setEmailFlow((prev) => ({
                    ...prev,
                    newEmail: event.target.value,
                  }))
                }
                className={INPUT_BASE_CLASSES}
              />
            </Field>
          </div>

          <ActionButton
            type="button"
            onClick={handleCompleteEmailChange}
            disabled={emailFlow.isSubmitting}
            className="w-full sm:w-fit"
          >
            {emailFlow.isSubmitting ? 'Verifying' : 'Verify and Update'}
          </ActionButton>
        </SectionCard>
      ) : null}

      <SectionCard title={isPasswordLinked ? 'Change Password' : 'Set Password'}>
        {isPasswordLinked ? (
          <Field label="Current Password">
            <input
              type="password"
              value={passwordFlow.currentPassword}
              onChange={(event) =>
                setPasswordFlow((prev) => ({
                  ...prev,
                  currentPassword: event.target.value,
                }))
              }
              className={INPUT_BASE_CLASSES}
            />
          </Field>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="New Password">
            <input
              type="password"
              value={passwordFlow.newPassword}
              onChange={(event) =>
                setPasswordFlow((prev) => ({
                  ...prev,
                  newPassword: event.target.value,
                }))
              }
              className={INPUT_BASE_CLASSES}
            />
          </Field>

          <Field label="Confirm Password">
            <input
              type="password"
              value={passwordFlow.confirmPassword}
              onChange={(event) =>
                setPasswordFlow((prev) => ({
                  ...prev,
                  confirmPassword: event.target.value,
                }))
              }
              className={INPUT_BASE_CLASSES}
            />
          </Field>
        </div>

        <ActionButton
          type="button"
          onClick={isPasswordLinked ? handleCompletePasswordChange : handleSetPassword}
          disabled={passwordFlow.isSubmitting}
          className="w-full sm:w-fit"
        >
          {passwordFlow.isSubmitting
            ? isPasswordLinked
              ? 'Verifying'
              : 'Setting'
            : isPasswordLinked
              ? 'Verify and Update'
              : 'Verify and Set Password'}
        </ActionButton>
      </SectionCard>

      {linkedOAuthProviders.length ? (
        <SectionCard title="Connected providers" contentClassName="gap-3">
          <div className="flex flex-col gap-3">
            {linkedOAuthProviders.map((provider) => {
              const label = getOAuthProviderLabel(provider);
              const icon = getOAuthProviderIcon(provider);
              const isDisconnecting = unlinkingProvider === provider;

              return (
                <div key={provider} className="flex flex-wrap items-center gap-3 bg-white/5 p-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="center size-10 shrink-0 text-white/80">
                      {icon ? <Icon icon={icon} size={20} aria-hidden="true" /> : null}
                    </span>
                    <span className="min-w-0 text-sm font-medium text-white">{label}</span>
                  </div>
                  <ActionButton
                    type="button"
                    tone="danger"
                    disabled={Boolean(unlinkingProvider)}
                    onClick={() => handleUnlinkProvider(provider)}
                    className="w-full sm:ml-auto sm:w-auto"
                  >
                    {isDisconnecting ? 'Disconnecting' : `Disconnect ${label}`}
                  </ActionButton>
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Delete Account">
        <Field label="Type DELETE to Confirm">
          <input
            value={deleteFlow.confirmText}
            onChange={(event) =>
              setDeleteFlow((prev) => ({
                ...prev,
                confirmText: event.target.value,
              }))
            }
            placeholder="DELETE"
            className={INPUT_BASE_CLASSES}
          />
        </Field>

        {isPasswordLinked ? (
          <Field label="Current Password">
            <input
              type="password"
              value={deleteFlow.currentPassword}
              onChange={(event) =>
                setDeleteFlow((prev) => ({
                  ...prev,
                  currentPassword: event.target.value,
                }))
              }
              className={INPUT_BASE_CLASSES}
            />
          </Field>
        ) : null}

        <ActionButton
          type="button"
          tone="danger"
          onClick={handleDeleteAccount}
          disabled={deleteFlow.isSubmitting}
          className="w-full"
        >
          {deleteFlow.isSubmitting ? 'Deleting' : 'Delete Account'}
        </ActionButton>
      </SectionCard>
    </div>
  );
}
