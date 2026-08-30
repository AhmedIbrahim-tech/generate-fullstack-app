import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePackageManager } from '../utils/validation.js';
import { isFrontendLibrary, isReactFramework } from '../models/frontend.js';

const PACKAGE_JSON_PATH = fileURLToPath(new URL('../../package.json', import.meta.url));

export function readPackageMeta() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
}

export function getBinCommandName() {
  const pkg = readPackageMeta();
  const bin = pkg.bin ?? {};
  return Object.keys(bin)[0] ?? pkg.name;
}

const BOOLEAN_FLAGS = {
  '--backend': ['backend', true],
  '--no-backend': ['backend', false],
  '--no-frontend': ['frontendEnabled', false],
  '--sql-server': ['sqlServer', true],
  '--no-sql-server': ['sqlServer', false],
  '--auth': ['auth', true],
  '--no-auth': ['auth', false],
  '--localization': ['localization', true],
  '--no-localization': ['localization', false],
  '--dashboard': ['dashboard', true],
  '--no-dashboard': ['dashboard', false],
  '--users': ['users', true],
  '--no-users': ['users', false],
  '--permissions': ['permissions', true],
  '--no-permissions': ['permissions', false],
  '--audit': ['audit', true],
  '--no-audit': ['audit', false],
  '--notifications': ['notifications', true],
  '--no-notifications': ['notifications', false],
  '--domain-localization': ['domainLocalization', true],
  '--no-domain-localization': ['domainLocalization', false],
  '--rich-text': ['richText', true],
  '--no-rich-text': ['richText', false],
};

/**
 * @param {string[]} argv
 */
export function parseArguments(argv) {
  const args = argv.slice(2);
  /** @type {Record<string, unknown>} */
  const options = {
    projectName: undefined,
    output: process.cwd(),
    yes: false,
    packageManager: undefined,
    backend: undefined,
    frontendEnabled: undefined,
    frontendLibrary: undefined,
    reactFramework: undefined,
    sqlServer: undefined,
    auth: undefined,
    localization: undefined,
    dashboard: undefined,
    users: undefined,
    permissions: undefined,
    audit: undefined,
    notifications: undefined,
    domainLocalization: undefined,
    richText: undefined,
    help: false,
    version: false,
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

    if (arg === '--yes' || arg === '-y') {
      options.yes = true;
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      const value = requireValue(args, index, '--output');
      options.output = path.resolve(value);
      index += 1;
      continue;
    }

    if (arg === '--package-manager' || arg === '-p') {
      const value = requireValue(args, index, '--package-manager');
      if (!validatePackageManager(value)) {
        throw new Error(`Unsupported package manager "${value}". Use npm, yarn, or pnpm.`);
      }
      options.packageManager = value;
      index += 1;
      continue;
    }

    if (arg === '--frontend') {
      const value = requireValue(args, index, '--frontend');
      if (!isFrontendLibrary(value)) {
        throw new Error(`Unsupported frontend "${value}". Use react or angular.`);
      }
      options.frontendEnabled = true;
      options.frontendLibrary = value;
      index += 1;
      continue;
    }

    if (arg === '--react-framework') {
      const value = requireValue(args, index, '--react-framework');
      if (!isReactFramework(value)) {
        throw new Error(`Unsupported React framework "${value}". Use next or vite.`);
      }
      options.reactFramework = value;
      index += 1;
      continue;
    }

    if (arg in BOOLEAN_FLAGS) {
      const [key, value] = BOOLEAN_FLAGS[arg];
      options[key] = value;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}. Use --help to see supported flags.`);
    }

    if (options.projectName) {
      throw new Error(`Unexpected extra argument: ${arg}`);
    }

    options.projectName = arg;
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

export function printHelp() {
  const pkg = readPackageMeta();
  const bin = getBinCommandName();

  const text = `
${pkg.name} v${pkg.version}

${pkg.description}

Usage:
  ${bin} [project-name] [options]
  node ./bin/${bin}.js [project-name] [options]

Options:
  -h, --help                         Show help
  -v, --version                      Show version
  -y, --yes                          Use defaults without prompting (skips summary confirm)
  -o, --output <dir>                 Parent directory for the new project (default: cwd)
  -p, --package-manager <name>       npm | yarn | pnpm (default: npm)

  --backend / --no-backend           Include ASP.NET Core backend (default: yes)
  --frontend react|angular           Enable a frontend library
  --no-frontend                      Skip frontend generation
  --react-framework next|vite        Required with --frontend react in non-interactive mode

  --sql-server / --no-sql-server     SQL Server provider (default: yes)
  --auth / --no-auth                 V4 Authentication module (Identity + JWT + refresh) (default: no with --yes)
  --users / --no-users               User management module (requires auth)
  --permissions / --no-permissions   Permissions/policies module (requires auth)
  --audit / --no-audit               Audit trail module
  --notifications / --no-notifications In-app notifications (requires auth)
  --domain-localization              Domain entity localization module
  --rich-text                        Structured rich-text (Tiptap) module
  --localization / --no-localization UI localization foundation (default: yes)
  --dashboard / --no-dashboard       Dashboard foundation module (default: yes)

Non-interactive examples:
  ${bin} MyApp --yes --frontend react --react-framework next
  ${bin} MyApp --yes --frontend react --react-framework vite --auth --users --permissions --audit --notifications --dashboard
  ${bin} MyApp --yes --frontend angular --auth --permissions --users
  ${bin} MyApp --yes --no-frontend

--yes with no frontend flags defaults to React + Next.js.
If you pass --frontend react, you must also pass --react-framework.
`.trim();

  process.stdout.write(`${text}\n`);
}

export function printVersion() {
  const pkg = readPackageMeta();
  process.stdout.write(`${pkg.version}\n`);
}

export const DEFAULT_OPTIONS = {
  packageManager: 'npm',
  backend: true,
  frontendEnabled: true,
  sqlServer: true,
  // V4 modules are opt-in even with --yes unless flags are passed.
  auth: false,
  users: false,
  permissions: false,
  audit: false,
  notifications: false,
  domainLocalization: false,
  richText: false,
  localization: true,
  dashboard: true,
};
