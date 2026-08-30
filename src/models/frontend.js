export const FRONTEND_LIBRARIES = /** @type {const} */ (['react', 'angular']);
export const REACT_FRAMEWORKS = /** @type {const} */ (['next', 'vite']);

/**
 * @typedef {{ enabled: false, library: null, framework: null } | { enabled: true, library: 'react', framework: 'next' | 'vite' } | { enabled: true, library: 'angular', framework: null }} FrontendSelection
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
 * @param {{ frontendEnabled?: boolean, frontendLibrary?: string, reactFramework?: string }} input
 * @returns {{ ok: true, frontend: FrontendSelection } | { ok: false, error: string }}
 */
export function resolveFrontendSelection(input) {
  if (input.frontendEnabled === false) {
    if (input.frontendLibrary || input.reactFramework) {
      return {
        ok: false,
        error: 'Do not pass --frontend or --react-framework when frontend is disabled.',
      };
    }

    return {
      ok: true,
      frontend: { enabled: false, library: null, framework: null },
    };
  }

  const library = input.frontendLibrary;
  const reactFramework = input.reactFramework;

  if (library === 'angular') {
    if (reactFramework) {
      return {
        ok: false,
        error: 'Angular does not use --react-framework. Remove --react-framework next|vite.',
      };
    }

    return {
      ok: true,
      frontend: { enabled: true, library: 'angular', framework: null },
    };
  }

  if (library === 'react') {
    if (!reactFramework) {
      return {
        ok: false,
        error: 'React requires --react-framework next or --react-framework vite in non-interactive mode.',
      };
    }

    if (!isReactFramework(reactFramework)) {
      return {
        ok: false,
        error: `Unsupported React framework "${reactFramework}". Use next or vite.`,
      };
    }

    return {
      ok: true,
      frontend: { enabled: true, library: 'react', framework: reactFramework },
    };
  }

  if (library) {
    return {
      ok: false,
      error: `Unsupported frontend library "${library}". Use react or angular.`,
    };
  }

  return {
    ok: false,
    error: 'Frontend library is required when frontend is enabled.',
  };
}

/**
 * Documented --yes default when frontend flags are omitted.
 * @returns {FrontendSelection}
 */
export function defaultFrontendSelection() {
  return { enabled: true, library: 'react', framework: 'next' };
}

/**
 * @param {FrontendSelection} frontend
 */
export function describeFrontend(frontend) {
  if (!frontend.enabled) {
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
  if (!frontend.enabled) {
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
