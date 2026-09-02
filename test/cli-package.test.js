import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  getBinCommandName,
  parseArguments,
  printHelp,
  readPackageMeta,
} from '../src/cli/arguments.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binPath = path.join(repoRoot, 'bin', 'generate-fullstack-app.js');

test('package name is generate-fullstack-app', () => {
  const pkg = readPackageMeta();
  assert.equal(pkg.name, 'generate-fullstack-app');
});

test('CLI bin command is generate-fullstack-app', () => {
  const pkg = readPackageMeta();
  assert.equal(getBinCommandName(), 'generate-fullstack-app');
  assert.equal(pkg.bin['generate-fullstack-app'], './bin/generate-fullstack-app.js');
  assert.equal(pkg.bin['create-fullstack-app'], undefined);
  assert.equal(fs.existsSync(binPath), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'bin', 'create-fullstack-app.js')), false);
});

test('generate-fullstack-app TestApp is accepted by the CLI', () => {
  const parsed = parseArguments(['node', 'generate-fullstack-app', 'TestApp', '--yes']);
  assert.equal(parsed.projectName, 'TestApp');
  assert.equal(parsed.yes, true);

  const helpRun = spawnSync(process.execPath, [binPath, 'TestApp', '--help'], {
    encoding: 'utf8',
  });
  assert.equal(helpRun.status, 0, helpRun.stderr);
  assert.match(helpRun.stdout, /generate-fullstack-app/);
  assert.doesNotMatch(helpRun.stdout, /create-fullstack-app/);

  const versionRun = spawnSync(process.execPath, [binPath, '--version'], {
    encoding: 'utf8',
  });
  assert.equal(versionRun.status, 0, versionRun.stderr);
  assert.match(versionRun.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('old create-fullstack-app command is no longer documented', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  assert.doesNotMatch(readme, /create-fullstack-app/);
  assert.match(readme, /npm install -g generate-fullstack-app/);
  assert.match(readme, /generate-fullstack-app MyApp/);

  let helpText = '';
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk) => {
    helpText += chunk;
    return true;
  };
  try {
    printHelp();
  } finally {
    process.stdout.write = originalWrite;
  }

  assert.match(helpText, /generate-fullstack-app/);
  assert.doesNotMatch(helpText, /create-fullstack-app/);
});
