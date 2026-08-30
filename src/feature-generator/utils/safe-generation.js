export const RESERVED_FEATURE_NAMES = new Set([
  'API',
  'Application',
  'Domain',
  'Infrastructure',
  'Client',
  'Common',
  'Shared',
  'System',
  'Object',
  'BaseEntity',
  'Controller',
  'Entity',
  'Router',
]);

export const SYSTEM_FIELD_NAMES = new Set([
  'Id',
  'CreatedAtUtc',
  'UpdatedAtUtc',
  'DeletedAtUtc',
  'IsDeleted',
  'RowVersion',
]);

const VALID_CSHARP = /^[A-Za-z_][A-Za-z0-9]*$/;
const VALID_TS = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const UNSAFE_FS = /[<>:"|?*\\/\u0000-\u001f]/;

/**
 * @param {string} name
 */
export function validateFeatureName(name) {
  if (!name || typeof name !== 'string') {
    return { ok: false, error: 'Feature name is required.' };
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: 'Feature name cannot be empty.' };
  }

  if (UNSAFE_FS.test(trimmed) || trimmed.includes(' ')) {
    return { ok: false, error: 'Feature name contains unsupported characters.' };
  }

  const pascal = trimmed.replace(/[^A-Za-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  if (!VALID_CSHARP.test(pascal) || !VALID_TS.test(pascal)) {
    return { ok: false, error: 'Feature name must be a valid C# and TypeScript identifier.' };
  }

  if (RESERVED_FEATURE_NAMES.has(pascal)) {
    return { ok: false, error: `Feature name "${pascal}" is reserved.` };
  }

  return { ok: true, name: pascal };
}

/**
 * @param {string} name
 */
export function validateFieldName(name) {
  if (!name || typeof name !== 'string') {
    return { ok: false, error: 'Field name is required.' };
  }

  const trimmed = name.trim();
  const pascal = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

  if (!VALID_CSHARP.test(pascal) || !VALID_TS.test(pascal)) {
    return { ok: false, error: `Field name "${trimmed}" is not a valid identifier.` };
  }

  if (SYSTEM_FIELD_NAMES.has(pascal)) {
    return { ok: false, error: `Field name "${pascal}" is reserved for BaseEntity infrastructure.` };
  }

  return { ok: true, name: pascal };
}
