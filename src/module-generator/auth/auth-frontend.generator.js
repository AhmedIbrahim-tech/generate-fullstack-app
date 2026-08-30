import { planAuthReactModule } from './auth-react.generator.js';
import { planAuthAngularModule } from './auth-angular.generator.js';

/**
 * @typedef {object} AuthFrontendConfig
 * @property {{ library?: string, framework?: string }} [frontendStrategy]
 * @property {string} [projectName]
 */

/**
 * @typedef {object} AuthFrontendPlan
 * @property {{ relativePath: string, contents: string, writeMode?: string }[]} files
 * @property {{ relativePath: string, update: (existing: string) => string }[]} registryUpdates
 */

/**
 * Plan the Authentication frontend for the project's chosen library.
 *
 * Dispatches to the React (Vite/Next) or Angular generator based on
 * `config.frontendStrategy.library`. Framework-agnostic shared files are added
 * via {@link planShared}.
 *
 * @param {AuthFrontendConfig} config
 * @returns {AuthFrontendPlan}
 */
export function planAuthFrontend(config) {
  const library = config?.frontendStrategy?.library;

  if (library === 'react') {
    return combine(planShared(config), planAuthReactModule(config));
  }

  if (library === 'angular') {
    return combine(planShared(config), planAuthAngularModule(config));
  }

  throw new Error(
    `Cannot generate auth frontend: unsupported or missing frontend library "${library ?? '(none)'}". Expected "react" or "angular".`,
  );
}

/**
 * Framework-agnostic shared files for the auth module.
 *
 * The base project scaffolding already provides everything the auth module
 * depends on (toast/notify, get-error-message, pagination, api-client, store),
 * so there is currently nothing extra to emit. Kept as an explicit extension
 * point so shared assets can be added without touching the dispatchers.
 *
 * @param {AuthFrontendConfig} _config
 * @returns {AuthFrontendPlan}
 */
export function planShared(_config) {
  return { files: [], registryUpdates: [] };
}

/**
 * @param {...AuthFrontendPlan} plans
 * @returns {AuthFrontendPlan}
 */
function combine(...plans) {
  /** @type {AuthFrontendPlan} */
  const merged = { files: [], registryUpdates: [] };

  for (const plan of plans) {
    if (!plan) {
      continue;
    }
    merged.files.push(...(plan.files ?? []));
    merged.registryUpdates.push(...(plan.registryUpdates ?? []));
  }

  return merged;
}

export { planAuthReactModule, planAuthAngularModule };
