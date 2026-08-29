import { requestAuthJson } from '@/modules/auth';

function normalizeValue(value) {
  return String(value || '').trim();
}

async function postAuthJson(path, body, fallbackMessage) {
  return requestAuthJson(path, { body, fallbackMessage });
}

export function assertSignUpEmailAvailable({ email }) {
  return Promise.resolve({ success: true, email: normalizeValue(email) });
}

export async function requestVerificationCode({ email, initial, purpose, forceNew }) {
  return postAuthJson(
    '/api/auth/verification',
    { action: 'send', email, forceNew: forceNew === true, initial: initial === true, purpose },
    'Could not send verification code',
  );
}

export async function verifyCodeRequest({ code, email, purpose }) {
  return postAuthJson(
    '/api/auth/verification',
    { action: 'verify', code, email, purpose },
    'Verification failed',
  );
}

export async function consumeStepUpRequest({ purpose }) {
  return postAuthJson(
    '/api/auth/step-up/consume',
    { purpose },
    'Step-up verification could not be completed',
  );
}

export async function signOutOtherSessionsRequest() {
  return postAuthJson('/api/auth/sessions/others', {}, 'Other sessions could not be signed out');
}

export async function listAuthSessionsRequest() {
  return requestAuthJson('/api/auth/sessions', {
    fallbackMessage: 'Sessions could not be loaded',
    method: 'GET',
  });
}

export async function revokeAuthSessionRequest({ sessionId }) {
  return postAuthJson('/api/auth/sessions/revoke', { sessionId }, 'Session could not be revoked');
}

export async function sendSecurityEventRequest({ deviceLabel, event, provider }) {
  return postAuthJson(
    '/api/auth/security/events',
    { deviceLabel, event, provider },
    'Security notification could not be sent',
  );
}

export async function completeVerifiedSignUp({ displayName, email, signUpProof, username }) {
  return postAuthJson(
    '/api/auth/sign-up/complete',
    { displayName, email, signUpProof, username },
    'Sign-up could not be completed',
  );
}
