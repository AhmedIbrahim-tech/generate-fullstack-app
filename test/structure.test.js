import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import {
  resolveProjectPaths,
  getBackendDirectory,
  getFrontendDirectory,
  getBackendFilePath,
  getFrontendFilePath,
  getBackendRelativePath,
  getFrontendRelativePath,
} from '../src/utils/project-paths.js';
import { readManifest, writeManifest, resolveFrontendStrategy, findProjectRoot } from '../src/feature-generator/utils/manifest.js';
import { writeGenerationManifest } from '../src/generators/manifest.generator.js';
import { buildFeatureConfig } from '../src/feature-generator/feature.config.js';
import { planBackendFeature } from '../src/feature-generator/backend/backend-feature.generator.js';
import { planFrontendFeature } from '../src/feature-generator/frontend/frontend-feature.generator.js';
import { planAuthBackend } from '../src/module-generator/auth/auth-backend.generator.js';
import { planAuthFrontend } from '../src/module-generator/auth/auth-frontend.generator.js';
import { setModuleManifestContext } from '../src/module-generator/modules-orchestrator-helpers.js';

test('resolveProjectPaths handles null, undefined, and empty manifest without throwing', () => {
  // Null manifest
  const nullRes = resolveProjectPaths(null);
  assert.deepEqual(nullRes, { backend: null, frontend: null });

  // Undefined manifest
  const undefRes = resolveProjectPaths(undefined);
  assert.deepEqual(undefRes, { backend: null, frontend: null });

  // Non-object manifest
  const strRes = resolveProjectPaths('invalid-manifest');
  assert.deepEqual(strRes, { backend: null, frontend: null });

  // Empty object manifest
  const emptyRes = resolveProjectPaths({});
  assert.deepEqual(emptyRes, { backend: null, frontend: null });
});

test('resolveProjectPaths infers paths from backend/frontend blocks when paths property is missing', () => {
  // Full Stack inference
  const fullstack = resolveProjectPaths({
    backend: { enabled: true },
    frontend: { enabled: true, library: 'react' },
  });
  assert.deepEqual(fullstack, { backend: 'Backend', frontend: 'Frontend' });

  // Backend Only inference
  const backendOnly = resolveProjectPaths({
    backend: { enabled: true },
    frontend: { enabled: false },
  });
  assert.deepEqual(backendOnly, { backend: '.', frontend: null });

  // Frontend Only inference
  const frontendOnly = resolveProjectPaths({
    backend: { enabled: false },
    frontend: { enabled: true, library: 'react' },
  });
  assert.deepEqual(frontendOnly, { backend: null, frontend: '.' });
});

test('resolveProjectPaths respects explicit paths property', () => {
  const explicit = resolveProjectPaths({
    paths: { backend: 'Backend', frontend: 'Frontend' },
  });
  assert.deepEqual(explicit, { backend: 'Backend', frontend: 'Frontend' });

  const explicitBack = resolveProjectPaths({
    paths: { backend: '.', frontend: null },
  });
  assert.deepEqual(explicitBack, { backend: '.', frontend: null });

  const explicitFront = resolveProjectPaths({
    paths: { backend: null, frontend: '.' },
  });
  assert.deepEqual(explicitFront, { backend: null, frontend: '.' });
});

test('project path helpers safely handle null and undefined manifests', () => {
  const root = path.join('workspace', 'MyProject');

  // Relative path helpers with null/undefined
  assert.equal(getBackendRelativePath(null), null);
  assert.equal(getFrontendRelativePath(null), null);
  assert.equal(getBackendRelativePath(undefined), null);
  assert.equal(getFrontendRelativePath(undefined), null);

  // Directory helpers with null manifest
  assert.equal(getBackendDirectory(root, null), null);
  assert.equal(getFrontendDirectory(root, null), null);
  assert.equal(getBackendDirectory(null, { paths: { backend: 'Backend', frontend: 'Frontend' } }), null);

  // File path helpers with null manifest default to direct relative path
  assert.equal(
    getBackendFilePath(null, 'Domain', 'Entities', 'User.cs'),
    path.join('Domain', 'Entities', 'User.cs'),
  );
  assert.equal(
    getFrontendFilePath(null, 'src', 'modules', 'users'),
    path.join('src', 'modules', 'users'),
  );

  // Required arguments validation
  assert.throws(() => getBackendFilePath(null, ''), /projectFolder is required/);
});

