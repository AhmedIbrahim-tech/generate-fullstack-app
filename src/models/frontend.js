export const FRONTEND_LIBRARIES = /** @type {const} */ (['react', 'angular']);
export const REACT_FRAMEWORKS = /** @type {const} */ (['next', 'vite']);
export const FRONTEND_LANGUAGES = /** @type {const} */ (['typescript', 'javascript']);
export const FRONTEND_STYLINGS = /** @type {const} */ (['tailwind', 'bootstrap']);
export const FRONTEND_STATES = /** @type {const} */ (['redux', 'zustand', 'ngrx', 'none']);
export const FRONTEND_HTTP_CLIENTS = /** @type {const} */ (['axios', 'fetch', 'httpclient']);
export const FRONTEND_FORMS = /** @type {const} */ (['react-hook-form-zod', 'reactive-forms', 'none']);
export const FRONTEND_COMPONENT_SYSTEMS = /** @type {const} */ (['shadcn', 'mui', 'antd', 'none']);
export const FRONTEND_REALTIMES = /** @type {const} */ (['none', 'signalr']);

/**
 * @typedef {object} FrontendSelection
 * @property {boolean} enabled
 * @property {'react' | 'angular' | null} [library]
 * @property {'next' | 'vite' | null} [framework]
 * @property {'typescript' | 'javascript'} [language]
 * @property {'tailwind' | 'bootstrap'} [styling]
 * @property {'redux' | 'zustand' | 'ngrx' | 'none'} [state]
 * @property {'axios' | 'fetch' | 'httpclient'} [httpClient]
 * @property {'react-hook-form-zod' | 'reactive-forms' | 'none'} [forms]
 * @property {'shadcn' | 'mui' | 'antd' | 'none'} [componentSystem]
 * @property {boolean} [localization]
 * @property {'none' | 'signalr'} [realtime]
 */

/**
 * @param {unknown} value
 * @returns {value is 'react' | 'angular'}
 */
export function isFrontendLibrary(value) {
  return value === 'react' || value === 'angular';
}

/**
 * @param {unknown} value
 * @returns {value is 'next' | 'vite'}
 */
export function isReactFramework(value) {
  return value === 'next' || value === 'vite';
}

/**
 * @param {Partial<FrontendSelection> & { frontendEnabled?: boolean, frontendLibrary?: string, reactFramework?: string }} input
 * @returns {{ ok: true, frontend: FrontendSelection } | { ok: false, error: string }}
 */
export function resolveFrontendSelection(input) {
  if (input.frontendEnabled === false || input.enabled === false) {
    if (input.frontendLibrary || input.reactFramework || input.library) {
      return {
        ok: false,
        error: 'Do not pass frontend flags when frontend is disabled.',
      };
    }

    return {
      ok: true,
      frontend: {
        enabled: false,
        library: null,
        framework: null,
      },
    };
  }

  const library = input.library ?? input.frontendLibrary ?? 'react';
  const reactFramework = input.framework ?? input.reactFramework ?? (library === 'react' ? 'next' : null);

  if (library === 'angular') {
    if (input.framework && input.framework !== null) {
      return {
        ok: false,
        error: 'Angular does not use --react-framework. Remove --react-framework next|vite.',
      };
    }

    return {
      ok: true,
      frontend: {
        enabled: true,
        library: 'angular',
        framework: null,
        language: 'typescript',
        styling: input.styling ?? 'tailwind',
        state: input.state ?? 'ngrx',
        httpClient: 'httpclient',
        forms: 'reactive-forms',
        componentSystem: 'none',
        localization: input.localization ?? true,
        realtime: input.realtime ?? 'none',
      },
    };
  }

  if (library === 'react') {
    if (!reactFramework || !isReactFramework(reactFramework)) {
      return {
        ok: false,
        error: `Unsupported React framework "${reactFramework}". Use next or vite.`,
      };
    }

    const styling = input.styling ?? 'tailwind';
    let componentSystem = input.componentSystem ?? (styling === 'tailwind' ? 'shadcn' : 'none');

    // Validation: shadcn/ui depends on Tailwind CSS
    if (styling === 'bootstrap' && componentSystem === 'shadcn') {
      return {
        ok: false,
        error: 'shadcn/ui requires Tailwind CSS. It cannot be used with Bootstrap.',
      };
    }

    return {
      ok: true,
      frontend: {
        enabled: true,
        library: 'react',
        framework: reactFramework,
        language: input.language ?? 'typescript',
        styling,
        state: input.state ?? 'redux',
        httpClient: input.httpClient ?? 'axios',
        forms: input.forms ?? 'react-hook-form-zod',
        componentSystem,
        localization: input.localization ?? true,
        realtime: input.realtime ?? 'none',
      },
    };
  }

  return {
    ok: false,
    error: `Unsupported frontend library "${library}". Use react or angular.`,
  };
}

/**
 * Documented --yes default when frontend flags are omitted.
 * @param {'next'|'vite'} [framework='next']
 * @returns {FrontendSelection}
 */
export function defaultFrontendSelection(framework = 'next') {
  return {
    enabled: true,
    library: 'react',
    framework,
    language: 'typescript',
    styling: 'tailwind',
    state: 'redux',
    httpClient: 'axios',
    forms: 'react-hook-form-zod',
    componentSystem: 'shadcn',
    localization: true,
    realtime: 'none',
  };
}

/**
 * @param {FrontendSelection | null | undefined} frontend
 */
export function describeFrontend(frontend) {
  if (!frontend || !frontend.enabled) {
    return 'None';
  }

  if (frontend.library === 'angular') {
    return 'Angular';
  }

  if (frontend.framework === 'vite') {
    return 'React + Vite';
  }

  return 'React + Next.js';
}

/**
 * @param {FrontendSelection} frontend
 */
export function getFrontendDevOrigin(frontend) {
  if (!frontend || !frontend.enabled) {
    return null;
  }

  if (frontend.library === 'angular') {
    return 'http://localhost:4200';
  }

  if (frontend.framework === 'vite') {
    return 'http://localhost:5173';
  }

  return 'http://localhost:3000';
}
