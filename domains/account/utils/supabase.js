export function assertResult(result, fallbackMessage) {
  if (result?.error) {
    const error = result.error;
    const message = String(error?.message || '').toLowerCase();
    if (
      message.includes('fetch failed') ||
      message.includes('socket') ||
      message.includes('connection')
    ) {
      console.error(`[Supabase Connection Error] ${fallbackMessage}:`, error);
      return { data: null, error };
    }
    throw new Error(error.message || fallbackMessage);
  }
  return result;
}
