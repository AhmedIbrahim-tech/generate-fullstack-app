import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathExists } from '../../utils/filesystem.js';

const MANIFEST_NAME = '.fullstack-app.json';
const MAX_PARENT_LEVELS = 5;

/**
 * @param {string} startDir
 */
export async function findProjectRoot(startDir) {
  let current = path.resolve(startDir);

  for (let level = 0; level <= MAX_PARENT_LEVELS; level += 1) {
    const candidate = path.join(current, MANIFEST_NAME);
    if (await pathExists(candidate)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  return null;
}

/**
 * @param {string} projectRoot
 */
export async function readManifest(projectRoot) {
  const manifestPath = path.join(projectRoot, MANIFEST_NAME);
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

/**
 * @param {string} projectRoot
 * @param {object} manifest
 */
export async function writeManifest(projectRoot, manifest) {
  const manifestPath = path.join(projectRoot, MANIFEST_NAME);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

/**
 * @param {object} manifest
 */
export function resolveFrontendStrategy(manifest) {
  const frontend = manifest.frontend ?? {};
  const library = frontend.library;
  const framework = frontend.framework;

  if (library === 'react' && framework === 'next') {
    return { library: 'react', framework: 'next' };
  }

  if (library === 'react' && framework === 'vite') {
    return { library: 'react', framework: 'vite' };
  }

  if (library === 'angular') {
    return { library: 'angular', framework: null };
  }

  return { library: null, framework: null };
}
