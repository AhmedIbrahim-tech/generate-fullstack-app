import { input, select, confirm } from '@inquirer/prompts';
import { DEFAULT_OPTIONS } from './arguments.js';
import { printGenerationSummary } from './summary.js';
import { validateProjectName, validatePackageManager } from '../utils/validation.js';
import { GenerationError } from '../utils/errors.js';
import { defaultFrontendSelection, resolveFrontendSelection } from '../models/frontend.js';

/**
 * @param {Record<string, unknown>} parsed
 */
export async function resolveOptions(parsed) {
  const projectName = await resolveProjectName(parsed);
  const names = projectName.names;

  const backend = await resolveFlag(parsed, 'backend', 'Include ASP.NET Core backend?', DEFAULT_OPTIONS.backend);
  const sqlServer = backend
    ? await resolveFlag(parsed, 'sqlServer', 'Use SQL Server?', DEFAULT_OPTIONS.sqlServer)
    : false;

  const frontend = await resolveFrontend(parsed);
  const packageManager = await resolvePackageManager(parsed);

  const modules = await resolveV4Modules(parsed, backend, frontend.enabled);

  const localization = frontend.enabled
    ? await resolveFlag(parsed, 'localization', 'Include UI localization foundation?', DEFAULT_OPTIONS.localization)
    : false;

  if (!backend && !frontend.enabled) {
    throw new GenerationError('At least one of backend or frontend must be enabled.', {
      step: 'Validate generation options',
      command: '(none)',
      targetDirectory: parsed.output,
    });
  }

  const options = {
    ...names,
    output: parsed.output,
    yes: Boolean(parsed.yes),
    packageManager,
    backend,
    frontend,
    sqlServer,
    auth: Boolean(modules.auth),
    localization,
    dashboard: Boolean(modules.dashboard),
    modules,
    defaultRole: modules.defaultRole ?? 'User',
    roles: modules.roles ?? ['Admin', 'Editor', 'User'],
  };

  if (!parsed.yes) {
    printGenerationSummary(options);
    const proceed = await confirm({ message: 'Continue?', default: true });
    if (!proceed) {
      throw new GenerationError('Generation cancelled.', {
        step: 'Confirm generation summary',
        command: '(none)',
        targetDirectory: parsed.output,
      });
    }
  }

  return options;
}

/**
 * @param {Record<string, unknown>} parsed
 * @param {boolean} backend
 * @param {boolean} frontendEnabled
 */
async function resolveV4Modules(parsed, backend, frontendEnabled) {
  /** @type {Record<string, boolean|string|string[]>} */
  const modules = {
    auth: false,
    users: false,
    permissions: false,
    audit: false,
    notifications: false,
    localization: false,
    richText: false,
    dashboard: Boolean(parsed.dashboard ?? (parsed.yes ? DEFAULT_OPTIONS.dashboard : false)),
    defaultRole: 'User',
    roles: ['Admin', 'Editor', 'User'],
  };

  if (!backend) {
    modules.dashboard = frontendEnabled
      ? await resolveFlag(parsed, 'dashboard', 'Include dashboard foundation?', DEFAULT_OPTIONS.dashboard)
      : false;
    return modules;
  }

  if (parsed.yes) {
    modules.auth = Boolean(parsed.auth ?? DEFAULT_OPTIONS.auth);
    modules.users = Boolean(parsed.users ?? (modules.auth && DEFAULT_OPTIONS.users));
    modules.permissions = Boolean(parsed.permissions ?? (modules.auth && DEFAULT_OPTIONS.permissions));
    modules.audit = Boolean(parsed.audit ?? DEFAULT_OPTIONS.audit);
    modules.notifications = Boolean(parsed.notifications ?? DEFAULT_OPTIONS.notifications);
    modules.localization = Boolean(parsed.domainLocalization ?? DEFAULT_OPTIONS.domainLocalization);
    modules.richText = Boolean(parsed.richText ?? DEFAULT_OPTIONS.richText);
    modules.dashboard = Boolean(parsed.dashboard ?? DEFAULT_OPTIONS.dashboard);
    return modules;
  }

  const wantAuth = await confirm({
    message: 'Authentication?',
    default: true,
  });
  modules.auth = wantAuth;

  if (wantAuth) {
    await select({
      message: 'Authentication mode:',
      choices: [{ name: 'Identity + JWT + Refresh Cookie', value: 'jwt-refresh' }],
    });

    modules.users = await confirm({
      message: 'Include user management?',
      default: true,
    });

    const authz = await select({
      message: 'Authorization:',
      choices: [
        { name: 'Roles + Permissions', value: 'roles-permissions' },
        { name: 'Roles only', value: 'roles' },
      ],
    });
    modules.permissions = authz === 'roles-permissions';

    modules.defaultRole = await select({
      message: 'Default registration role:',
      choices: [
        { name: 'User', value: 'User' },
        { name: 'None', value: 'None' },
      ],
    });
  }

  modules.audit = await confirm({
    message: 'Audit trail?',
    default: true,
  });

  modules.notifications = wantAuth
    ? await confirm({ message: 'Notifications?', default: true })
    : false;

  modules.localization = await confirm({
    message: 'Domain content localization?',
    default: false,
  });

  modules.richText = await confirm({
    message: 'Rich text foundation?',
    default: false,
  });

  modules.dashboard = frontendEnabled
    ? await confirm({ message: 'Dashboard CRUD foundation?', default: true })
    : false;

  // Allow CLI overrides when mixed with prompts
  if (typeof parsed.auth === 'boolean') modules.auth = parsed.auth;
  if (typeof parsed.users === 'boolean') modules.users = parsed.users;
  if (typeof parsed.permissions === 'boolean') modules.permissions = parsed.permissions;
  if (typeof parsed.audit === 'boolean') modules.audit = parsed.audit;
  if (typeof parsed.notifications === 'boolean') modules.notifications = parsed.notifications;
  if (typeof parsed.domainLocalization === 'boolean') modules.localization = parsed.domainLocalization;
  if (typeof parsed.richText === 'boolean') modules.richText = parsed.richText;
  if (typeof parsed.dashboard === 'boolean') modules.dashboard = parsed.dashboard;

  return modules;
}

