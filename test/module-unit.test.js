import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODULES,
  resolveModuleInstallOrder,
  getMissingDependencies,
  isModuleEnabled,
  buildDefaultModulesBlock,
  normalizeModuleId,
  moduleManifestKey,
  MODULE_GENERATOR_VERSION,
} from '../src/module-generator/module.registry.js';
import { parseModuleArguments } from '../src/module-generator/module.arguments.js';
import { getAuthAppsettingsPatch } from '../src/module-generator/auth/auth-backend.generator.js';
import { parseFieldFlag } from '../src/feature-generator/fields/field-parser.js';
import { patchProgramForAuth } from '../src/module-generator/auth/auth-program-patch.js';

test('module version is 4.0.0', () => {
  assert.equal(MODULE_GENERATOR_VERSION, '4.0.0');
});

test('normalizeModuleId maps richtext aliases', () => {
  assert.equal(normalizeModuleId('rich-text'), 'rich-text');
  assert.equal(normalizeModuleId('richText'), 'rich-text');
  assert.equal(normalizeModuleId('richtext'), 'rich-text');
  assert.equal(normalizeModuleId('auth'), 'auth');
  assert.equal(normalizeModuleId('nope'), null);
});

test('moduleManifestKey maps rich-text to richText', () => {
  assert.equal(moduleManifestKey('rich-text'), 'richText');
  assert.equal(moduleManifestKey('auth'), 'auth');
});

test('dependency graph: notifications requires auth first', () => {
  const order = resolveModuleInstallOrder('notifications');
  assert.deepEqual(order, ['auth', 'notifications']);
});

test('dependency graph: users requires auth', () => {
  assert.deepEqual(resolveModuleInstallOrder('users'), ['auth', 'users']);
});

test('missing dependencies detected from manifest', () => {
  const manifest = { modules: { auth: { enabled: false } } };
  assert.deepEqual(getMissingDependencies(manifest, 'users'), ['auth']);
  assert.deepEqual(
    getMissingDependencies({ modules: { auth: { enabled: true } } }, 'users'),
    [],
  );
});

test('isModuleEnabled reads richText key', () => {
  const manifest = { modules: { richText: { enabled: true, version: '4.0.0' } } };
  assert.equal(isModuleEnabled(manifest, 'rich-text'), true);
});

test('buildDefaultModulesBlock keeps dependents gated by auth', () => {
  const modules = buildDefaultModulesBlock({
    auth: true,
    modules: { users: true, notifications: true, permissions: true },
  });
  assert.equal(modules.auth.enabled, true);
  assert.equal(modules.users.enabled, true);
  assert.equal(modules.notifications.enabled, true);

  const noAuth = buildDefaultModulesBlock({
    auth: false,
    modules: { users: true, notifications: true },
  });
  assert.equal(noAuth.users.enabled, false);
  assert.equal(noAuth.notifications.enabled, false);
});

test('parseModuleArguments supports list/status/dry-run', () => {
  const parsed = parseModuleArguments([
    'node',
    'cli',
    'auth',
    '--dry-run',
    '--yes',
    '--roles',
    'Admin|User',
  ]);
  assert.equal(parsed.moduleName, 'auth');
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.yes, true);
  assert.deepEqual(parsed.roles, ['Admin', 'User']);
});

test('auth appsettings never embeds production secrets', () => {
  const patch = getAuthAppsettingsPatch();
  assert.equal(patch.Jwt.SigningKey, '');
  assert.equal(patch.Auth.SeedAdmin.Enabled, false);
  assert.equal(patch.Auth.SeedAdmin.Password, '');
  assert.equal(patch.RefreshToken.HttpOnly, true);
  assert.equal(patch.RefreshToken.Secure, true);
});

test('permission naming convention Feature.Action', () => {
  assert.ok(MODULES.permissions);
  const sample = ['Products.View', 'Products.Create', 'Users.Manage'];
  for (const name of sample) {
    assert.match(name, /^[A-Za-z]+\.[A-Za-z]+$/);
  }
});

test('richText field parsing', () => {
  const field = parseFieldFlag('Content:richText:required');
  assert.equal(field.kind, 'scalar');
  assert.equal(field.type, 'string');
  assert.equal(field.richText, true);
  assert.ok(field.maxLength >= 100000);
});

test('Program.cs auth patch is idempotent', () => {
  const source = `using Acme.Infrastructure;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddInfrastructure(builder.Configuration);
var app = builder.Build();
app.MapControllers();
app.Run();
`;
  const once = patchProgramForAuth(source);
  assert.equal(once.changed, true);
  assert.ok(once.contents.includes('AddAuthModule'));
  assert.ok(once.contents.includes('UseAuthentication'));
  const twice = patchProgramForAuth(once.contents);
  assert.equal(twice.changed, false);
});

test('module catalog lists expected V4 modules', () => {
  const ids = Object.keys(MODULES).sort();
  assert.deepEqual(ids, [
    'audit',
    'auth',
    'dashboard',
    'localization',
    'notifications',
    'permissions',
    'rich-text',
    'users',
  ]);
});
