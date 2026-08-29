export const SEED_TEST_ACCOUNT_BYPASS_METADATA_KEY = 'tvizzie_seed_otp_bypass';

const SEED_TEST_ACCOUNT_EMAIL_PATTERN = /^seed(?:0[1-9]|10)@tvizzie\.test$/;

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isSeedTestAccountEmail(email) {
  return SEED_TEST_ACCOUNT_EMAIL_PATTERN.test(normalizeEmail(email));
}

export function canBypassSeedTestAccountOtp({ email, user, userId } = {}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedUserEmail = normalizeEmail(user?.email);
  const normalizedUserId = String(userId || '').trim();

  return Boolean(
    isSeedTestAccountEmail(normalizedEmail) &&
    normalizedUserId &&
    String(user?.uid || '').trim() === normalizedUserId &&
    normalizedUserEmail === normalizedEmail &&
    user?.disabled !== true &&
    user?.emailVerified === true &&
    user?.app_metadata?.[SEED_TEST_ACCOUNT_BYPASS_METADATA_KEY] === true,
  );
}
