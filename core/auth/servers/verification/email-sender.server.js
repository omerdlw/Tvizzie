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
      description: 'Use this one-time code to confirm permanent deletion of your Tvizzie account',
      heading: 'Confirm account deletion',
      label: 'Account Deletion Code',
      subjectSuffix: 'account deletion',
      title: 'Tvizzie Account Deletion Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.EMAIL_CHANGE) {
    return {
      description: 'Use this one-time code to verify and complete your new Tvizzie email address',
      heading: 'Confirm your new email',
      label: 'Email Change Code',
      subjectSuffix: 'email change',
      title: 'Tvizzie Email Change Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.PASSWORD_CHANGE) {
    return {
      description: 'Use this one-time code to confirm your Tvizzie password change',
      heading: 'Confirm your password change',
      label: 'Password Change Code',
      subjectSuffix: 'password change',
      title: 'Tvizzie Password Change Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.PASSWORD_RESET) {
    return {
      description: 'Use this one-time code to reset your Tvizzie password',
      heading: 'Reset your password',
      label: 'Password Reset Code',
      subjectSuffix: 'password reset',
      title: 'Tvizzie Password Reset Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.PROVIDER_LINK) {
    return {
      description: 'Use this one-time code to confirm linked provider changes on your Tvizzie account',
      heading: 'Confirm provider change',
      label: 'Provider Change Code',
      subjectSuffix: 'provider change',
      title: 'Tvizzie Provider Change Code',
    };
  }

  if (purpose === VERIFICATION_PURPOSES.SIGN_IN) {
    return {
      description: 'Use this one-time code to finish signing in to your Tvizzie account',
      heading: 'Confirm your sign in',
      label: 'Login Code',
      subjectSuffix: 'login',
      title: 'Tvizzie Login Code',
    };
  }

  return {
    description: 'Use this one-time code to finish creating your Tvizzie account',
    heading: 'Verify your email',
    label: 'Verification Code',
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
    copy.title,
    '',
    `Code: ${normalizedCode}`,
    '',
    `Expires at: ${expiresAtLabel}`,
    '',
    'Never share this code with anyone',
    'If you did not request this code, you can ignore this email',
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
        <style>
          @media only screen and (max-width: 600px) {
            .tvz-shell {
              padding: 16px !important;
            }

            .tvz-content {
              padding: 22px 18px 20px !important;
            }

            .tvz-title {
              font-size: 36px !important;
              line-height: 1.04 !important;
            }

            .tvz-description {
              font-size: 17px !important;
            }

            .tvz-code {
              font-size: 34px !important;
              letter-spacing: 0.2em !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1efe8; color: #171717; font-family: Inter, Geist, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <span style="display: none; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden;">
          ${copy.heading} code: ${normalizedCode}. Expires at ${expiresAtLabel}.
        </span>
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          bgcolor="#f1efe8"
          style="background-color: #f1efe8;"
        >
          <tr>
            <td class="tvz-shell" align="center" style="padding: 30px 14px;">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="max-width: 560px; margin: 0 auto;"
              >
                <tr>
                  <td
                    bgcolor="#fdfcf8"
                    style="background-color: #fdfcf8; border: 1px solid #d8d2c4; border-radius: 22px; overflow: hidden;"
                  >
                    <table
                      role="presentation"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      bgcolor="#171717"
                      style="background-color: #171717;"
                    >
                      <tr>
                        <td style="padding: 18px 22px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td valign="middle">
                                <div
                                  style="height: 30px; width: 30px; border-radius: 50%; background-color: #faf9f5; color: #171717; text-align: center; line-height: 30px; font-size: 17px; font-weight: 800;"
                                >
                                  T
                                </div>
                              </td>
                              <td valign="middle" style="padding-left: 10px;">
                                <p style="margin: 0; font-size: 30px; line-height: 1; font-weight: 700; color: #faf9f5;">Tvizzie</p>
                                <p
                                  style="margin: 4px 0 0; color: #faf9f5; font-size: 10px; letter-spacing: 0.2em; font-weight: 700; text-transform: uppercase;"
                                >
                                  Account Security
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td class="tvz-content" style="padding: 30px 24px 22px;">
                          <h1 class="tvz-title" style="margin: 0; color: #171717; font-size: 44px; line-height: 1.02; font-weight: 700;">
                            ${copy.heading}
                          </h1>
                          <p class="tvz-description" style="margin: 14px 0 0; color: #171717; font-size: 19px; line-height: 1.52;">
                            ${copy.description}
                          </p>
                          <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            bgcolor="#171717"
                            style="margin-top: 22px; border-radius: 14px; background-color: #171717;"
                          >
                            <tr>
                              <td align="center" style="padding: 18px 12px;">
                                <div
                                  style="font-size: 11px; font-weight: 700; color: #faf9f5; letter-spacing: 0.22em; text-transform: uppercase;"
                                >
                                  ${copy.label}
                                </div>
                                <div
                                  class="tvz-code"
                                  style="margin-top: 11px; font-size: 42px; line-height: 1; font-weight: 800; color: #faf9f5; letter-spacing: 0.26em; font-family: Geist Mono, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace;"
                                >
                                  ${codeWithSpacing}
                                </div>
                              </td>
                            </tr>
                          </table>
                          <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            bgcolor="#f4f2ea"
                            style="margin-top: 14px; background-color: #f4f2ea; border: 1px solid #dfd9cc; border-radius: 12px;"
                          >
                            <tr>
                              <td style="padding: 12px 14px;">
                                <p style="margin: 0; color: #171717; font-size: 14px; line-height: 1.5;">
                                  This code expires at <strong style="color: #171717;">${expiresAtLabel}</strong>.
                                </p>
                              </td>
                            </tr>
                          </table>
                          <p style="margin: 16px 0 0; color: #171717; font-size: 14px; line-height: 1.6;">
                            Never share this code with anyone.
                          </p>
                          <p style="margin: 16px 0 0; color: #171717; font-size: 13px; line-height: 1.68;">
                            If you did not request this email, you can safely ignore it.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 24px 22px;">
                          <div style="border-top: 1px solid #e6e1d6; font-size: 0; line-height: 0;">&nbsp;</div>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="padding: 0 20px 20px;">
                          <div
                            style="font-size: 11px; line-height: 1.4; color: #6e6a62; text-transform: uppercase; letter-spacing: 0.12em;"
                          >
                            Tvizzie Security Mail
                          </div>
                        </td>
                      </tr>
                    </table>
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
