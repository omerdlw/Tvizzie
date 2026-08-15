import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(
  `data:text/javascript,
  import { pathToFileURL, fileURLToPath } from 'node:url';
  import path from 'node:path';
  import fs from 'node:fs';

  const rootDir = process.cwd();

  function tryResolveFile(filePath) {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) return filePath;
      if (stat.isDirectory()) {
        const indexJs = path.join(filePath, 'index.js');
        if (fs.existsSync(indexJs)) return indexJs;
        const indexMjs = path.join(filePath, 'index.mjs');
        if (fs.existsSync(indexMjs)) return indexMjs;
      }
    }
    if (fs.existsSync(filePath + '.js')) return filePath + '.js';
    if (fs.existsSync(filePath + '.mjs')) return filePath + '.mjs';
    if (fs.existsSync(filePath + '.json')) return filePath + '.json';
    return null;
  }

  export function resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return {
        url: 'data:text/javascript,export default {};',
        shortCircuit: true,
      };
    }

    if (specifier === 'next/server') {
      const nextServerPath = path.join(rootDir, 'node_modules', 'next', 'server.js');
      if (fs.existsSync(nextServerPath)) {
        return {
          url: pathToFileURL(nextServerPath).href,
          shortCircuit: true,
        };
      }
    }

    let targetPath = null;

    if (specifier === '@/shared' || specifier.startsWith('@/shared/')) {
      const sub = specifier.startsWith('@/shared/') ? specifier.slice(9) : '';
      targetPath = path.join(rootDir, 'core', 'shared', sub);
    } else if (specifier === '@/modules' || specifier.startsWith('@/modules/')) {
      const sub = specifier.startsWith('@/modules/') ? specifier.slice(10) : '';
      targetPath = path.join(rootDir, 'core', 'modules', sub);
    } else if (specifier === '@/ui' || specifier.startsWith('@/ui/')) {
      const sub = specifier.startsWith('@/ui/') ? specifier.slice(5) : '';
      targetPath = path.join(rootDir, 'core', 'ui', sub);
    } else if (specifier === '@/core' || specifier.startsWith('@/core/')) {
      const sub = specifier.startsWith('@/core/') ? specifier.slice(7) : '';
      targetPath = path.join(rootDir, 'core', sub);
    } else if (specifier.startsWith('@/')) {
      targetPath = path.join(rootDir, specifier.slice(2));
    } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const parentDir = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : rootDir;
      targetPath = path.resolve(parentDir, specifier);
    }

    if (targetPath) {
      const resolvedPath = tryResolveFile(targetPath);
      if (resolvedPath) {
        return {
          url: pathToFileURL(resolvedPath).href,
          shortCircuit: true,
        };
      }
    }

    return nextResolve(specifier, context);
  }
`,
  pathToFileURL('./'),
);
