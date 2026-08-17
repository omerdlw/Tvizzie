'use server';

import { writeAuthAuditLog } from '../audit-log.server';

export async function logAuditServer({ event, metadata } = {}) {
  try {
    await writeAuthAuditLog({ eventType: event, metadata });
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || 'Audit logging failed' };
  }
}
