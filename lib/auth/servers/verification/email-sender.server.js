import nodemailer from 'nodemailer'

const BREVO_DEFAULT_HOST = 'smtp-relay.brevo.com'
const BREVO_DEFAULT_PORT = 587

function normalizeEnvValue(value) {
  let normalized = String(value || '').trim()

  // Handle accidental nested quoting like "\"value\"" from copy/paste.
  for (let index = 0; index < 3; index += 1) {
    if (
      (normalized.startsWith('"') && normalized.endsWith('"')) ||
      (normalized.startsWith("'") && normalized.endsWith("'"))
    ) {
      normalized = normalized.slice(1, -1).trim()
      continue
    }

    break
  }

  return normalized
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
}

function resolveProvider() {
  const explicitProvider = normalizeEnvValue(
    process.env.EMAIL_PROVIDER
  ).toLowerCase()

  if (explicitProvider) {
    return explicitProvider
  }

  if (process.env.BREVO_SMTP_KEY || process.env.BREVO_SMTP_LOGIN) {
    return 'brevo'
  }

  return 'smtp'
}

function toNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function resolveBrevoConfig() {
  const host =
    normalizeEnvValue(process.env.BREVO_SMTP_HOST) || BREVO_DEFAULT_HOST
  const port = toNumber(
    normalizeEnvValue(process.env.BREVO_SMTP_PORT) ||
      normalizeEnvValue(process.env.SMTP_PORT),
    BREVO_DEFAULT_PORT
  )
  const user =
    normalizeEnvValue(process.env.BREVO_SMTP_LOGIN) ||
    normalizeEnvValue(process.env.SMTP_USER)
  const pass =
    normalizeEnvValue(process.env.BREVO_SMTP_KEY) ||
    normalizeEnvValue(process.env.SMTP_PASS)
  const from =
    normalizeEnvValue(process.env.BREVO_SMTP_FROM) ||
    normalizeEnvValue(process.env.SMTP_FROM)

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      'Brevo SMTP configuration is incomplete. Set BREVO_SMTP_LOGIN, BREVO_SMTP_KEY, and BREVO_SMTP_FROM'
    )
  }

  return {
    auth: { user, pass },
    from,
    host,
    port,
    secure: port === 465,
  }
}

function resolveTransportConfig() {
  const provider = resolveProvider()

  if (provider === 'brevo') {
    return resolveBrevoConfig()
  }

  const host = normalizeEnvValue(process.env.SMTP_HOST)
  const port = toNumber(normalizeEnvValue(process.env.SMTP_PORT), 587)
  const user = normalizeEnvValue(process.env.SMTP_USER)
  const pass = normalizeEnvValue(process.env.SMTP_PASS)
  const from = normalizeEnvValue(process.env.SMTP_FROM)

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      'SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM'
    )
  }

  return {
    auth: { user, pass },
    from,
    host,
    port,
    secure: port === 465,
  }
}

const VERIFICATION_PURPOSES = {
  ACCOUNT_DELETE: 'account-delete',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_RESET: 'password-reset',
  PROVIDER_LINK: 'provider-link',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
}

function resolveVerificationCopy(purpose) {
  if (purpose === VERIFICATION_PURPOSES.ACCOUNT_DELETE) {
    return {
      description:
        'Use this one-time code to confirm permanent deletion of your Tvizzie account',
      heading: 'Confirm account deletion',
      label: 'Account Deletion Code',
      subjectSuffix: 'account deletion',
      title: 'Tvizzie Account Deletion Code',
    }
  }

  if (purpose === VERIFICATION_PURPOSES.EMAIL_CHANGE) {
    return {
      description:
        'Use this one-time code to verify and complete your new Tvizzie email address',
      heading: 'Confirm your new email',
      label: 'Email Change Code',
      subjectSuffix: 'email change',
      title: 'Tvizzie Email Change Code',
    }
  }

  if (purpose === VERIFICATION_PURPOSES.PASSWORD_CHANGE) {
    return {
      description:
        'Use this one-time code to confirm your Tvizzie password change',
      heading: 'Confirm your password change',
      label: 'Password Change Code',
      subjectSuffix: 'password change',
      title: 'Tvizzie Password Change Code',
    }
  }

  if (purpose === VERIFICATION_PURPOSES.PASSWORD_RESET) {
    return {
      description: 'Use this one-time code to reset your Tvizzie password',
      heading: 'Reset your password',
      label: 'Password Reset Code',
      subjectSuffix: 'password reset',
      title: 'Tvizzie Password Reset Code',
    }
  }

  if (purpose === VERIFICATION_PURPOSES.PROVIDER_LINK) {
    return {
      description:
        'Use this one-time code to confirm linked provider changes on your Tvizzie account',
      heading: 'Confirm provider change',
      label: 'Provider Change Code',
      subjectSuffix: 'provider change',
      title: 'Tvizzie Provider Change Code',
    }
  }

  if (purpose === VERIFICATION_PURPOSES.SIGN_IN) {
    return {
      description:
        'Use this one-time code to finish signing in to your Tvizzie account',
      heading: 'Confirm your sign in',
      label: 'Login Code',
      subjectSuffix: 'login',
      title: 'Tvizzie Login Code',
    }
  }

  return {
    description:
      'Use this one-time code to finish creating your Tvizzie account',
    heading: 'Verify your email',
    label: 'Verification Code',
    subjectSuffix: 'sign-up',
    title: 'Tvizzie Verification Code',
  }
}

