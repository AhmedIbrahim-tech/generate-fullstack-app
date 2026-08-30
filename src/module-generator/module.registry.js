/**
 * V4 application modules registry and dependency graph.
 */

export const MODULE_GENERATOR_VERSION = '4.0.0';

/** @typedef {'auth'|'users'|'permissions'|'audit'|'notifications'|'localization'|'rich-text'|'dashboard'} ModuleId */

/**
 * @type {Record<ModuleId, {
 *   id: ModuleId,
 *   name: string,
 *   description: string,
 *   requires: ModuleId[],
 *   packages?: { backend?: string[], react?: string[], angular?: string[] }
 * }>}
 */
export const MODULES = {
  auth: {
    id: 'auth',
    name: 'Authentication',
    description: 'Identity + JWT access tokens + HttpOnly refresh cookies',
    requires: [],
    packages: {
      backend: [
        'Microsoft.AspNetCore.Identity.EntityFrameworkCore',
        'Microsoft.AspNetCore.Authentication.JwtBearer',
        'System.IdentityModel.Tokens.Jwt',
      ],
    },
  },
  users: {
    id: 'users',
    name: 'User Management',
    description: 'Admin user search, roles, enable/disable',
    requires: ['auth'],
  },
  permissions: {
    id: 'permissions',
    name: 'Permissions',
    description: 'Permission-based authorization policies',
    requires: ['auth'],
  },
  audit: {
    id: 'audit',
    name: 'Audit Trail',
    description: 'Entity change audit logging with redaction',
    requires: [],
  },
  notifications: {
    id: 'notifications',
    name: 'Notifications',
    description: 'In-app user notifications',
    requires: ['auth'],
  },
  localization: {
    id: 'localization',
    name: 'Domain Localization',
    description: 'Entity translation tables and language management',
    requires: [],
  },
  'rich-text': {
    id: 'rich-text',
    name: 'Rich Text',
    description: 'Structured rich-text documents (Tiptap JSON)',
    requires: [],
    packages: {
      react: ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-link'],
    },
  },
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard Foundation',
    description: 'Shared dashboard shell, widgets, and CRUD UI',
    requires: [],
  },
};

/**
 * @param {string} id
 * @returns {ModuleId | null}
 */
export function normalizeModuleId(id) {
  const key = String(id ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');

  if (key === 'richtext' || key === 'rich-text') {
    return 'rich-text';
  }

  if (key in MODULES) {
    return /** @type {ModuleId} */ (key);
  }

  return null;
}

/**
 * Resolve transitive dependencies (dependencies first).
 * @param {ModuleId} moduleId
 * @returns {ModuleId[]}
 */
export function resolveModuleInstallOrder(moduleId) {
  /** @type {ModuleId[]} */
  const ordered = [];
  /** @type {Set<string>} */
  const visiting = new Set();
  /** @type {Set<string>} */
  const visited = new Set();

  /**
   * @param {ModuleId} id
   */
  function visit(id) {
    if (visited.has(id)) {
      return;
    }
    if (visiting.has(id)) {
      throw new Error(`Circular module dependency involving "${id}".`);
    }
    visiting.add(id);
    const mod = MODULES[id];
    for (const dep of mod.requires) {
      visit(dep);
    }
    visiting.delete(id);
    visited.add(id);
    ordered.push(id);
  }

  visit(moduleId);
  return ordered;
}

/**
 * @param {object} manifest
 * @param {ModuleId} moduleId
 */
export function isModuleEnabled(manifest, moduleId) {
  const modules = manifest?.modules ?? {};
  const key = moduleId === 'rich-text' ? 'richText' : moduleId;
  const entry = modules[key] ?? modules[moduleId];
  return Boolean(entry?.enabled);
}

/**
 * Manifest key for a module id.
 * @param {ModuleId} moduleId
 */
export function moduleManifestKey(moduleId) {
  if (moduleId === 'rich-text') {
    return 'richText';
  }
  return moduleId;
}

/**
 * @param {object} manifest
 * @param {ModuleId} moduleId
 */
export function getMissingDependencies(manifest, moduleId) {
  const mod = MODULES[moduleId];
  return mod.requires.filter((dep) => !isModuleEnabled(manifest, dep));
}

/**
 * Default modules block for a new project.
 * @param {object} options
 */
export function buildDefaultModulesBlock(options) {
  const auth = Boolean(options.modules?.auth ?? options.auth);
  const users = Boolean(options.modules?.users ?? (auth && options.userManagement !== false));
  const permissions = Boolean(options.modules?.permissions ?? auth);
  const audit = Boolean(options.modules?.audit);
  const notifications = Boolean(options.modules?.notifications);
  const localization = Boolean(options.modules?.localization ?? options.domainLocalization);
  const richText = Boolean(options.modules?.richText ?? options.richText);
  const dashboard = Boolean(options.modules?.dashboard ?? options.dashboard);

  /**
   * @param {boolean} enabled
   */
  const entry = (enabled) =>
    enabled
      ? { enabled: true, version: MODULE_GENERATOR_VERSION }
      : { enabled: false };

  return {
    auth: entry(auth),
    users: entry(users && auth),
    permissions: entry(permissions && auth),
    audit: entry(audit),
    notifications: entry(notifications && auth),
    localization: entry(localization),
    richText: entry(richText),
    dashboard: entry(dashboard),
  };
}

export function listModuleIds() {
  return Object.keys(MODULES);
}
