import {
  ActionButton,
  EnablePasswordNotice,
  Field,
  INPUT_BASE_CLASSES,
  SecurityCard,
  SecuritySectionStack,
} from '@/features/account/settings/view-parts';

export default function AccountEditSecuritySection({
  canUsePasswordSecurity,
  currentAuthEmail,
  deleteFlow,
  emailFlow,
  handleCompleteEmailChange,
  handleCompletePasswordChange,
  handleDeleteAccount,
  handleSetPassword,
  isPasswordLinked,
  passwordFlow,
  setDeleteFlow,
  setEmailFlow,
  setPasswordFlow,
}) {
  return (
    <SecuritySectionStack>
      {!canUsePasswordSecurity ? <EnablePasswordNotice /> : null}

      {canUsePasswordSecurity ? (
        <SecurityCard
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
        </SecurityCard>
      ) : null}

      <SecurityCard title={isPasswordLinked ? 'Change Password' : 'Set Password'}>
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
      </SecurityCard>

      <SecurityCard title="Delete Account" className="lg:col-span-2">
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
      </SecurityCard>
    </SecuritySectionStack>
  );
}