test('project path helpers resolve directories and file paths accurately with valid manifests', () => {
  const root = path.join('workspace', 'MyProject');

  // Full Stack
  const fullManifest = { paths: { backend: 'Backend', frontend: 'Frontend' } };
  assert.equal(
    getBackendDirectory(root, fullManifest),
    path.join(root, 'Backend'),
  );
  assert.equal(
    getFrontendDirectory(root, fullManifest),
    path.join(root, 'Frontend'),
  );
  assert.equal(
    getBackendFilePath(fullManifest, 'Domain', 'Entities', 'User.cs'),
    path.join('Backend', 'Domain', 'Entities', 'User.cs'),
  );
  assert.equal(
    getFrontendFilePath(fullManifest, 'src', 'modules', 'users'),
    path.join('Frontend', 'src', 'modules', 'users'),
  );

  // Backend Only
  const backManifest = { paths: { backend: '.', frontend: null } };
  assert.equal(getBackendDirectory(root, backManifest), root);
  assert.equal(getFrontendDirectory(root, backManifest), null);
  assert.equal(
    getBackendFilePath(backManifest, 'Domain', 'Entities', 'User.cs'),
    path.join('Domain', 'Entities', 'User.cs'),
  );

  // Frontend Only
  const frontManifest = { paths: { backend: null, frontend: '.' } };
  assert.equal(getBackendDirectory(root, frontManifest), null);
  assert.equal(getFrontendDirectory(root, frontManifest), root);
  assert.equal(
    getFrontendFilePath(frontManifest, 'src', 'modules', 'users'),
    path.join('src', 'modules', 'users'),
  );
});

