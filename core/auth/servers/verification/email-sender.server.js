import nodemailer from 'nodemailer';

const BREVO_DEFAULT_HOST = 'smtp-relay.brevo.com';
const BREVO_DEFAULT_PORT = 587;

function normalizeEnvValue(value) {
  let normalized = String(value || '').trim();

  // Handle accidental nested quoting like "\"value\"" from copy/paste.
  for (let index = 0; index < 3; index += 1) {
    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1).trim();
      continue;
    }

    break;
  }

  return normalized.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\r/g, '\r').replace(/\\n/g, '\n');
}

function resolveProvider() {
  const explicitProvider = normalizeEnvValue(process.env.EMAIL_PROVIDER).toLowerCase();

  if (explicitProvider) {
    return explicitProvider;
  }

  if (process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP_LOGIN) {
    return 'brevo';
  }

  return 'smtp';
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveBrevoConfig() {
  const host = normalizeEnvValue(process.env.BREVO_SMTP_HOST) || BREVO_DEFAULT_HOST;
  const port = toNumber(
    normalizeEnvValue(process.env.BREVO_SMTP_PORT) || normalizeEnvValue(process.env.SMTP_PORT),
    BREVO_DEFAULT_PORT
  );
  const user = normalizeEnvValue(process.env.BREVO_SMTP_LOGIN) || normalizeEnvValue(process.env.SMTP_USER);
  const pass = normalizeEnvValue(process.env.BREVO_SMTP_KEY) || normalizeEnvValue(process.env.SMTP_PASS);
  const from = normalizeEnvValue(process.env.BREVO_SMTP_FROM) || normalizeEnvValue(process.env.SMTP_FROM);

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      'Brevo SMTP configuration is incomplete. Set BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_SMTP_FROM'
    );
  }

  return {
    auth: { user, pass },
    from,
    host,
    port,
    secure: port === 465,
  };
}

function resolveTransportConfig() {
  const provider = resolveProvider();

  if (provider === 'brevo') {
    return resolveBrevoConfig();
  }

  const host = normalizeEnvValue(process.env.SMTP_HOST);
  const port = toNumber(normalizeEnvValue(process.env.SMTP_PORT), 587);
  const user = normalizeEnvValue(process.env.SMTP_USER);
  const pass = normalizeEnvValue(process.env.SMTP_PASS);
  const from = normalizeEnvValue(process.env.SMTP_FROM);

  if (!host || !port || !user || !pass || !from) {
    throw new Error('SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM');
  }

  return {
    auth: { user, pass },
    from,
    host,
    port,
    secure: port === 465,
  };
}

const VERIFICATION_PURPOSES = {
  ACCOUNT_DELETE: 'account-delete',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_RESET: 'password-reset',
  PROVIDER_LINK: 'provider-link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
};

