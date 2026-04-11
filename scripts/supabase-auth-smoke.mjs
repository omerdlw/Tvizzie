#!/usr/bin/env node

import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['scripts/supabase-smoke.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    SMOKE_SCOPE: process.env.SMOKE_SCOPE || 'auth',
  },
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('[supabase-auth-smoke] failed to execute:', error?.message || error);
  process.exit(1);
});
