import nodemailer from 'nodemailer'

function resolveTransportConfig() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM

  if (!host || !port || !user || !pass || !from) {
    throw new Error(
      'SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.'
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
    host: transportConfig.host,
    port: transportConfig.port,
    secure: transportConfig.secure,
    auth: transportConfig.auth,
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

  const subject = `${code} is your Tvizzie verification code`
  const text = [
    'Your Tvizzie verification code is:',
    '',
    code,
    '',
    `This code expires at ${expiresAtLabel}.`,
    '',
    'If you did not request this code, you can ignore this email.',
  ].join('\n')

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <p>Your Tvizzie verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 12px 0;">${code}</p>
      <p style="color: #374151;">This code expires at <strong>${expiresAtLabel}</strong>.</p>
      <p style="color: #6b7280;">If you did not request this code, you can ignore this email.</p>
    </div>
  `

  await transporter.sendMail({
    from: transportConfig.from,
    replyTo: transportConfig.from,
    to: email,
    subject,
    text,
    html,
  })
}
