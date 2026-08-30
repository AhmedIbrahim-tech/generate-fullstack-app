import { runCommand } from './command.js';

/**
 * @param {'npm' | 'yarn' | 'pnpm'} packageManager
 */
export function getCreateNextAppPackageManagerFlag(packageManager) {
  switch (packageManager) {
    case 'yarn':
      return '--use-yarn';
    case 'pnpm':
      return '--use-pnpm';
    default:
      return '--use-npm';
  }
}

/**
 * @param {'npm' | 'yarn' | 'pnpm'} packageManager
 */
function addInvocation(packageManager, packages, dev) {
  switch (packageManager) {
    case 'yarn':
      return { command: 'yarn', args: ['add', ...(dev ? ['--dev'] : []), ...packages] };
    case 'pnpm':
      return { command: 'pnpm', args: ['add', ...(dev ? ['-D'] : []), ...packages] };
    default:
      return { command: 'npm', args: ['install', ...(dev ? ['--save-dev'] : []), ...packages] };
  }
}

/**
 * @param {'npm' | 'yarn' | 'pnpm'} packageManager
 * @param {{ cwd: string, step?: string }} options
 */
export function install(packageManager, options) {
  const args = packageManager === 'yarn' ? [] : ['install'];
  runCommand(packageManager, args, {
    cwd: options.cwd,
    step: options.step ?? `Install dependencies (${packageManager})`,
  });
}

/**
 * @param {'npm' | 'yarn' | 'pnpm'} packageManager
 * @param {string[]} packages
 * @param {{ cwd: string, step?: string }} options
 */
export function add(packageManager, packages, options) {
  if (packages.length === 0) {
    return;
  }

  const { command, args } = addInvocation(packageManager, packages, false);
  runCommand(command, args, {
    cwd: options.cwd,
    step: options.step ?? 'Add packages',
  });
}

/**
 * @param {'npm' | 'yarn' | 'pnpm'} packageManager
 * @param {string[]} packages
 * @param {{ cwd: string, step?: string }} options
 */
export function addDev(packageManager, packages, options) {
  if (packages.length === 0) {
    return;
  }

  const { command, args } = addInvocation(packageManager, packages, true);
  runCommand(command, args, {
    cwd: options.cwd,
    step: options.step ?? 'Add dev packages',
  });
}

/**
 * @param {'npm' | 'yarn' | 'pnpm'} packageManager
 * @param {string} script
 * @param {{ cwd: string, step?: string, extraArgs?: string[] }} options
 */
export function run(packageManager, script, options) {
  const extraArgs = options.extraArgs ?? [];

  switch (packageManager) {
    case 'yarn':
      runCommand('yarn', [script, ...extraArgs], {
        cwd: options.cwd,
        step: options.step ?? `Run ${script}`,
      });
      break;
    case 'pnpm':
      runCommand('pnpm', [script, ...extraArgs], {
        cwd: options.cwd,
        step: options.step ?? `Run ${script}`,
      });
      break;
    default:
      runCommand('npm', ['run', script, ...extraArgs], {
        cwd: options.cwd,
        step: options.step ?? `Run ${script}`,
      });
  }
}

/**
 * Execute a local or downloaded binary without interpolating a shell string.
 * npm exec -- <tool> ...
 * yarn exec <tool> ...
 * pnpm exec <tool> ...
 *
 * @param {'npm' | 'yarn' | 'pnpm'} packageManager
 * @param {string[]} toolAndArgs
 * @param {{ cwd: string, step?: string, env?: NodeJS.ProcessEnv }} options
 */
export function exec(packageManager, toolAndArgs, options) {
  switch (packageManager) {
    case 'yarn':
      runCommand('yarn', ['exec', ...toolAndArgs], {
        cwd: options.cwd,
        env: options.env,
        step: options.step ?? `Exec ${toolAndArgs[0]}`,
      });
      break;
    case 'pnpm':
      runCommand('pnpm', ['exec', ...toolAndArgs], {
        cwd: options.cwd,
        env: options.env,
        step: options.step ?? `Exec ${toolAndArgs[0]}`,
      });
      break;
    default:
      runCommand('npm', ['exec', '--yes', '--', ...toolAndArgs], {
        cwd: options.cwd,
        env: options.env,
        step: options.step ?? `Exec ${toolAndArgs[0]}`,
      });
  }
}

/**
 * User-agent hint so create-vite/create-next-app pick the selected manager.
 * @param {'npm' | 'yarn' | 'pnpm'} packageManager
 */
export function packageManagerUserAgent(packageManager) {
  switch (packageManager) {
    case 'yarn':
      return 'yarn/1.22.0 npm/? node/?';
    case 'pnpm':
      return 'pnpm/9.0.0 npm/? node/?';
    default:
      return 'npm/10.0.0 node/?';
  }
}

export const installPackages = add;
export const runPackageScript = run;