function resolveVerificationCopy(purpose) {
  if (purpose === VERIFICATION_PURPOSES.ACCOUNT_DELETE) {
    return {
      description: 'Use this code to confirm account deletion.',
      heading: 'Account deletion',
      subjectSuffix: 'account deletion',
      title: 'Tvizzie Account Deletion Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.EMAIL_CHANGE) {
    return {
      description: 'Use this code to confirm your new email address.',
      heading: 'Email change',
      subjectSuffix: 'email change',
      title: 'Tvizzie Email Change Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.PASSWORD_CHANGE) {
    return {
      description: 'Use this code to confirm your password change.',
      heading: 'Password change',
      subjectSuffix: 'password change',
      title: 'Tvizzie Password Change Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.PASSWORD_RESET) {
    return {
      description: 'Use this code to reset your password.',
      heading: 'Password reset',
      subjectSuffix: 'password reset',
      title: 'Tvizzie Password Reset Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.PROVIDER_LINK) {
    return {
      description: 'Use this code to confirm provider changes.',
      heading: 'Provider change',
      subjectSuffix: 'provider change',
      title: 'Tvizzie Provider Change Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.SIGN_IN) {
    return {
      description: 'Use this code to finish signing in.',
      heading: 'Sign in',
      subjectSuffix: 'login',
      title: 'Tvizzie Login Code',
    };
  }

  return {
    description: 'Use this code to verify your email address.',
    heading: 'Email verification',
    subjectSuffix: 'sign-up',
    title: 'Tvizzie Verification Code',
  };
}

export async function sendVerificationCodeEmail({ email, code, expiresAt, purpose = VERIFICATION_PURPOSES.SIGN_UP }) {
  const transportConfig = resolveTransportConfig();
  const transporter = nodemailer.createTransport({
    auth: transportConfig.auth,
    host: transportConfig.host,
    port: transportConfig.port,
    secure: transportConfig.secure,
  });

  const expiryDate = new Date(expiresAt);
  const expiresAtLabel = expiryDate.toLocaleString('en-US', {
    hour12: false,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const normalizedCode = String(code || '').trim();
  const codeWithSpacing = normalizedCode.split('').join(' ');
  const copy = resolveVerificationCopy(
    String(purpose || '')
      .trim()
      .toLowerCase()
  );

  const subject = `${normalizedCode} is your Tvizzie ${copy.subjectSuffix} code`;
  const text = [
    'Tvizzie',
    'Account security',
    '',
    copy.heading,
    '',
    copy.description,
    '',
    `Code: ${normalizedCode}`,
    `Expires at: ${expiresAtLabel}`,
    '',
    'Never share this code with anyone',
    'If you did not request this email, ignore it.',
  ].join('\n');

  const html = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light only" />
    <meta name="supported-color-schemes" content="light only" />
    <title>${copy.title}</title>
  </head>
  <body style="margin: 0; padding: 24px 12px; background-color: #f0f0ed; color: #18181b; font-family: Inter, Geist, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
    <span style="display: none; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden;">
      Tvizzie ${copy.subjectSuffix} code: ${normalizedCode}
    </span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="max-width: 520px; margin: 0 auto; background-color: #f0f0ed; border: 1px solid #e8e3d7; border-radius: 12px;"
          >
            <tr>
              <td style="padding: 22px 22px 18px;">
                <p style="margin: 0; font-size: 28px; line-height: 1; font-weight: 700; color: #18181b;">Tvizzie</p>
                <p style="margin: 10px 0 0; font-size: 16px; line-height: 1.45; color: #4f4b45;">
                  ${copy.description}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 22px;">
                <div style="height: 1px; background-color: #ece7dc; font-size: 0; line-height: 0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 22px 22px;">
                <p style="margin: 0; font-size: 30px; line-height: 1.1; font-weight: 700; color: #18181b;">${copy.heading}</p>
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="margin-top: 18px; background-color: #ffffff; border-radius: 10px;"
                >
                  <tr>
                    <td align="center" style="padding: 18px 16px;">
                      <p
                        style="margin: 0; font-size: 36px; line-height: 1; font-weight: 800; color: #18181b; letter-spacing: 0.28em; text-align: center; font-family: Geist Mono, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;"
                      >
                        ${codeWithSpacing}
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin: 14px 0 0; font-size: 14px; line-height: 1.6; color: #4f4b45;">Expires at: ${expiresAtLabel}</p>
                <p style="margin: 12px 0 0; font-size: 14px; line-height: 1.6; color: #18181b;">Never share this code with anyone.</p>
                <p style="margin: 6px 0 0; font-size: 14px; line-height: 1.6; color: #5e5a54;">If you did not request this email, ignore it.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

  try {
    await transporter.sendMail({
      from: transportConfig.from,
      html,
      replyTo: transportConfig.from,
      subject,
      text,
      to: email,
    });
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('Invalid login') || message.includes('BadCredentials') || message.includes('535')) {
      throw new Error('Email provider authentication failed. Verify Brevo SMTP credentials');
    }

    throw error;
  }
}

export async function sendSignUpVerificationCode({ email, code, expiresAt }) {
  return sendVerificationCodeEmail({
    code,
    email,
    expiresAt,
    purpose: VERIFICATION_PURPOSES.SIGN_UP,
  });
}