/**
 * @param {Record<string, unknown>} parsed
 */
async function resolveFrontend(parsed) {
  if (parsed.frontendEnabled === false) {
    const resolved = resolveFrontendSelection({ frontendEnabled: false });
    if (!resolved.ok) {
      throw frontendError(resolved.error, parsed.output);
    }
    return resolved.frontend;
  }

  const flagsProvided = parsed.frontendLibrary !== undefined || parsed.reactFramework !== undefined;

  if (parsed.yes && !flagsProvided && parsed.frontendEnabled !== false) {
    return defaultFrontendSelection();
  }

  if (flagsProvided) {
    let reactFramework = parsed.reactFramework;
    if (!parsed.yes && parsed.frontendLibrary === 'react' && !reactFramework) {
      reactFramework = await select({
        message: 'Choose React framework:',
        choices: [
          { name: 'Next.js', value: 'next' },
          { name: 'Vite', value: 'vite' },
        ],
      });
    }

    const resolved = resolveFrontendSelection({
      frontendEnabled: parsed.frontendEnabled ?? true,
      frontendLibrary: parsed.frontendLibrary,
      reactFramework,
    });
    if (!resolved.ok) {
      throw frontendError(resolved.error, parsed.output);
    }
    return resolved.frontend;
  }

  const includeFrontend = await confirm({
    message: 'Include frontend?',
    default: true,
  });

  if (!includeFrontend) {
    return { enabled: false, library: null, framework: null };
  }

  const library = await select({
    message: 'Choose frontend framework:',
    choices: [
      { name: 'React', value: 'react' },
      { name: 'Angular', value: 'angular' },
    ],
  });

  let reactFramework;
  if (library === 'react') {
    reactFramework = await select({
      message: 'Choose React framework:',
      choices: [
        { name: 'Next.js', value: 'next' },
        { name: 'Vite', value: 'vite' },
      ],
    });
  }

  const resolved = resolveFrontendSelection({
    frontendEnabled: true,
    frontendLibrary: library,
    reactFramework,
  });
  if (!resolved.ok) {
    throw frontendError(resolved.error, parsed.output);
  }
  return resolved.frontend;
}

function frontendError(message, output) {
  return new GenerationError(message, {
    step: 'Validate frontend selection',
    command: '(none)',
    targetDirectory: output,
  });
}

/**
 * @param {Record<string, unknown>} parsed
 */
async function resolveProjectName(parsed) {
  if (typeof parsed.projectName === 'string' && parsed.projectName.length > 0) {
    const result = validateProjectName(parsed.projectName);
    if (!result.ok) {
      throw new GenerationError(result.error, {
        step: 'Validate project name',
        command: '(none)',
        targetDirectory: parsed.output,
      });
    }
    return result;
  }

  if (parsed.yes) {
    throw new GenerationError('Project name is required when using --yes.', {
      step: 'Validate project name',
      command: '(none)',
      targetDirectory: parsed.output,
    });
  }

  const answer = await input({
    message: 'Project name:',
    validate(value) {
      const result = validateProjectName(value);
      return result.ok ? true : result.error;
    },
  });

  const result = validateProjectName(answer);
  if (!result.ok) {
    throw new GenerationError(result.error, {
      step: 'Validate project name',
      command: '(none)',
      targetDirectory: parsed.output,
    });
  }

  return result;
}

/**
 * @param {Record<string, unknown>} parsed
 */
async function resolvePackageManager(parsed) {
  if (typeof parsed.packageManager === 'string') {
    if (!validatePackageManager(parsed.packageManager)) {
      throw new GenerationError(`Unsupported package manager "${parsed.packageManager}".`, {
        step: 'Validate package manager',
        command: '(none)',
        targetDirectory: parsed.output,
      });
    }
    return parsed.packageManager;
  }

  if (parsed.yes) {
    return DEFAULT_OPTIONS.packageManager;
  }

  return select({
    message: 'Package manager:',
    default: DEFAULT_OPTIONS.packageManager,
    choices: [
      { name: 'npm', value: 'npm' },
      { name: 'yarn', value: 'yarn' },
      { name: 'pnpm', value: 'pnpm' },
    ],
  });
}

/**
 * @param {Record<string, unknown>} parsed
 * @param {string} key
 * @param {string} message
 * @param {boolean} defaultValue
 */
async function resolveFlag(parsed, key, message, defaultValue) {
  if (typeof parsed[key] === 'boolean') {
    return parsed[key];
  }

  if (parsed.yes) {
    return defaultValue;
  }

  return confirm({
    message,
    default: defaultValue,
  });
}
