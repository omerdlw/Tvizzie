export function normalizeProviderIds(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeProviderDescriptors(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((provider) => ({
      email: normalizeEmail(provider?.email),
      id: String(provider?.id || '')
        .trim()
        .toLowerCase(),
      uid: String(provider?.uid || '').trim() || null,
    }))
    .filter((provider) => provider.id);
}

export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeOptionalText(value) {
  return String(value || '').trim();
}
