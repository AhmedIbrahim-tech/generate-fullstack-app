import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { parseArguments, DEFAULT_OPTIONS } from '../src/cli/arguments.js';
import {
  defaultFrontendSelection,
  resolveFrontendSelection,
  describeFrontend,
  getFrontendDevOrigin,
} from '../src/models/frontend.js';
import {
  defaultBackendSelection,
  describeBackend,
} from '../src/models/backend.js';
import {
  loadUserPreferences,
  saveUserPreferences,
  clearUserPreferences,
  getUserPreferencesPath,
} from '../src/utils/user-preferences.js';
import { resolveReactPackages } from '../src/generators/frontend/react/react-common.generator.js';
import { writeGenerationManifest } from '../src/generators/manifest.generator.js';

test('parseArguments supports --mode and mode aliases', () => {
  const full = parseArguments(['node', 'cli', 'MyApp', '--mode', 'fullstack']);
  assert.equal(full.mode, 'fullstack');
  assert.equal(full.backend, true);
  assert.equal(full.frontendEnabled, true);

  const backOnly = parseArguments(['node', 'cli', 'MyApi', '--backend-only']);
  assert.equal(backOnly.mode, 'backend-only');
  assert.equal(backOnly.backend, true);
  assert.equal(backOnly.frontendEnabled, false);

  const frontOnly = parseArguments(['node', 'cli', 'MyUi', '--frontend-only']);
  assert.equal(frontOnly.mode, 'frontend-only');
  assert.equal(frontOnly.backend, false);
  assert.equal(frontOnly.frontendEnabled, true);
});

test('parseArguments supports backend customization flags', () => {
  const parsed = parseArguments([
    'node',
    'cli',
    'CustomApp',
    '--architecture',
    'services',
    '--mapping',
    'automapper',
    '--orm',
    'dapper',
    '--database',
    'postgresql',
    '--logging',
    'ilogger',
    '--background-jobs',
    'hangfire',
    '--realtime',
    'signalr',
    '--auth-mode',
    'identity',
  ]);

  assert.equal(parsed.architecture, 'services');
  assert.equal(parsed.mapping, 'automapper');
  assert.equal(parsed.orm, 'dapper');
  assert.equal(parsed.database, 'postgresql');
  assert.equal(parsed.logging, 'ilogger');
  assert.equal(parsed.backgroundJobs, 'hangfire');
  assert.equal(parsed.realtime, 'signalr');
  assert.equal(parsed.authMode, 'identity');
});

test('parseArguments supports frontend customization flags', () => {
  const parsed = parseArguments([
    'node',
    'cli',
    'FrontendApp',
    '--frontend',
    'react',
    '--react-framework',
    'vite',
    '--language',
    'javascript',
    '--styling',
    'bootstrap',
    '--state',
    'zustand',
    '--http-client',
    'fetch',
    '--forms',
    'none',
    '--component-system',
    'mui',
  ]);

  assert.equal(parsed.frontendLibrary, 'react');
  assert.equal(parsed.reactFramework, 'vite');
  assert.equal(parsed.language, 'javascript');
  assert.equal(parsed.styling, 'bootstrap');
  assert.equal(parsed.state, 'zustand');
  assert.equal(parsed.httpClient, 'fetch');
  assert.equal(parsed.forms, 'none');
  assert.equal(parsed.componentSystem, 'mui');
});

test('defaultFrontendSelection returns recommended stack', () => {
  const nextStack = defaultFrontendSelection('next');
  assert.equal(nextStack.enabled, true);
  assert.equal(nextStack.library, 'react');
  assert.equal(nextStack.framework, 'next');
  assert.equal(nextStack.language, 'typescript');
  assert.equal(nextStack.styling, 'tailwind');
  assert.equal(nextStack.state, 'redux');
  assert.equal(nextStack.httpClient, 'axios');
  assert.equal(nextStack.forms, 'react-hook-form-zod');
  assert.equal(nextStack.componentSystem, 'shadcn');
  assert.equal(nextStack.localization, true);

  const viteStack = defaultFrontendSelection('vite');
  assert.equal(viteStack.framework, 'vite');
  assert.equal(viteStack.state, 'redux');
});

test('shadcn/ui rejects Bootstrap selection', () => {
  const invalid = resolveFrontendSelection({
    frontendEnabled: true,
    frontendLibrary: 'react',
    reactFramework: 'next',
    styling: 'bootstrap',
    componentSystem: 'shadcn',
  });

  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /shadcn\/ui requires Tailwind CSS/i);

  const valid = resolveFrontendSelection({
    frontendEnabled: true,
    frontendLibrary: 'react',
    reactFramework: 'next',
    styling: 'tailwind',
    componentSystem: 'shadcn',
  });
  assert.equal(valid.ok, true);
});

