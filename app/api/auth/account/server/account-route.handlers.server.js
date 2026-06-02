import {
  createApiErrorResponse,
  buildRequestMeta,
  normalizeAction,
  ACCOUNT_ACTIONS,
} from './account-route.shared.server';
import { handlePasswordStatus } from './account-route.password-status.server';
import { handleReauthenticate } from './account-route.reauthenticate.server';
import { handleDeleteAccount } from './account-route.delete.server';
import { handleChangeEmail } from './account-route.email.server';
import { handleChangePassword } from './account-route.password-change.server';
import { handleSetPassword } from './account-route.password-set.server';

export async function handleAccountPost(request) {
  const body = await request.json().catch(() => ({}));
  const action = normalizeAction(body?.action);

  switch (action) {
    case ACCOUNT_ACTIONS.PASSWORD_STATUS:
      return handlePasswordStatus(request, body);
    case ACCOUNT_ACTIONS.REAUTHENTICATE:
      return handleReauthenticate(request, body);
    case ACCOUNT_ACTIONS.DELETE:
      return handleDeleteAccount(request, body);
    case ACCOUNT_ACTIONS.CHANGE_EMAIL:
      return handleChangeEmail(request, body);
    case ACCOUNT_ACTIONS.CHANGE_PASSWORD:
      return handleChangePassword(request, body);
    case ACCOUNT_ACTIONS.SET_PASSWORD:
      return handleSetPassword(request, body);
    default:
      return createApiErrorResponse(
        {
          code: 'INVALID_ACCOUNT_ACTION',
          message: action ? `Unsupported account action: ${action}` : 'action is required',
          retryable: false,
        },
        {
          requestMeta: buildRequestMeta(request, null),
          status: 400,
        }
      );
  }
}
