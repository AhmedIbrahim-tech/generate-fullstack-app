import path from 'node:path';
import { add } from '../../../utils/package-manager.js';
import { copyTemplate, templatesRoot } from '../../../utils/filesystem.js';

export const REACT_COMMON_PACKAGES = [
  '@reduxjs/toolkit',
  'react-redux',
  'axios',
  'zod',
  'react-hook-form',
  '@hookform/resolvers',
  'sonner',
  'lucide-react',
  'framer-motion',
];

/**
 * @param {{ clientDir: string, packageManager: 'npm' | 'yarn' | 'pnpm', replacements: Record<string, string> }} options
 */
export async function overlayReactCommon(options) {
  await copyTemplate(
    path.join(templatesRoot(), 'frontend', 'react', 'common'),
    options.clientDir,
    options.replacements,
  );
}

/**
 * @param {{ clientDir: string, packageManager: 'npm' | 'yarn' | 'pnpm' }} options
 */
export function installReactCommonPackages(options) {
  add(options.packageManager, REACT_COMMON_PACKAGES, {
    cwd: options.clientDir,
    step: 'Install shared React architecture packages',
  });
}
