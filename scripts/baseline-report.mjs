#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const API_DIR = path.join(ROOT, 'app', 'api');

function walk(dir) {
  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(absolute));
      continue;
    }

    files.push(absolute);
  }

  return files;
}

function toRoute(filePath) {
  const relative = path.relative(API_DIR, filePath).replace(/\\/g, '/');
  return `/api/${relative.replace(/\/route\.[jt]s$/, '').replace(/\/index\.[jt]s$/, '')}`;
}

function collectHttpMethods(content) {
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  return methods.filter((method) => new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`).test(content));
}

function collectEdgeFunctions(content) {
  const matches = [...content.matchAll(/invokeInternalEdgeFunction\(\s*['"]([^'"]+)['"]/g)];
  return [...new Set(matches.map((match) => match[1]).filter(Boolean))];
}

if (!fs.existsSync(API_DIR)) {
  console.error('app/api directory not found');
  process.exit(1);
}

const files = walk(API_DIR).filter((file) => /route\.[jt]s$/.test(file));
const report = files
  .map((file) => {
    const content = fs.readFileSync(file, 'utf8');

    return {
      edgeFunctions: collectEdgeFunctions(content),
      methods: collectHttpMethods(content),
      path: toRoute(file),
      source: path.relative(ROOT, file).replace(/\\/g, '/'),
    };
  })
  .sort((first, second) => first.path.localeCompare(second.path));

const OUTPUT = {
  generatedAt: new Date().toISOString(),
  totalRoutes: report.length,
  routes: report,
};

const target = process.argv[2] || '';

if (target) {
  fs.writeFileSync(path.resolve(ROOT, target), JSON.stringify(OUTPUT, null, 2));
  console.log(`Baseline report written to ${path.resolve(ROOT, target)}`);
} else {
  console.log(JSON.stringify(OUTPUT, null, 2));
}
