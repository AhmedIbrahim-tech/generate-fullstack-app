import { readPackageMeta } from '../cli/arguments.js';
import {
  MODULE_GENERATOR_VERSION,
  listModuleIds,
  normalizeModuleId,
  MODULES,
} from './module.registry.js';

/**
 * @param {string[]} argv
 */
export function parseModuleArguments(argv) {
  const args = argv.slice(2);

  /** @type {Record<string, unknown>} */
  const options = {
    moduleName: undefined,
    dryRun: false,
    migration: false,
    force: false,
    list: false,
    status: false,
    help: false,
    version: false,
    yes: false,
    defaultRole: 'User',
    roles: ['Admin', 'Editor', 'User'],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--version' || arg === '-v') {
      options.version = true;
      continue;
    }
    if (arg === '--list') {
      options.list = true;
      continue;
    }
    if (arg === '--status') {
      options.status = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--migration') {
      options.migration = true;
      continue;
    }
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }
    if (arg === '--default-role') {
      options.defaultRole = requireValue(args, index, '--default-role');
      index += 1;
      continue;
    }
    if (arg === '--roles') {
      const value = requireValue(args, index, '--roles');
      options.roles = value.split('|').map((r) => r.trim()).filter(Boolean);
      index += 1;
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}. Use --help.`);
    }
    if (options.moduleName) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }
    const normalized = normalizeModuleId(arg);
    if (!normalized) {
      throw new Error(
        `Unknown module "${arg}". Available: ${listModuleIds().join(', ')}`,
      );
    }
    options.moduleName = normalized;
  }

  return options;
}

/**
 * @param {string[]} args
 * @param {number} index
 * @param {string} flag
 */
function requireValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith('-')) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

export function printModuleHelp() {
  const pkg = readPackageMeta();
  const lines = listModuleIds()
    .map((id) => `  ${id.padEnd(16)} ${MODULES[id].description}`)
    .join('\n');

  const text = `
${pkg.name} module generator v${MODULE_GENERATOR_VERSION}

Usage:
  create-fullstack-module <module> [options]
  node ./bin/create-fullstack-module.js <module> [options]

Modules:
${lines}

Options:
  -h, --help              Show help
  -v, --version           Show version
  --list                  List available modules
  --status                Show enabled modules from .fullstack-app.json
  --dry-run               Print plan without writing files
  --migration             Generate EF migration after install
  --force                 Reinstall generator-owned module files
  -y, --yes               Skip confirmation prompts
  --default-role <name>   Default registration role (auth)
  --roles Admin|Editor|User

Examples:
  create-fullstack-module auth --yes
  create-fullstack-module notifications --dry-run
  create-fullstack-module --status
`.trim();

  process.stdout.write(`${text}\n`);
}

export function printModuleVersion() {
  process.stdout.write(`${MODULE_GENERATOR_VERSION}\n`);
}
