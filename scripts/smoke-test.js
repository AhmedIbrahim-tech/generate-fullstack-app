import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runCommand } from '../src/utils/command.js';
import { parseArguments } from '../src/cli/arguments.js';
import { resolveFrontendSelection } from '../src/models/frontend.js';
import { validateProjectName } from '../src/utils/validation.js';
import { run } from '../src/utils/package-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatorRoot = path.resolve(__dirname, '..');
const SMOKE_PREFIX = 'cfa-v1-smoke-';

function fail(message) {
  process.stderr.write(`✗ ${message}\n`);
  process.exitCode = 1;
}

function pass(message) {
  process.stdout.write(`✓ ${message}\n`);
}

function isSafeSmokeRoot(dir) {
  const resolved = path.resolve(dir);
  const tmp = path.resolve(os.tmpdir());
  const relative = path.relative(tmp, resolved);
  return (
    relative.length > 0 &&
    !relative.startsWith('..') &&
    !path.isAbsolute(relative) &&
    path.basename(resolved).startsWith(SMOKE_PREFIX)
  );
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function assertExists(target, label) {
  if (!(await pathExists(target))) {
    throw new Error(`Missing ${label}: ${target}`);
  }
  pass(label);
}

async function assertMissing(target, label) {
  if (await pathExists(target)) {
    throw new Error(`Unexpected path present (${label}): ${target}`);
  }
  pass(label);
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function generate(projectName, extraArgs, outputDir) {
  runCommand(
    process.execPath,
    [
      path.join(generatorRoot, 'bin', 'create-fullstack-app.js'),
      projectName,
      '--yes',
      '--package-manager',
      'npm',
      '--output',
      outputDir,
      ...extraArgs,
    ],
    {
      cwd: generatorRoot,
      step: `Generate ${projectName}`,
    },
  );
}

async function assertBackend(projectDir) {
  const name = path.basename(projectDir);
  await assertExists(path.join(projectDir, `${name}.slnx`), `${name} solution`);
  await assertMissing(path.join(projectDir, 'Backend'), `${name} has no Backend parent`);
  await assertExists(path.join(projectDir, 'API', 'API.csproj'), `${name} API`);
  await assertExists(path.join(projectDir, 'Application', 'Application.csproj'), `${name} Application`);
  await assertExists(path.join(projectDir, 'Domain', 'Domain.csproj'), `${name} Domain`);
  await assertExists(path.join(projectDir, 'Infrastructure', 'Infrastructure.csproj'), `${name} Infrastructure`);

  const applicationCsproj = await readText(path.join(projectDir, 'Application', 'Application.csproj'));
  const infrastructureCsproj = await readText(path.join(projectDir, 'Infrastructure', 'Infrastructure.csproj'));
  const apiCsproj = await readText(path.join(projectDir, 'API', 'API.csproj'));
  const domainCsproj = await readText(path.join(projectDir, 'Domain', 'Domain.csproj'));

  if (!applicationCsproj.includes('Domain.csproj')) {
    throw new Error(`${name}: Application must reference Domain`);
  }
  if (!infrastructureCsproj.includes('Application.csproj') || !infrastructureCsproj.includes('Domain.csproj')) {
    throw new Error(`${name}: Infrastructure must reference Application and Domain`);
  }
  if (!apiCsproj.includes('Application.csproj') || !apiCsproj.includes('Infrastructure.csproj')) {
    throw new Error(`${name}: API must reference Application and Infrastructure`);
  }
  if (domainCsproj.includes('ProjectReference')) {
    throw new Error(`${name}: Domain must not reference other projects`);
  }
  pass(`${name} Clean Architecture references`);

  process.stdout.write(`i ${name}: dotnet build\n`);
  runCommand('dotnet', ['build', `${name}.slnx`, '--nologo'], {
    cwd: projectDir,
    step: `${name} dotnet build`,
  });
  pass(`${name} backend build`);
}

function assertNoForbiddenDeps(pkg, names, label) {
  const all = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
  for (const name of names) {
    if (name in all) {
      throw new Error(`${label} unexpectedly depends on ${name}`);
    }
  }
}

async function main() {
  const invalid = ['', '../escape', 'bad name', 'con', '..'];
  for (const name of invalid) {
    const result = validateProjectName(name);
    if (result.ok) {
      throw new Error(`Expected invalid project name to be rejected: "${name}"`);
    }
  }
  pass('Project name validation');

  const invalidFrontend = resolveFrontendSelection({
    frontendEnabled: true,
    frontendLibrary: 'angular',
    reactFramework: 'next',
  });
  if (invalidFrontend.ok) {
    throw new Error('Angular + --react-framework next should be rejected');
  }
  pass('Rejects Angular + React framework');

  const missingFramework = resolveFrontendSelection({
    frontendEnabled: true,
    frontendLibrary: 'react',
  });
  if (missingFramework.ok) {
    throw new Error('React without --react-framework should be rejected in non-interactive resolution');
  }
  pass('Requires React framework in non-interactive mode');

  try {
    parseArguments(['node', 'cli', 'App', '--frontend', 'angular', '--react-framework', 'next']);
  } catch {
    // parse allows both flags; resolveFrontendSelection rejects the combo
  }
  const parsedCombo = parseArguments(['node', 'cli', 'App', '--frontend', 'angular', '--react-framework', 'next']);
  const combo = resolveFrontendSelection({
    frontendEnabled: parsedCombo.frontendEnabled,
    frontendLibrary: parsedCombo.frontendLibrary,
    reactFramework: parsedCombo.reactFramework,
  });
  if (combo.ok) {
    throw new Error('Parsed Angular + next combination should be invalid');
  }
  pass('CLI combination validation');

  const skipNext = process.argv.includes('--skip-next');
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), SMOKE_PREFIX));
  let succeeded = false;
  process.stdout.write(`i Smoke output root: ${tempRoot}\n`);
  if (skipNext) {
    process.stdout.write('i Skipping SmokeReactNext (--skip-next)\n');
  }

  try {
    if (!skipNext) {
    generate('SmokeReactNext', ['--frontend', 'react', '--react-framework', 'next'], tempRoot);
    const nextDir = path.join(tempRoot, 'SmokeReactNext');
    await assertBackend(nextDir);
    await assertExists(path.join(nextDir, 'Client'), 'Next Client');
    await assertExists(path.join(nextDir, 'Client', 'src', 'app'), 'Next App Router');
    await assertExists(
      path.join(nextDir, 'Client', 'src', 'modules', 'example', 'slices', 'thunks'),
      'Next slices/thunks',
    );
    await assertMissing(
      path.join(nextDir, 'Client', 'src', 'modules', 'example', 'thunks'),
      'Next sibling thunks absent',
    );
    await assertExists(path.join(nextDir, 'Client', 'src', 'lib', 'api', 'server-api.ts'), 'Next server-api');
    await assertExists(path.join(nextDir, 'Client', 'src', 'store', 'store.ts'), 'Next Redux store');
    await assertExists(path.join(nextDir, 'Client', 'src', 'i18n', 'request.ts'), 'next-intl foundation');
    const nextPkg = await readJson(path.join(nextDir, 'Client', 'package.json'));
    assertNoForbiddenDeps(nextPkg, ['@angular/core', '@ngrx/store'], 'React Next');
    const nextManifest = await readJson(path.join(nextDir, '.fullstack-app.json'));
    if (nextManifest.frontend.library !== 'react' || nextManifest.frontend.framework !== 'next') {
      throw new Error('Next manifest is incorrect');
    }
    process.stdout.write('i SmokeReactNext: frontend production build\n');
    run('npm', 'build', { cwd: path.join(nextDir, 'Client'), step: 'Next production build' });
    pass('React + Next production build');
    }

    generate('SmokeReactVite', ['--frontend', 'react', '--react-framework', 'vite'], tempRoot);
    const viteDir = path.join(tempRoot, 'SmokeReactVite');
    await assertBackend(viteDir);
    await assertExists(path.join(viteDir, 'Client', 'vite.config.ts'), 'Vite config');
    await assertExists(path.join(viteDir, 'Client', 'src', 'app', 'router', 'app-router.tsx'), 'React Router');
    await assertExists(
      path.join(viteDir, 'Client', 'src', 'modules', 'example', 'slices', 'thunks'),
      'Vite slices/thunks',
    );
    await assertMissing(
      path.join(viteDir, 'Client', 'src', 'modules', 'example', 'thunks'),
      'Vite sibling thunks absent',
    );
    await assertExists(path.join(viteDir, 'Client', 'src', 'store', 'store.ts'), 'Vite Redux store');
    await assertExists(path.join(viteDir, 'Client', 'src', 'lib', 'api', 'api-client.ts'), 'Vite api-client');
    await assertMissing(path.join(viteDir, 'Client', 'src', 'lib', 'api', 'server-api.ts'), 'Vite has no server-api');
    await assertExists(path.join(viteDir, 'Client', 'src', 'i18n', 'index.ts'), 'react-i18next foundation');
    const vitePkg = await readJson(path.join(viteDir, 'Client', 'package.json'));
    assertNoForbiddenDeps(vitePkg, ['next-intl', '@angular/core', '@ngrx/store'], 'React Vite');
    const viteEnv = await readText(path.join(viteDir, 'Client', '.env.example'));
    if (!viteEnv.includes('VITE_API_URL') || viteEnv.includes('NEXT_PUBLIC_API_URL')) {
      throw new Error('Vite env example is incorrect');
    }
    const viteManifest = await readJson(path.join(viteDir, '.fullstack-app.json'));
    if (viteManifest.frontend.framework !== 'vite') {
      throw new Error('Vite manifest is incorrect');
    }
    process.stdout.write('i SmokeReactVite: frontend production build\n');
    run('npm', 'build', { cwd: path.join(viteDir, 'Client'), step: 'Vite production build' });
    pass('React + Vite production build');

    generate('SmokeAngular', ['--frontend', 'angular'], tempRoot);
    const angularDir = path.join(tempRoot, 'SmokeAngular');
    await assertBackend(angularDir);
    await assertExists(path.join(angularDir, 'Client', 'src', 'app', 'app.routes.ts'), 'Angular app.routes');
    await assertExists(
      path.join(angularDir, 'Client', 'src', 'app', 'features', 'example'),
      'Angular example feature',
    );
    await assertExists(
      path.join(angularDir, 'Client', 'src', 'app', 'features', 'example', 'store', 'example.actions.ts'),
      'NgRx actions',
    );
    await assertExists(
      path.join(angularDir, 'Client', 'src', 'app', 'features', 'example', 'store', 'example.reducer.ts'),
      'NgRx reducer',
    );
    await assertExists(
      path.join(angularDir, 'Client', 'src', 'app', 'features', 'example', 'store', 'example.effects.ts'),
      'NgRx effects',
    );
    await assertExists(
      path.join(angularDir, 'Client', 'src', 'app', 'features', 'example', 'store', 'example.selectors.ts'),
      'NgRx selectors',
    );
    const angularPkg = await readJson(path.join(angularDir, 'Client', 'package.json'));
    assertNoForbiddenDeps(angularPkg, [
      'react',
      'react-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'react-hook-form',
      'next-intl',
      'sonner',
      'lucide-react',
      'framer-motion',
    ], 'Angular');
    await assertMissing(
      path.join(angularDir, 'Client', 'src', 'modules', 'example', 'slices', 'thunks'),
      'Angular does not use React thunk folders',
    );
    const angularManifest = await readJson(path.join(angularDir, '.fullstack-app.json'));
    if (angularManifest.frontend.library !== 'angular' || angularManifest.frontend.framework !== null) {
      throw new Error('Angular manifest is incorrect');
    }
    process.stdout.write('i SmokeAngular: frontend production build\n');
    run('npm', 'build', { cwd: path.join(angularDir, 'Client'), step: 'Angular production build' });
    pass('Angular production build');

    generate('SmokeFrontendOnly', ['--no-backend', '--frontend', 'react', '--react-framework', 'vite'], tempRoot);
    const frontendOnlyDir = path.join(tempRoot, 'SmokeFrontendOnly');
    await assertExists(path.join(frontendOnlyDir, 'Client'), 'Frontend-only Client');
    await assertMissing(path.join(frontendOnlyDir, 'API'), 'Frontend-only has no API');
    const slnFiles = (await fs.readdir(frontendOnlyDir)).filter((name) => name.endsWith('.slnx') || name.endsWith('.sln'));
    if (slnFiles.length > 0) {
      throw new Error(`Frontend-only project should not contain a solution file: ${slnFiles.join(', ')}`);
    }
    pass('Frontend-only generation has no solution file');

    generate('SmokeBackendOnly', ['--no-frontend'], tempRoot);
    const backendOnlyDir = path.join(tempRoot, 'SmokeBackendOnly');
    await assertBackend(backendOnlyDir);
    await assertMissing(path.join(backendOnlyDir, 'Client'), 'Backend-only has no Client');
    pass('Backend-only generation has no frontend prompts or Client');

    succeeded = true;
    pass('Smoke test matrix completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(message);
    process.stderr.write(`i Inspect smoke projects at: ${tempRoot}\n`);
  } finally {
    if (succeeded && isSafeSmokeRoot(tempRoot)) {
      await fs.rm(tempRoot, { recursive: true, force: true });
      pass('Removed smoke-test temp directory');
    }
  }
}

await main();
