import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);
const forbiddenLegacyDirectories = [
  'core/api',
  'core/auth',
  'core/clients',
  'core/constants',
  'core/hooks',
  'core/services',
  'core/utils',
  'features',
];
const forbiddenImportPatterns = [
  /@\/features\//,
  /@\/core\/(api|auth|clients|constants|hooks|services|utils)(?:\/|['"])/,
];
const forbiddenAppImplementationNames = new Set(['client.js', 'view.js', 'motion.js', 'registry.js']);
const forbiddenDirectoryNames = new Set(['parts', 'utils']);

function walk(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...walk(path));
      continue;
    }

    if (sourceExtensions.has(path.slice(path.lastIndexOf('.')))) {
      files.push(path);
    }
  }

  return files;
}

function walkDirectories(directory) {
  const directories = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (!stats.isDirectory()) {
      continue;
    }

    directories.push(path, ...walkDirectories(path));
  }

  return directories;
}

const errors = [];

for (const directory of forbiddenLegacyDirectories) {
  if (existsSync(join(root, directory))) {
    errors.push(`Legacy architecture directory still exists: ${directory}`);
  }
}

if (!existsSync(join(root, 'core/modules'))) {
  errors.push('Immutable foundation is missing: core/modules');
}

if (!existsSync(join(root, 'domains/media/person'))) {
  errors.push('Person capability must remain inside domains/media/person');
}

try {
  const changedFoundationFiles = execFileSync(
    'git',
    ['-c', 'core.fsmonitor=false', 'diff', '--name-only', '--', 'core/modules'],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

  const stagedFoundationFiles = execFileSync(
    'git',
    ['-c', 'core.fsmonitor=false', 'diff', '--cached', '--name-only', '--', 'core/modules'],
    { cwd: root, encoding: 'utf8' },
  )
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);

  for (const file of [...changedFoundationFiles, ...stagedFoundationFiles]) {
    errors.push(`Immutable foundation was modified: ${file}`);
  }
} catch {
  errors.push('Could not verify immutable core/modules worktree state');
}

for (const directory of walkDirectories(join(root, 'app'))) {
  const relativeDirectory = relative(root, directory);
  const directoryName = relativeDirectory.split('/').pop();

  if (forbiddenDirectoryNames.has(directoryName)) {
    errors.push(`Generic application directory is not allowed: ${relativeDirectory}`);
  }

  if (relativeDirectory.startsWith('app/api/') && directoryName === 'server') {
    errors.push(`API implementation must live outside app/api: ${relativeDirectory}`);
  }
}

if (existsSync(join(root, 'domains/person'))) {
  errors.push('Person must not be a top-level domain: domains/person');
}

for (const directory of ['shared', 'ui', 'infrastructure', 'domains', 'app']) {
  const directoryPath = join(root, directory);

  if (!existsSync(directoryPath)) {
    errors.push(`Required architecture directory is missing: ${directory}`);
    continue;
  }

  for (const file of walk(directoryPath)) {
    const content = readFileSync(file, 'utf8');
    const relativeFile = relative(root, file);

    if (relativeFile.startsWith('app/') && forbiddenAppImplementationNames.has(file.split('/').pop())) {
      errors.push(`Generic route implementation filename is not allowed: ${relativeFile}`);
    }

    if (relativeFile.startsWith('app/api/') && file.split('/').pop() === 'route.js') {
      const lineCount = content.split('\n').length;
      if (lineCount > 20) {
        errors.push(`API route adapter is too large; move workflow code out of app/api: ${relativeFile}`);
      }
    }

    for (const pattern of forbiddenImportPatterns) {
      if (pattern.test(content)) {
        errors.push(`Legacy import found in ${relative(root, file)}: ${pattern}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
  process.exit();
}

console.log('Architecture boundaries passed.');
