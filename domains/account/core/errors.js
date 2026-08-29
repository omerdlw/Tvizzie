export class AccountCoreError extends Error {
  constructor(code, message, { status = 500 } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function createAccountCoreError(code, message, options) {
  return new AccountCoreError(code, message, options);
}

export function isAccountCoreError(error) {
  return error instanceof AccountCoreError;
}
