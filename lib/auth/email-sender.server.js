import nodemailer from 'nodemailer'

const BREVO_DEFAULT_HOST = 'smtp-relay.brevo.com'
const BREVO_DEFAULT_PORT = 587

function resolveProvider() {
  const explicitProvider = String(process.env.EMAIL_PROVIDER || '')
    .trim()
    .toLowerCase()

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
  const host = process.env.BREVO_SMTP_HOST || BREVO_DEFAULT_HOST
  const port = toNumber(
    process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT,
    BREVO_DEFAULT_PORT
  )
  const user = process.env.BREVO_SMTP_LOGIN || process.env.SMTP_USER
  const pass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS
  const from = process.env.BREVO_SMTP_FROM || process.env.SMTP_FROM

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

  const host = process.env.SMTP_HOST
  const port = toNumber(process.env.SMTP_PORT, 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM

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

export async function sendSignUpVerificationCode({ email, code, expiresAt }) {
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

  const subject = `${normalizedCode} is your Tvizzie sign-up code`
  const text = [
    'Tvizzie sign-up verification',
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
        <title>Tvizzie Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; color: #111111; font-family: Inter, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5; padding: 24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; margin: 0 auto; padding: 0 16px;">
                <tr>
                  <td style="background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 20px; padding: 28px 24px;">
                    <p style="margin: 0; color: #525252; font-size: 11px; letter-spacing: 0.22em; font-weight: 700; text-transform: uppercase;">
                      Tvizzie Account Security
                    </p>
                    <h1 style="margin: 14px 0 0; color: #111111; font-size: 28px; line-height: 1.25; font-weight: 700;">
                      Verify your email
                    </h1>
                    <p style="margin: 14px 0 0; color: #262626; font-size: 16px; line-height: 1.6;">
                      Use this one-time code to finish creating your Tvizzie account.
                    </p>
                    <div style="margin-top: 20px; border-radius: 14px; border: 1px solid #d4d4d4; background-color: #fafafa; padding: 20px 16px; text-align: center;">
                      <div style="font-size: 12px; font-weight: 700; color: #525252; letter-spacing: 0.18em; text-transform: uppercase;">
                        Verification Code
                      </div>
                      <div style="margin-top: 10px; font-size: 36px; line-height: 1; font-weight: 800; color: #0a0a0a; letter-spacing: 0.18em;">
                        ${codeWithSpacing}
                      </div>
                    </div>
                    <p style="margin: 20px 0 0; color: #262626; font-size: 14px; line-height: 1.6;">
                      This code expires at <strong style="color: #0a0a0a;">${expiresAtLabel}</strong>.
                    </p>
                    <p style="margin: 8px 0 0; color: #404040; font-size: 13px; line-height: 1.6;">
                      Never share this code with anyone.
                    </p>
                    <p style="margin: 20px 0 0; color: #737373; font-size: 12px; line-height: 1.7;">
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
