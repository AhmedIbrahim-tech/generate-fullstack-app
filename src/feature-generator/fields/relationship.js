/**
 * Relationship helpers shared by the parser and the backend generators.
 */

const DELETE_BEHAVIOR_MAP = Object.freeze({
  restrict: 'Restrict',
  cascade: 'Cascade',
  setnull: 'SetNull',
  'set-null': 'SetNull',
  noaction: 'NoAction',
  'no-action': 'NoAction',
});

export const RELATIONSHIP_TYPES = Object.freeze([
  'many-to-one',
  'one-to-many',
  'many-to-many',
  'one-to-one',
]);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9]*$/;

/**
 * Validate a delete behavior token and return the EF Core enum member name.
 * @param {string} value
 * @returns {string}
 */
export function validateDeleteBehavior(value) {
  const key = String(value ?? '').trim().toLowerCase();
  const resolved = DELETE_BEHAVIOR_MAP[key];
  if (!resolved) {
    throw new Error(
      `Invalid delete behavior "${value}". Expected restrict, cascade, set-null, or no-action.`,
    );
  }
  return resolved;
}

/**
 * Build the foreign key property name for a to-one navigation.
 * @param {string} navigationName
 * @returns {string}
 */
export function buildForeignKeyName(navigationName) {
  const name = String(navigationName ?? '').trim();
  if (!IDENTIFIER.test(name)) {
    throw new Error(`Invalid navigation name for foreign key: ${navigationName}`);
  }
  return `${name}Id`;
}

/**
 * Normalize a relationship type token into the canonical hyphenated form.
 * @param {string} value
 * @returns {'many-to-one' | 'one-to-many' | 'many-to-many' | 'one-to-one'}
 */
export function normalizeRelationshipType(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');

  if (!RELATIONSHIP_TYPES.includes(normalized)) {
    throw new Error(
      `Invalid relationship type "${value}". Expected one of ${RELATIONSHIP_TYPES.join(', ')}.`,
    );
  }

  return /** @type {any} */ (normalized);
}

/**
 * Check whether a relationship target entity exists in the project manifest.
 * The manifest is expected to track generated features under `features`.
 * @param {object} manifest
 * @param {string} target
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateTargetExists(manifest, target) {
  const name = String(target ?? '').trim();
  if (!name) {
    return { ok: false, error: 'Relationship target is required.' };
  }

  const features = collectFeatureNames(manifest);

  // When the manifest does not yet track features we cannot prove the target
  // is missing, so we allow it (the entity may be authored by hand).
  if (features.length === 0) {
    return { ok: true };
  }

  if (features.includes(name.toLowerCase())) {
    return { ok: true };
  }

  return {
    ok: false,
    error: `Relationship target "${target}" was not found among generated features.`,
  };
}

/**
 * @param {object} manifest
 * @returns {string[]}
 */
function collectFeatureNames(manifest) {
  const raw = manifest?.features;
  /** @type {string[]} */
  const names = [];

  const pushEntry = (entry) => {
    if (typeof entry === 'string') {
      names.push(entry.toLowerCase());
      return;
    }
    if (entry && typeof entry === 'object') {
      for (const candidate of [
        entry.singularName,
        entry.singular,
        entry.name,
        entry.entity,
        entry.plural,
      ]) {
        if (candidate) {
          names.push(String(candidate).toLowerCase());
        }
      }
    }
  };

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      pushEntry(entry);
    }
    return names;
  }

  if (raw && typeof raw === 'object') {
    for (const [key, entry] of Object.entries(raw)) {
      names.push(String(key).toLowerCase());
      pushEntry(entry);
    }
  }

  return names;
}