test('defaultBackendSelection returns recommended Clean Architecture stack', () => {
  const backend = defaultBackendSelection();
  assert.equal(backend.enabled, true);
  assert.equal(backend.architecture, 'cqrs-mediatr');
  assert.equal(backend.mapping, 'manual');
  assert.equal(backend.orm, 'efcore');
  assert.equal(backend.database, 'sqlserver');
  assert.equal(backend.logging, 'serilog');
  assert.equal(backend.backgroundJobs, 'none');
  assert.equal(backend.realtime, 'none');
  assert.equal(backend.authentication, 'identity-jwt');
});

test('describeBackend formats options cleanly', () => {
  const desc = describeBackend({
    enabled: true,
    architecture: 'cqrs-mediatr',
    orm: 'efcore',
    database: 'sqlserver',
    authentication: 'identity-jwt',
    logging: 'serilog',
  });

  assert.match(desc, /ASP\.NET Core Web API/);
  assert.match(desc, /Clean Architecture/);
  assert.match(desc, /CQRS \+ MediatR/);
  assert.match(desc, /EF Core/);
  assert.match(desc, /SQL Server/);
  assert.match(desc, /Identity \+ JWT/);
});

test('user preferences save and load in global path', () => {
  const original = loadUserPreferences();

  const testPrefs = {
    mode: 'fullstack',
    backend: {
      architecture: 'services',
      orm: 'dapper',
      database: 'postgresql',
      logging: 'serilog',
    },
    frontend: {
      library: 'react',
      framework: 'vite',
      language: 'typescript',
      styling: 'tailwind',
      state: 'zustand',
    },
    packageManager: 'pnpm',
  };

  const saved = saveUserPreferences(testPrefs);
  assert.equal(saved, true);

  const loaded = loadUserPreferences();
  assert.deepEqual(loaded, testPrefs);

  // Restore previous state
  if (original) {
    saveUserPreferences(original);
  } else {
    clearUserPreferences();
  }
});

test('resolveReactPackages selects packages based on choices', () => {
  const reduxAxios = resolveReactPackages({
    state: 'redux',
    httpClient: 'axios',
    forms: 'react-hook-form-zod',
    styling: 'tailwind',
    realtime: 'signalr',
  });
  assert.ok(reduxAxios.includes('@reduxjs/toolkit'));
  assert.ok(reduxAxios.includes('react-redux'));
  assert.ok(reduxAxios.includes('axios'));
  assert.ok(reduxAxios.includes('react-hook-form'));
  assert.ok(reduxAxios.includes('@microsoft/signalr'));
  assert.ok(!reduxAxios.includes('zustand'));

  const zustandFetch = resolveReactPackages({
    state: 'zustand',
    httpClient: 'fetch',
    forms: 'none',
    styling: 'bootstrap',
    componentSystem: 'mui',
  });
  assert.ok(zustandFetch.includes('zustand'));
  assert.ok(!zustandFetch.includes('@reduxjs/toolkit'));
  assert.ok(!zustandFetch.includes('axios'));
  assert.ok(!zustandFetch.includes('react-hook-form'));
  assert.ok(zustandFetch.includes('bootstrap'));
  assert.ok(zustandFetch.includes('@mui/material'));
});

test('writeGenerationManifest outputs extended schema', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-test-'));

  await writeGenerationManifest({
    targetDirectory: tempDir,
    pascalName: 'TestApp',
    packageManager: 'pnpm',
    backend: {
      enabled: true,
      architecture: 'services',
      orm: 'dapper',
      database: 'postgresql',
      mapping: 'manual',
      authentication: 'identity-jwt',
      realtime: 'signalr',
      logging: 'serilog',
      backgroundJobs: 'hangfire',
    },
    frontend: {
      enabled: true,
      library: 'react',
      framework: 'vite',
      language: 'typescript',
      styling: 'tailwind',
      state: 'zustand',
      httpClient: 'fetch',
      forms: 'react-hook-form-zod',
      componentSystem: 'shadcn',
      localization: true,
      realtime: 'signalr',
    },
    modules: {},
  });

  const manifestPath = path.join(tempDir, '.fullstack-app.json');
  assert.ok(fs.existsSync(manifestPath));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.projectName, 'TestApp');
  assert.equal(manifest.backend.enabled, true);
  assert.equal(manifest.backend.architecture, 'services');
  assert.equal(manifest.backend.orm, 'dapper');
  assert.equal(manifest.backend.database, 'postgresql');
  assert.equal(manifest.backend.realtime, 'signalr');
  assert.equal(manifest.backend.backgroundJobs, 'hangfire');

  assert.equal(manifest.frontend.enabled, true);
  assert.equal(manifest.frontend.library, 'react');
  assert.equal(manifest.frontend.framework, 'vite');
  assert.equal(manifest.frontend.state, 'zustand');
  assert.equal(manifest.frontend.httpClient, 'fetch');
  assert.equal(manifest.frontend.realtime, 'signalr');

  fs.rmSync(tempDir, { recursive: true, force: true });
});
