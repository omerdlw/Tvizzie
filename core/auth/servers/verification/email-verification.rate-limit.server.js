import { enforceSlidingWindowRateLimit, isSlidingWindowRateLimitError } from '../security/rate-limit.server';

export async function enforceSendCodeRateLimit({ email, ipAddress, deviceId, purpose }) {
  try {
    await enforceSlidingWindowRateLimit({
      namespace: `auth:verification:send-code:${purpose}`,
      windowMs: 15 * 60 * 1000,
      dimensions: [
        { id: 'email', value: email, limit: 4 },
        { id: 'ip', value: ipAddress || 'unknown', limit: 14 },
        { id: 'device', value: deviceId || 'unknown', limit: 8 },
      ],
      message: 'Too many verification code requests',
    });
  } catch (error) {
    if (!isSlidingWindowRateLimitError(error)) {
      throw error;
    }

    if (error.dimension === 'email') {
      throw new Error('Too many verification requests for this email address');
    }

    if (error.dimension === 'device') {
      throw new Error('Too many verification requests from this device');
    }

    throw new Error('Too many verification requests from this network');
  }
}
