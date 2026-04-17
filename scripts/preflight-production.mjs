#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function normalizeValue(value) {
  let normalized = String(value || '').trim();

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

function normalizeLowerValue(value) {
  return normalizeValue(value).toLowerCase();
}

function normalizeBoolean(value, fallback = false) {
  const normalized = normalizeLowerValue(value);

  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function hasAnyConfigured(keys = []) {
  return keys.some((key) => normalizeValue(process.env[key]));
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');

  fileContents.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1);

    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      return;
    }

    process.env[key] = normalizeValue(rawValue);
  });
}

function loadLocalEnvFiles() {
  const cwd = process.cwd();
  const candidates = ['.env', '.env.local', '.env.production', '.env.production.local'];

  candidates.forEach((relativePath) => {
    loadEnvFile(path.join(cwd, relativePath));
  });
}

function resolveEmailProvider() {
  const explicitProvider = normalizeLowerValue(process.env.EMAIL_PROVIDER);

  if (explicitProvider) {
    return explicitProvider;
  }

  if (normalizeValue(process.env.BREVO_SMTP_KEY) || normalizeValue(process.env.BREVO_SMTP_LOGIN)) {
    return 'brevo';
  }

  return 'smtp';
}

function buildChecks() {
  const errors = [];
  const warnings = [];
  const requiredKeys = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INFRA_INTERNAL_TOKEN',
    'TMDB_API_KEY',
    'EMAIL_VERIFICATION_SECRET',
    'LOGIN_VERIFICATION_SECRET',
    'SIGN_UP_PROOF_SECRET',
    'PASSWORD_RESET_PROOF_SECRET',
    'STEP_UP_SECRET',
    'RECENT_REAUTH_SECRET',
  ];
  const emailProvider = resolveEmailProvider();

  if (emailProvider === 'brevo') {
    requiredKeys.push('BREVO_SMTP_LOGIN', 'BREVO_SMTP_KEY', 'BREVO_SMTP_FROM');
  } else {
    requiredKeys.push('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM');
  }

  requiredKeys.forEach((key) => {
    if (!normalizeValue(process.env[key])) {
      errors.push(`Missing required env: ${key}`);
    }
  });

  if (!hasAnyConfigured(['NEXT_PUBLIC_SITE_URL', 'SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL'])) {
    errors.push('Missing explicit site URL: set NEXT_PUBLIC_SITE_URL, SITE_URL, or VERCEL_PROJECT_PRODUCTION_URL');
  }

  if (normalizeBoolean(process.env.ACCOUNT_MEDIA_ALLOW_ANY_EXTERNAL_URL, false)) {
    errors.push('ACCOUNT_MEDIA_ALLOW_ANY_EXTERNAL_URL is enabled; disable it for production');
  }

  if (!normalizeValue(process.env.NEXT_PUBLIC_TMDB_READ_TOKEN)) {
    warnings.push('NEXT_PUBLIC_TMDB_READ_TOKEN is missing; client-side TMDB image requests will fail');
  }

  return {
    emailProvider,
    errors,
    warnings,
  };
}

function printList(title, values) {
  if (!values.length) {
    console.log(`${title}: none`);
    return;
  }

  console.log(`${title}:`);
  values.forEach((value) => {
    console.log(`- ${value}`);
  });
}

loadLocalEnvFiles();

const checks = buildChecks();

console.log(`Production preflight`);
console.log(`Email provider: ${checks.emailProvider}`);
printList('Errors', checks.errors);
printList('Warnings', checks.warnings);

if (checks.errors.length > 0) {
  process.exit(1);
}
