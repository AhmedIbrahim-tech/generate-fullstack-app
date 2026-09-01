import path from 'node:path';
import { readManifest } from '../src/feature-generator/utils/manifest.js';
import { getBackendDirectory, getFrontendDirectory } from '../src/utils/project-paths.js';

/**
 * Loads manifest-driven backend/frontend directories for smoke scripts.
 * @param {string} projectRoot
 */
export async function loadProjectLayout(projectRoot) {
  const manifest = await readManifest(projectRoot);
  return {
    projectRoot,
    manifest,
    backendDir: getBackendDirectory(projectRoot, manifest),
    frontendDir: getFrontendDirectory(projectRoot, manifest),
  };
}

/**
 * @param {{ backendDir: string | null }} layout
 * @param {...string} segments
 */
export function backendFile(layout, ...segments) {
  if (!layout.backendDir) {
    throw new Error('This project has no backend directory.');
  }
  return path.join(layout.backendDir, ...segments);
}

/**
 * @param {{ frontendDir: string | null }} layout
 * @param {...string} segments
 */
export function frontendFile(layout, ...segments) {
  if (!layout.frontendDir) {
    throw new Error('This project has no frontend directory.');
  }
  return path.join(layout.frontendDir, ...segments);
}
