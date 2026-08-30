import path from 'node:path';
import { copyTemplate, ensureDir, isNonEmptyDirectory, templatesRoot } from '../utils/filesystem.js';
import { GenerationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { runCommand } from '../utils/command.js';
import { generateBackend } from './backend.generator.js';
import { generateSolution } from './solution.generator.js';
import { generateFrontend } from './frontend/frontend.generator.js';
import { writeGeneratedReadme } from './readme.generator.js';
import { writeGenerationManifest } from './manifest.generator.js';
import { describeFrontend } from '../models/frontend.js';
import { installEnabledModules } from '../module-generator/module.generator.js';

/**
 * @param {object} options
 */
export async function generateProject(options) {
  const targetDirectory = path.join(options.output, options.folderName);

  if (await isNonEmptyDirectory(targetDirectory)) {
    throw new GenerationError(
      `Directory already exists and is not empty: ${targetDirectory}. Generation stopped to avoid overwriting files.`,
      {
        step: 'Validate target directory',
        command: '(none)',
        targetDirectory,
      },
    );
  }

  logger.success('Project name validated');
  await ensureDir(targetDirectory);
  logger.success('Root directory created');

  const replacements = {
    __PASCAL_NAME__: options.pascalName,
    __DISPLAY_NAME__: options.displayName,
    __FOLDER_NAME__: options.folderName,
  };

  const generationOptions = { ...options, targetDirectory, replacements };

  await copyTemplate(path.join(templatesRoot(), 'root'), targetDirectory, replacements);
  await writeGeneratedReadme(generationOptions);

  if (options.backend) {
    await generateBackend(generationOptions);
    await generateSolution(generationOptions);
    runCommand('dotnet', ['restore'], {
      cwd: targetDirectory,
      step: 'Restore backend packages',
    });
  }

  if (options.frontend.enabled) {
    await generateFrontend(generationOptions);
  }

  await writeGenerationManifest(generationOptions);

  const modulesToInstall = resolveModulesToInstall(options);
  if (modulesToInstall.length > 0 && options.backend) {
    logger.info(`Installing V4 modules: ${modulesToInstall.join(', ')}`);
    await installEnabledModules({
      projectRoot: targetDirectory,
      moduleIds: modulesToInstall,
      yes: true,
      defaultRole: options.defaultRole ?? 'User',
      roles: options.roles ?? ['Admin', 'Editor', 'User'],
    });
  }

  logger.success('Starter architecture generated');
  logger.info(`Created ${options.displayName} at ${targetDirectory}`);
  logger.info(`Frontend: ${describeFrontend(options.frontend)}`);
  logger.info('Generated files were left in place. Inspect them before running the apps.');
}

/**
 * @param {object} options
 * @returns {string[]}
 */
function resolveModulesToInstall(options) {
  const modules = options.modules ?? {};
  /** @type {string[]} */
  const ordered = [];
  const push = (id, enabled) => {
    if (enabled && !ordered.includes(id)) ordered.push(id);
  };

  push('auth', Boolean(modules.auth ?? options.auth));
  push('permissions', Boolean(modules.permissions));
  push('users', Boolean(modules.users));
  push('audit', Boolean(modules.audit));
  push('notifications', Boolean(modules.notifications));
  push('localization', Boolean(modules.localization));
  push('rich-text', Boolean(modules.richText));
  push('dashboard', Boolean(modules.dashboard ?? options.dashboard));
  return ordered;
}
