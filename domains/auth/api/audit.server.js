'use server';

export async function logAuditServer({ event, metadata }) {
  try {
    console.log('[Audit Log]', event, metadata);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
