import path from 'node:path';
import { writeFile } from '../utils/filesystem.js';
import { readPackageMeta } from '../cli/arguments.js';
import { buildDefaultModulesBlock } from '../module-generator/module.registry.js';

/**
 * @param {object} options
 */
export async function writeGenerationManifest(options) {
  const pkg = readPackageMeta();
  const modules = buildDefaultModulesBlock({
    auth: Boolean(options.modules?.auth ?? options.auth),
    userManagement: options.modules?.users,
    modules: options.modules,
    audit: options.modules?.audit,
    notifications: options.modules?.notifications,
    domainLocalization: options.modules?.localization ?? options.localization,
    richText: options.modules?.richText,
    dashboard: options.modules?.dashboard ?? options.dashboard,
  });

  // Manifest starts with modules disabled; installEnabledModules flips them
  // after scaffolding so the authoritative state matches installed files.
  const initialModules = Object.fromEntries(
    Object.entries(modules).map(([key, value]) => [
      key,
      value.enabled ? { enabled: false } : { enabled: false },
    ]),
  );

  const manifest = {
    generatorVersion: pkg.version,
    projectName: options.pascalName,
    backend: options.backend ? 'aspnet-core' : null,
    frontend: options.frontend.enabled
      ? {
          library: options.frontend.library,
          framework: options.frontend.framework,
        }
      : {
          library: null,
          framework: null,
        },
    packageManager: options.packageManager,
    modules: initialModules,
  };

  await writeFile(
    path.join(options.targetDirectory, '.fullstack-app.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}
