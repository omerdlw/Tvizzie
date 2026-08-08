import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const rootDirectory = process.cwd();
const coreModulesDirectory = join(rootDirectory, 'core', 'modules');
const forbiddenImportPattern = /from\s+['"]@\/(?:domains|app|infrastructure)\//;

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return findJavaScriptFiles(path);
      return /\.[cm]?jsx?$/.test(entry.name) ? [path] : [];
    }),
  );
  return nestedFiles.flat();
}

const files = await findJavaScriptFiles(coreModulesDirectory);
const violations = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (forbiddenImportPattern.test(source)) violations.push(relative(rootDirectory, file));
}

if (violations.length > 0) {
  console.error('Core modules must not import app, domain, or infrastructure layers:');
  violations.forEach((file) => console.error(`- ${file}`));
  process.exitCode = 1;
}
