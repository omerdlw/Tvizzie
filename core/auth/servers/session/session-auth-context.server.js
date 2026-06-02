import { createAdminAuthFacade } from './supabase-admin-auth.server';
import { assertSessionNotRevoked } from './revocation.server';
import { assertGoogleSessionConsistency } from '../providers/google-provider.server';
import { buildNormalizedSession, toFirebaseLikeUserRecord } from './session.builder';
import { decodeJwtPayload, normalizeValue, toLowercase } from './session.shared';
import { createCsrfToken } from './session-cookie-state.server';

async function buildAuthContextFromAccessToken(accessToken, authMethod = 'session', predefinedUser = null) {
  const normalizedAccessToken = normalizeValue(accessToken);

  if (!normalizedAccessToken) {
    throw new Error('Authentication session is required');
  }

  const decodedToken = decodeJwtPayload(normalizedAccessToken);
  let rawUser = predefinedUser;

  // Fallback to JWT payload if no user is provided. This safely extracts user ID and email
  // without hitting the DB, relying on the fact that Next.js middleware or session verification
  // has already validated the JWT signature (via getSession or auth guards).
  if (!rawUser) {
    if (!decodedToken?.sub) {
      throw new Error('Invalid or expired authentication token');
    }
    rawUser = {
      id: decodedToken.sub,
      email: decodedToken.email,
      app_metadata: decodedToken.app_metadata || {},
      user_metadata: decodedToken.user_metadata || {},
    };
  }

  const userRecord = toFirebaseLikeUserRecord(rawUser);
  const userId = normalizeValue(userRecord?.uid || rawUser?.id);
  const email = toLowercase(userRecord?.email || rawUser?.email);

  if (!userId) {
    throw new Error('Invalid or expired authentication token');
  }

  if (!email) {
    throw new Error('Authenticated user does not have an email address');
  }

  await assertGoogleSessionConsistency({
    accessToken: normalizedAccessToken,
    decodedToken,
    rawUser,
    userRecord,
  });

  const sessionJti = normalizeValue(decodedToken?.session_id || decodedToken?.jti || decodedToken?.sub) || null;
  const authContext = {
    accessToken: normalizedAccessToken,
    adminAuth: createAdminAuthFacade({
      currentSessionJti: sessionJti,
      reason: 'session-context',
    }),
    authMethod,
    decodedToken,
    email,
    session: buildNormalizedSession(decodedToken, userRecord),
    sessionCookie: null,
    sessionJti,
    userId,
    userRecord,
  };

  await assertSessionNotRevoked(authContext);
  return authContext;
}

export async function createSessionFromIdToken(idToken) {
  const normalizedIdToken = normalizeValue(idToken);

  if (!normalizedIdToken) {
    throw new Error('idToken is required');
  }

  const context = await buildAuthContextFromAccessToken(normalizedIdToken, 'bearer');

  return {
    ...context,
    csrfToken: createCsrfToken(),
  };
}

export { buildAuthContextFromAccessToken };
