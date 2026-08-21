import { requestJson } from '@/shared/client-request';
import { isApiResultEnvelope, normalizeApiResultEnvelope } from './api-result.js';

export async function requestApiJson(path, options = {}) {
  const payload = await requestJson(path, options);
  return isApiResultEnvelope(payload) ? normalizeApiResultEnvelope(payload).data : payload;
}
