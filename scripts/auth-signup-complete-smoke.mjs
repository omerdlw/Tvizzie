#!/usr/bin/env node

import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['scripts/supabase-auth-smoke.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    SMOKE_CASE: process.env.SMOKE_CASE || 'signup-complete',
  },
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('[auth-signup-complete-smoke] failed to execute:', error?.message || error);
  process.exit(1);
});