test('readManifest provides meaningful error messages for missing, empty, or invalid manifest files', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-errors-'));

  // 1. Missing project root
  await assert.rejects(
    async () => await readManifest(''),
    /Project root directory is required/i,
  );

  // 2. Non-existent manifest
  await assert.rejects(
    async () => await readManifest(tempDir),
    /Project manifest not found at/i,
  );

  // 3. Malformed JSON manifest
  const malformedPath = path.join(tempDir, '.fullstack-app.json');
  fs.writeFileSync(malformedPath, '{ not-valid-json }', 'utf8');
  await assert.rejects(
    async () => await readManifest(tempDir),
    /Malformed JSON in manifest/i,
  );

  // 4. Non-object manifest
  fs.writeFileSync(malformedPath, '"just a string"', 'utf8');
  await assert.rejects(
    async () => await readManifest(tempDir),
    /Invalid manifest format/i,
  );

  // 5. Valid manifest reads correctly
  fs.writeFileSync(malformedPath, JSON.stringify({ projectName: 'TestApp' }), 'utf8');
  const loaded = await readManifest(tempDir);
  assert.equal(loaded.projectName, 'TestApp');

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('resolveFrontendStrategy safely handles null, undefined, and non-object inputs', () => {
  assert.deepEqual(resolveFrontendStrategy(null), { library: null, framework: null });
  assert.deepEqual(resolveFrontendStrategy(undefined), { library: null, framework: null });
  assert.deepEqual(resolveFrontendStrategy({}), { library: null, framework: null });
  assert.deepEqual(
    resolveFrontendStrategy({ frontend: { library: 'react', framework: 'next' } }),
    { library: 'react', framework: 'next' },
  );
  assert.deepEqual(
    resolveFrontendStrategy({ frontend: { library: 'react', framework: 'vite' } }),
    { library: 'react', framework: 'vite' },
  );
  assert.deepEqual(
    resolveFrontendStrategy({ frontend: { library: 'angular' } }),
    { library: 'angular', framework: null },
  );
});

test('manifest generator writes paths correctly for Full Stack, Backend Only, and Frontend Only', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-paths-'));

  // 1. Full Stack Manifest
  const fullstackDir = path.join(tempDir, 'fullstack');
  fs.mkdirSync(fullstackDir);
  await writeGenerationManifest({
    targetDirectory: fullstackDir,
    pascalName: 'FullApp',
    backend: { enabled: true, architecture: 'cqrs-mediatr' },
    frontend: { enabled: true, library: 'react', framework: 'next' },
    modules: {},
  });
  const fullManifest = JSON.parse(
    fs.readFileSync(path.join(fullstackDir, '.fullstack-app.json'), 'utf8'),
  );
  assert.deepEqual(fullManifest.paths, { backend: 'Backend', frontend: 'Frontend' });

  // 2. Backend Only Manifest
  const backDir = path.join(tempDir, 'backend-only');
  fs.mkdirSync(backDir);
  await writeGenerationManifest({
    targetDirectory: backDir,
    pascalName: 'BackApp',
    backend: { enabled: true, architecture: 'cqrs-mediatr' },
    frontend: { enabled: false, library: null },
    modules: {},
  });
  const backManifest = JSON.parse(
    fs.readFileSync(path.join(backDir, '.fullstack-app.json'), 'utf8'),
  );
  assert.deepEqual(backManifest.paths, { backend: '.', frontend: null });

  // 3. Frontend Only Manifest
  const frontDir = path.join(tempDir, 'frontend-only');
  fs.mkdirSync(frontDir);
  await writeGenerationManifest({
    targetDirectory: frontDir,
    pascalName: 'FrontApp',
    backend: { enabled: false },
    frontend: { enabled: true, library: 'react', framework: 'next' },
    modules: {},
  });
  const frontManifest = JSON.parse(
    fs.readFileSync(path.join(frontDir, '.fullstack-app.json'), 'utf8'),
  );
  assert.deepEqual(frontManifest.paths, { backend: null, frontend: '.' });

  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('feature generator plans paths according to manifest structure (Full Stack vs Standalone)', async () => {
  // Full Stack feature planning
  const fullManifest = {
    backend: { enabled: true },
    frontend: { enabled: true, library: 'react', framework: 'next' },
    paths: { backend: 'Backend', frontend: 'Frontend' },
  };
  const fullConfig = buildFeatureConfig({
    singularName: 'Product',
    fields: [{ name: 'Name', type: 'string' }],
    manifest: fullManifest,
    projectRoot: '/test',
    frontendStrategy: { library: 'react', framework: 'next' },
  });

  const fullBackend = planBackendFeature(fullConfig);
  const fullFrontend = await planFrontendFeature(fullConfig);

  // Assert Backend files are prefixed with Backend/
  for (const f of fullBackend) {
    assert.match(f.relativePath, /^Backend[\\/]/);
  }

  // Assert Frontend files are prefixed with Frontend/
  for (const f of fullFrontend.files) {
    assert.match(f.relativePath, /^Frontend[\\/]/);
  }

  // Assert no file contains web-client or Client
  for (const f of [...fullBackend, ...fullFrontend.files]) {
    assert.ok(!f.relativePath.includes('web-client'));
    assert.ok(!f.relativePath.startsWith('Client'));
  }

  // Backend Only feature planning
  const backManifest = {
    backend: { enabled: true },
    frontend: { enabled: false },
    paths: { backend: '.', frontend: null },
  };
  const backConfig = buildFeatureConfig({
    singularName: 'Product',
    fields: [{ name: 'Name', type: 'string' }],
    manifest: backManifest,
    projectRoot: '/test',
    frontendStrategy: { library: null },
  });
  const backOnlyBackend = planBackendFeature(backConfig);
  for (const f of backOnlyBackend) {
    assert.match(f.relativePath, /^(Domain|Application|Infrastructure|API)[\\/]/);
    assert.ok(!f.relativePath.startsWith('Backend'));
  }

  // Frontend Only feature planning
  const frontManifest = {
    backend: { enabled: false },
    frontend: { enabled: true, library: 'react', framework: 'vite' },
    paths: { backend: null, frontend: '.' },
  };
  const frontConfig = buildFeatureConfig({
    singularName: 'Product',
    fields: [{ name: 'Name', type: 'string' }],
    manifest: frontManifest,
    projectRoot: '/test',
    frontendStrategy: { library: 'react', framework: 'vite' },
  });
  const frontOnlyFrontend = await planFrontendFeature(frontConfig);
  for (const f of frontOnlyFrontend.files) {
    assert.match(f.relativePath, /^src[\\/]/);
    assert.ok(!f.relativePath.startsWith('Frontend'));
    assert.ok(!f.relativePath.startsWith('Client'));
    assert.ok(!f.relativePath.includes('web-client'));
  }
});

test('module generator respects manifest paths and avoids web-client / Client', async () => {
  // Full Stack
  const fullManifest = {
    backend: { enabled: true },
    frontend: { enabled: true, library: 'react', framework: 'next' },
    paths: { backend: 'Backend', frontend: 'Frontend' },
  };
  setModuleManifestContext(fullManifest);
  const backendFiles = planAuthBackend({
    projectName: 'TestApp',
  });
  const frontendResult = planAuthFrontend({
    projectName: 'TestApp',
    frontendStrategy: { library: 'react', framework: 'next' },
  });

  const allFiles = [...backendFiles, ...frontendResult.files];
  for (const file of allFiles) {
    assert.ok(
      file.relativePath.startsWith('Backend') || file.relativePath.startsWith('Frontend'),
      `Expected ${file.relativePath} to start with Backend or Frontend, got ${file.relativePath}`,
    );
    assert.ok(!file.relativePath.includes('web-client'));
    assert.ok(!file.relativePath.startsWith('Client'));
  }

  // Reset context
  setModuleManifestContext(null);
});

test('README generator outputs correct folder structure and commands for all 3 modes', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readme-structure-'));
  const { writeGeneratedReadme } = await import('../src/generators/readme.generator.js');

  // 1. Full Stack README
  const fullstackDir = path.join(tempDir, 'fullstack');
  fs.mkdirSync(fullstackDir);
  await writeGeneratedReadme({
    targetDirectory: fullstackDir,
    displayName: 'FullStackApp',
    pascalName: 'FullStackApp',
    backend: { enabled: true, architecture: 'cqrs-mediatr', orm: 'efcore', database: 'sqlserver' },
    frontend: { enabled: true, library: 'react', framework: 'next', language: 'typescript', styling: 'tailwind' },
    paths: { backend: 'Backend', frontend: 'Frontend' },
  });
  const fullReadme = fs.readFileSync(path.join(fullstackDir, 'README.md'), 'utf8');
  assert.ok(fullReadme.includes('cd Backend'));
  assert.ok(fullReadme.includes('cd Frontend'));
  assert.ok(fullReadme.includes('Backend/API/'));
  assert.ok(fullReadme.includes('Frontend/'));
  assert.ok(!fullReadme.includes('web-client'));
  assert.ok(!fullReadme.includes('`Client/'));

  // 2. Backend Only README
  const backDir = path.join(tempDir, 'backend-only');
  fs.mkdirSync(backDir);
  await writeGeneratedReadme({
    targetDirectory: backDir,
    displayName: 'BackendOnlyApp',
    pascalName: 'BackendOnlyApp',
    backend: { enabled: true, architecture: 'cqrs-mediatr', orm: 'efcore', database: 'sqlserver' },
    frontend: { enabled: false },
    paths: { backend: '.', frontend: null },
  });
  const backReadme = fs.readFileSync(path.join(backDir, 'README.md'), 'utf8');
  assert.ok(!backReadme.includes('cd Backend'));
  assert.ok(!backReadme.includes('Frontend'));
  assert.ok(backReadme.includes('`API/`'));
  assert.ok(backReadme.includes('dotnet run --project API'));
  assert.ok(!backReadme.includes('web-client'));

  // 3. Frontend Only README
  const frontDir = path.join(tempDir, 'frontend-only');
  fs.mkdirSync(frontDir);
  await writeGeneratedReadme({
    targetDirectory: frontDir,
    displayName: 'FrontendOnlyApp',
    pascalName: 'FrontendOnlyApp',
    backend: { enabled: false },
    frontend: { enabled: true, library: 'react', framework: 'vite', language: 'typescript', styling: 'tailwind' },
    paths: { backend: null, frontend: '.' },
  });
  const frontReadme = fs.readFileSync(path.join(frontDir, 'README.md'), 'utf8');
  assert.ok(!frontReadme.includes('Backend'));
  assert.ok(!frontReadme.includes('cd Frontend'));
  assert.ok(frontReadme.includes('Frontend files live at the project root'));
  assert.ok(!frontReadme.includes('web-client'));

  fs.rmSync(tempDir, { recursive: true, force: true });
});
