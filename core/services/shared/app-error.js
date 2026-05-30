import { normalizeValue } from '@/core/utils/string';

const DEFAULT_ERROR_CODE = 'INTERNAL_ERROR';
const DEFAULT_ERROR_MESSAGE = 'Request failed';

export class AppError extends Error {
  constructor(message = DEFAULT_ERROR_MESSAGE, { code = DEFAULT_ERROR_CODE, data = null, retryable = false, status = 500 } = {}) {
    super(normalizeValue(message) || DEFAULT_ERROR_MESSAGE);
    this.name = 'AppError';
    this.code = normalizeValue(code) || DEFAULT_ERROR_CODE;
    this.data = data;
    this.retryable = Boolean(retryable);
    this.status = Number.isFinite(Number(status)) ? Number(status) : 500;
  }
}

export function createAppError(message, options = {}) {
  return new AppError(message, options);
}

export function isAppError(error) {
  return error instanceof AppError || error?.name === 'AppError';
}

export function normalizeErrorMessage(error, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
  return normalizeValue(error?.message || fallbackMessage) || DEFAULT_ERROR_MESSAGE;
}

export function normalizeErrorCode(error, fallbackCode = DEFAULT_ERROR_CODE) {
  return normalizeValue(error?.code || fallbackCode) || DEFAULT_ERROR_CODE;
}

export function normalizeErrorStatus(error, fallbackStatus = 500) {
  const status = Number(error?.status ?? error?.statusCode ?? fallbackStatus);
  return Number.isFinite(status) ? status : fallbackStatus;
}
