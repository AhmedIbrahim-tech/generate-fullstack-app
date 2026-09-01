import path from 'node:path';

/**
 * Resolves backend and frontend relative paths from manifest.
 *
 * Conventions:
 * - Full Stack: { backend: "Backend", frontend: "Frontend" }
 * - Backend Only: { backend: ".", frontend: null }
 * - Frontend Only: { backend: null, frontend: "." }
 *
 * @param {object} [manifest]
 * @returns {{ backend: string | null, frontend: string | null }}
 */
export function resolveProjectPaths(manifest) {
  const safeManifest = manifest && typeof manifest === 'object' ? manifest : {};
  const paths = safeManifest.paths && typeof safeManifest.paths === 'object' ? safeManifest.paths : {};
  let backend = paths.backend;
  let frontend = paths.frontend;

  const hasBackend = Boolean(
    safeManifest.backend?.enabled ?? (safeManifest.backend === true || safeManifest.backend === 'aspnet-core'),
  );
  const hasFrontend = Boolean(
    safeManifest.frontend?.enabled ?? (safeManifest.frontend?.library || safeManifest.frontend === true),
  );

  if (backend === undefined) {
    if (hasBackend) {
      backend = hasFrontend ? 'Backend' : '.';
    } else {
      backend = null;
    }
  }

  if (frontend === undefined) {
    if (hasFrontend) {
      frontend = hasBackend ? 'Frontend' : '.';
    } else {
      frontend = null;
    }
  }

  return { backend, frontend };
}

/**
 * Returns the relative path for backend files (e.g. "Backend" or "." or null).
 * @param {object} [manifest]
 * @returns {string | null}
 */
export function getBackendRelativePath(manifest) {
  return resolveProjectPaths(manifest).backend;
}

/**
 * Returns the relative path for frontend files (e.g. "Frontend" or "." or null).
 * @param {object} [manifest]
 * @returns {string | null}
 */
export function getFrontendRelativePath(manifest) {
  return resolveProjectPaths(manifest).frontend;
}

/**
 * Returns the absolute directory path for backend root.
 * @param {string} projectRoot
 * @param {object} [manifest]
 * @returns {string | null}
 */
export function getBackendDirectory(projectRoot, manifest) {
  if (!projectRoot) return null;
  const rel = getBackendRelativePath(manifest);
  if (!rel) return null;
  return rel === '.' ? projectRoot : path.join(projectRoot, rel);
}

/**
 * Returns the absolute directory path for frontend root.
 * @param {string} projectRoot
 * @param {object} [manifest]
 * @returns {string | null}
 */
export function getFrontendDirectory(projectRoot, manifest) {
  if (!projectRoot) return null;
  const rel = getFrontendRelativePath(manifest);
  if (!rel) return null;
  return rel === '.' ? projectRoot : path.join(projectRoot, rel);
}

/**
 * Builds a backend relative file path (e.g. "Backend/Domain/..." or "Domain/...").
 * @param {object} [manifest]
 * @param {string} projectFolder 'Domain'|'Application'|'Infrastructure'|'API'
 * @param {...string} segments
 */
export function getBackendFilePath(manifest, projectFolder, ...segments) {
  if (!projectFolder) {
    throw new Error('projectFolder is required to compute backend file path.');
  }
  const rel = getBackendRelativePath(manifest);
  if (!rel || rel === '.') {
    return path.join(projectFolder, ...segments);
  }
  return path.join(rel, projectFolder, ...segments);
}

/**
 * Builds a frontend relative file path (e.g. "Frontend/src/..." or "src/...").
 * @param {object} [manifest]
 * @param {...string} segments
 */
export function getFrontendFilePath(manifest, ...segments) {
  const rel = getFrontendRelativePath(manifest);
  if (!rel || rel === '.') {
    return path.join(...segments);
  }
  return path.join(rel, ...segments);
}
