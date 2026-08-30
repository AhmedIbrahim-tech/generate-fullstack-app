import path from 'node:path';
import { deriveNames } from './naming.js';

const WINDOWS_RESERVED = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

const UNSAFE_CHARS = /[<>:"|?*\u0000-\u001f]/;
const PATH_SEPARATORS = /[\\/]/;
const TRAVERSAL = /(^|[\\/])\.\.([\\/]|$)/;
const VALID_FOLDER = /^[A-Za-z][A-Za-z0-9._-]*$/;
const VALID_CSHARP_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9]*$/;

/**
 * @param {unknown} value
 * @returns {{ ok: true, names: { folderName: string, pascalName: string, displayName: string } } | { ok: false, error: string }}
 */
export function validateProjectName(value) {
  if (typeof value !== 'string') {
    return { ok: false, error: 'Project name is required.' };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: 'Project name cannot be empty.' };
  }

  if (trimmed.length > 100) {
    return { ok: false, error: 'Project name is too long (max 100 characters).' };
  }

  if (PATH_SEPARATORS.test(trimmed) || path.isAbsolute(trimmed)) {
    return { ok: false, error: 'Project name cannot contain path separators or be an absolute path.' };
  }

  if (TRAVERSAL.test(trimmed) || trimmed.includes('..')) {
    return { ok: false, error: 'Project name cannot contain path traversal segments.' };
  }

  if (UNSAFE_CHARS.test(trimmed) || trimmed.includes(' ')) {
    return { ok: false, error: 'Project name contains unsupported symbols. Use letters, numbers, hyphen, underscore, or dot.' };
  }

  if (trimmed.endsWith('.') || trimmed.endsWith(' ') || trimmed.startsWith('.')) {
    return { ok: false, error: 'Project name cannot start with a dot or end with a dot or space.' };
  }

  const base = trimmed.split('.')[0] ?? trimmed;
  if (WINDOWS_RESERVED.has(base.toUpperCase())) {
    return { ok: false, error: `Project name "${trimmed}" is a reserved filesystem name.` };
  }

  if (!VALID_FOLDER.test(trimmed)) {
    return {
      ok: false,
      error: 'Project name must start with a letter and contain only letters, numbers, hyphen, underscore, or dot.',
    };
  }

  const names = deriveNames(trimmed);
  if (!names.pascalName || !VALID_CSHARP_IDENTIFIER.test(names.pascalName)) {
    return {
      ok: false,
      error: 'Project name must produce a valid .NET identifier (start with a letter, then letters or numbers).',
    };
  }

  return { ok: true, names };
}

/**
 * @param {string} packageManager
 */
export function validatePackageManager(packageManager) {
  const allowed = new Set(['npm', 'yarn', 'pnpm']);
  return allowed.has(packageManager);
}
