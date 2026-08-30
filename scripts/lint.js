import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['bin', 'src', 'scripts'];

async function collectJsFiles(dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'templates' || entry.name === 'node_modules') {
        continue;
      }
      await collectJsFiles(fullPath, acc);
      continue;
    }
    if (entry.name.endsWith('.js')) {
      acc.push(fullPath);
    }
  }
  return acc;
}

let failed = 0;

for (const target of targets) {
  const dir = path.join(root, target);
  const files = await collectJsFiles(dir);
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (result.status !== 0) {
      process.stderr.write(`${file}\n${result.stderr || result.stdout}\n`);
      failed += 1;
    }
  }
}

if (failed > 0) {
  process.exitCode = 1;
  process.stderr.write(`✗ ${failed} file(s) failed syntax check\n`);
} else {
  process.stdout.write('✓ Generator JavaScript syntax check passed\n');
}