export async function sendVerificationCodeEmail({
  email,
  code,
  expiresAt,
  purpose = VERIFICATION_PURPOSES.SIGN_UP,
}) {
  const transportConfig = resolveTransportConfig()
  const transporter = nodemailer.createTransport({
    auth: transportConfig.auth,
    host: transportConfig.host,
    port: transportConfig.port,
    secure: transportConfig.secure,
  })

  const expiryDate = new Date(expiresAt)
  const expiresAtLabel = expiryDate.toLocaleString('en-US', {
    hour12: false,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
  const normalizedCode = String(code || '').trim()
  const codeWithSpacing = normalizedCode.split('').join(' ')
  const copy = resolveVerificationCopy(
    String(purpose || '')
      .trim()
      .toLowerCase()
  )

  const subject = `${normalizedCode} is your Tvizzie ${copy.subjectSuffix} code`
  const text = [
    copy.title,
    '',
    `Code: ${normalizedCode}`,
    '',
    `Expires at: ${expiresAtLabel}`,
    '',
    'Never share this code with anyone',
    'If you did not request this code, you can ignore this email',
  ].join('\n')

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${copy.title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #ffffff; color: #000000; font-family: Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; padding: 24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; margin: 0 auto; padding: 0 16px;">
                <tr>
                  <td style="background-color: #ffffff; border: 1px solid #000000; padding: 28px 24px;">
                    <p style="margin: 0; color: #000000; font-size: 11px; letter-spacing: 0.22em; font-weight: 700; text-transform: uppercase;">
                      Tvizzie Account Security
                    </p>
                    <h1 style="margin: 14px 0 0; color: #000000; font-size: 28px; line-height: 1.25; font-weight: 700;">
                      ${copy.heading}
                    </h1>
                    <p style="margin: 14px 0 0; color: #000000; font-size: 16px; line-height: 1.6;">
                      ${copy.description}
                    </p>
                    <div style="margin-top: 20px; border: 1px solid #000000; background-color: #000000; padding: 20px 16px; text-align: center;">
                      <div style="font-size: 12px; font-weight: 700; color: #ffffff; letter-spacing: 0.18em; text-transform: uppercase;">
                        ${copy.label}
                      </div>
                      <div style="margin-top: 10px; font-size: 36px; line-height: 1; font-weight: 800; color: #ffffff; letter-spacing: 0.18em;">
                        ${codeWithSpacing}
                      </div>
                    </div>
                    <p style="margin: 20px 0 0; color: #000000; font-size: 14px; line-height: 1.6;">
                      This code expires at <strong style="color: #000000;">${expiresAtLabel}</strong>.
                    </p>
                    <p style="margin: 8px 0 0; color: #000000; font-size: 13px; line-height: 1.6;">
                      Never share this code with anyone.
                    </p>
                    <p style="margin: 20px 0 0; color: #000000; font-size: 12px; line-height: 1.7;">
                      If you did not request this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  try {
    await transporter.sendMail({
      from: transportConfig.from,
      html,
      replyTo: transportConfig.from,
      subject,
      text,
      to: email,
    })
  } catch (error) {
    const message = String(error?.message || '')
    if (
      message.includes('Invalid login') ||
      message.includes('BadCredentials') ||
      message.includes('535')
    ) {
      throw new Error(
        'Email provider authentication failed. Verify Brevo SMTP credentials'
      )
    }

    throw error
  }
}

export async function sendSignUpVerificationCode({ email, code, expiresAt }) {
  return sendVerificationCodeEmail({
    code,
    email,
    expiresAt,
    purpose: VERIFICATION_PURPOSES.SIGN_UP,
  })
}
