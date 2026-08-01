import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx']);
const forbiddenLegacyDirectories = ['core', 'features'];
const forbiddenImportPatterns = [/@\/features\//, /@\/core\//];
const forbiddenAppImplementationNames = new Set(['client.js', 'view.js', 'motion.js', 'registry.js']);
const forbiddenDomainImplementationNames = new Set(['page.js']);
const forbiddenGenericImplementationNames = new Set([
  'client.js',
  'config.js',
  'constants.js',
  'context.js',
  'derived.js',
  'helpers.js',
  'loaders.js',
  'motion.js',
  'normalizers.js',
  'projector.js',
  'queries.js',
  'read.js',
  'read.server.js',
  'registry.js',
  'server.js',
  'service.js',
  'shared.js',
  'snapshot.js',
  'state.js',
  'subscriptions.js',
  'utils.js',
  'view.js',
]);
const forbiddenDirectoryNames = new Set(['components', 'parts', 'screens', 'utils']);
const forbiddenAccountUiDirectories = new Set(['components', 'profile', 'route']);

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

if (!existsSync(join(root, 'modules'))) {
  errors.push('Shared foundation is missing: modules');
}

if (!existsSync(join(root, 'domains/media/person'))) {
  errors.push('Person capability must remain inside domains/media/person');
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

for (const directory of walkDirectories(join(root, 'domains'))) {
  const relativeDirectory = relative(root, directory);
  const directoryName = relativeDirectory.split('/').pop();

  if (forbiddenDirectoryNames.has(directoryName) && directoryName === 'screens') {
    errors.push(`Domain screen directory is not allowed; use domain ui modules: ${relativeDirectory}`);
  }

  if (
    relativeDirectory.startsWith('domains/account/ui/') &&
    forbiddenAccountUiDirectories.has(directoryName)
  ) {
    errors.push(`Account UI catch-all directory is not allowed: ${relativeDirectory}`);
  }
}

if (existsSync(join(root, 'domains/person'))) {
  errors.push('Person must not be a top-level domain: domains/person');
}

for (const directory of ['modules', 'shared', 'ui', 'infrastructure', 'domains', 'app']) {
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

    const fileName = file.split('/').pop();

    if (relativeFile.startsWith('domains/') && forbiddenDomainImplementationNames.has(fileName)) {
      errors.push(`Domain page implementation filename is not allowed; use *-view.js: ${relativeFile}`);
    }

    if (
      ['domains/', 'infrastructure/', 'shared/', 'ui/'].some((prefix) => relativeFile.startsWith(prefix)) &&
      forbiddenGenericImplementationNames.has(fileName)
    ) {
      errors.push(`Generic implementation filename must identify its subject and behavior: ${relativeFile}`);
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
