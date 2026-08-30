/**
 * V3 field model.
 *
 * A field has a `kind` that determines how it is generated:
 *   - scalar:       primitive property backed by a C# scalar type
 *   - enum:         C# enum stored as int
 *   - relationship: association to another entity (FK or join table)
 *   - file / image: media stored through the file storage infrastructure
 *
 * Scalar fields keep the exact same shape they had in V2 so existing
 * behaviour continues to work unchanged.
 */

export const SCALAR_TYPES = Object.freeze([
  'string',
  'int',
  'long',
  'decimal',
  'double',
  'boolean',
  'Guid',
  'DateTime',
  'DateTimeOffset',
]);

// Backwards-compatible alias. Historically the generator only supported
// scalar types and exposed them as FIELD_TYPES.
export const FIELD_TYPES = SCALAR_TYPES;

export const FIELD_KINDS = Object.freeze([
  'scalar',
  'enum',
  'relationship',
  'file',
  'image',
]);

export const RELATIONSHIP_TYPES = Object.freeze([
  'many-to-one',
  'one-to-many',
  'many-to-many',
  'one-to-one',
]);

export const MEDIA_KINDS = Object.freeze(['file', 'image']);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9]*$/;

/**
 * @param {string} type
 */
export function isScalarType(type) {
  return SCALAR_TYPES.includes(type);
}

/**
 * Backwards-compatible name kept for existing callers.
 * @param {string} type
 */
export function isSupportedFieldType(type) {
  return isScalarType(type);
}

/**
 * @param {string} kind
 */
export function isMediaKind(kind) {
  return MEDIA_KINDS.includes(kind);
}

/**
 * @param {object} field
 */
export function isRelationshipToMany(field) {
  return (
    field.kind === 'relationship' &&
    (field.relationshipType === 'many-to-many' ||
      field.relationshipType === 'one-to-many')
  );
}

/**
 * @param {object} field
 */
export function isRelationshipToOne(field) {
  return (
    field.kind === 'relationship' &&
    (field.relationshipType === 'many-to-one' ||
      field.relationshipType === 'one-to-one')
  );
}

/**
 * @param {object} field
 */
export function isMediaSingle(field) {
  return isMediaKind(field.kind) && field.cardinality === 'single';
}

/**
 * @param {object} field
 */
export function isMediaMultiple(field) {
  return isMediaKind(field.kind) && field.cardinality === 'multiple';
}

/**
 * Resolve the field kind from an input object.
 * @param {object} input
 */
function resolveKind(input) {
  if (input.kind) {
    if (!FIELD_KINDS.includes(input.kind)) {
      throw new Error(`Unsupported field kind: ${input.kind}`);
    }
    return input.kind;
  }

  if (isScalarType(input.type)) {
    return 'scalar';
  }

  throw new Error(`Unsupported field type: ${input.type}`);
}

/**
 * Normalize any field input into a canonical field descriptor.
 * @param {object} input
 */
export function normalizeField(input) {
  const kind = resolveKind(input);

  switch (kind) {
    case 'scalar':
      return normalizeScalar(input);
    case 'enum':
      return normalizeEnum(input);
    case 'relationship':
      return normalizeRelationship(input);
    case 'file':
    case 'image':
      return normalizeMedia(input, kind);
    default:
      throw new Error(`Unsupported field kind: ${kind}`);
  }
}

/**
 * @param {object} input
 */
function normalizeScalar(input) {
  const type = input.type;
  if (!isScalarType(type)) {
    throw new Error(`Unsupported field type: ${type}`);
  }

  const required = input.required !== false;
  const nullable =
    input.nullable === true || (!required && input.nullable !== false);

  /** @type {Record<string, unknown>} */
  const field = {
    name: input.name,
    kind: 'scalar',
    type,
    required,
    nullable: type === 'boolean' ? false : nullable,
    searchable: type === 'string' ? input.searchable !== false : false,
  };

  if (type === 'string') {
    field.maxLength = input.maxLength ?? input.max ?? (input.richText ? 200000 : 200);
    field.minLength = input.minLength ?? null;
    if (input.richText) {
      field.richText = true;
      field.searchable = false;
    }
  }

  if (type === 'decimal') {
    field.precision = input.precision ?? 18;
    field.scale = input.scale ?? 2;
    field.minimum = input.minimum ?? null;
    field.maximum = input.maximum ?? null;
  }

  if (type === 'int' || type === 'long' || type === 'double') {
    field.minimum = input.minimum ?? null;
    field.maximum = input.maximum ?? null;
  }

  return field;
}

/**
 * @param {object} input
 */
function normalizeEnum(input) {
  const enumName = input.enumName ?? input.name;
  if (!IDENTIFIER.test(String(enumName))) {
    throw new Error(`Invalid enum name: ${enumName}`);
  }

  const rawValues = Array.isArray(input.enumValues) ? input.enumValues : [];
  const values = rawValues
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error(`Enum "${enumName}" requires at least one value.`);
  }

  const seen = new Set();
  for (const value of values) {
    if (!IDENTIFIER.test(value)) {
      throw new Error(`Invalid enum value "${value}" for ${enumName}.`);
    }
    if (seen.has(value)) {
      throw new Error(`Duplicate enum value "${value}" for ${enumName}.`);
    }
    seen.add(value);
  }

  const required = input.required !== false;
  const nullable =
    input.nullable === true || (!required && input.nullable !== false);

  return {
    name: input.name,
    kind: 'enum',
    type: 'enum',
    enumName: String(enumName),
    enumValues: values,
    required,
    nullable,
    searchable: false,
  };
}

/**
 * @param {object} input
 */
function normalizeRelationship(input) {
  const relationshipType = normalizeRelationshipTypeValue(input.relationshipType);
  const target = String(input.target ?? '').trim();
  if (!IDENTIFIER.test(target)) {
    throw new Error(`Invalid relationship target: ${input.target}`);
  }

  const display = String(input.display ?? 'Name').trim();
  if (!IDENTIFIER.test(display)) {
    throw new Error(`Invalid relationship display member: ${input.display}`);
  }

  const toMany =
    relationshipType === 'many-to-many' || relationshipType === 'one-to-many';

  const required = toMany ? false : input.required !== false;
  const nullable = toMany ? false : !required;

  const deleteBehavior = normalizeDeleteBehaviorValue(
    input.deleteBehavior,
    relationshipType,
  );

  /** @type {Record<string, unknown>} */
  const field = {
    name: input.name,
    kind: 'relationship',
    type: 'relationship',
    target,
    relationshipType,
    display,
    deleteBehavior,
    required,
    nullable,
    searchable: false,
  };

  if (toMany) {
    field.collectionName = input.name;
    // Id list is named after the target singular (e.g. Tags -> TagIds).
    field.commandIdsName = `${target}Ids`;
  } else {
    field.foreignKeyName = `${input.name}Id`;
    field.commandIdName = `${input.name}Id`;
    field.displayName = `${input.name}DisplayName`;
  }

  return field;
}

/**
 * @param {object} input
 * @param {string} kind
 */
function normalizeMedia(input, kind) {
  const cardinality =
    input.cardinality === 'multiple' ? 'multiple' : 'single';

  const required = cardinality === 'multiple' ? false : input.required === true;
  const nullable = cardinality === 'multiple' ? false : !required;

  /** @type {Record<string, unknown>} */
  const field = {
    name: input.name,
    kind,
    type: kind,
    mediaKind: kind,
    cardinality,
    required,
    nullable,
    searchable: false,
  };

  if (input.maxSize != null) {
    field.maxSize = Number(input.maxSize);
  }

  if (cardinality === 'single') {
    field.foreignKeyName = `${input.name}Id`;
    field.commandIdName = `${input.name}Id`;
  } else {
    field.collectionName = input.name;
    field.commandIdsName = `${input.name}FileIds`;
    field.joinName = `${input.name}Files`;
    if (input.maxFiles != null) {
      field.maxFiles = Number(input.maxFiles);
    }
  }

  return field;
}

/**
 * @param {unknown} value
 */
function normalizeRelationshipTypeValue(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');

  if (!RELATIONSHIP_TYPES.includes(normalized)) {
    throw new Error(
      `Invalid relationship type "${value}". Expected one of ${RELATIONSHIP_TYPES.join(', ')}.`,
    );
  }

  return normalized;
}

/**
 * @param {unknown} value
 * @param {string} relationshipType
 */
function normalizeDeleteBehaviorValue(value, relationshipType) {
  const map = {
    restrict: 'Restrict',
    cascade: 'Cascade',
    setnull: 'SetNull',
    'set-null': 'SetNull',
    noaction: 'NoAction',
    'no-action': 'NoAction',
  };

  if (value == null || value === '') {
    return relationshipType === 'one-to-many' ? 'Cascade' : 'Restrict';
  }

  const key = String(value).trim().toLowerCase();
  const resolved = map[key];
  if (!resolved) {
    throw new Error(
      `Invalid delete behavior "${value}". Expected restrict, cascade, set-null, or no-action.`,
    );
  }

  return resolved;
}

/**
 * Group fields by kind for downstream generators.
 * @param {object[]} fields
 */
export function groupFields(fields) {
  const list = fields ?? [];
  return {
    all: list,
    scalar: list.filter((field) => field.kind === 'scalar'),
    enums: list.filter((field) => field.kind === 'enum'),
    relationships: list.filter((field) => field.kind === 'relationship'),
    toOne: list.filter((field) => isRelationshipToOne(field)),
    toMany: list.filter((field) => isRelationshipToMany(field)),
    media: list.filter((field) => isMediaKind(field.kind)),
    mediaSingle: list.filter((field) => isMediaSingle(field)),
    mediaMultiple: list.filter((field) => isMediaMultiple(field)),
  };
}

/**
 * @param {object[]} fields
 */
export function hasMediaField(fields) {
  return (fields ?? []).some((field) => isMediaKind(field.kind));
}

/**
 * Map field type to C# property type.
 * @param {object} field
 */
export function toCSharpType(field) {
  if (field.kind === 'enum') {
    return field.nullable ? `${field.enumName}?` : field.enumName;
  }

  if (field.kind === 'relationship') {
    if (isRelationshipToMany(field)) {
      return `ICollection<${field.target}>`;
    }
    return field.nullable ? 'Guid?' : 'Guid';
  }

  if (isMediaKind(field.kind)) {
    if (field.cardinality === 'multiple') {
      return 'ICollection<StoredFile>';
    }
    return field.required && !field.nullable ? 'Guid' : 'Guid?';
  }

  const map = {
    string: 'string',
    int: 'int',
    long: 'long',
    decimal: 'decimal',
    double: 'double',
    boolean: 'bool',
    Guid: 'Guid',
    DateTime: 'DateTime',
    DateTimeOffset: 'DateTimeOffset',
  };

  const base = map[field.type];
  if (field.type === 'string') {
    return field.nullable ? 'string?' : 'string';
  }

  if (field.type === 'boolean') {
    return 'bool';
  }

  return field.nullable ? `${base}?` : base;
}

/**
 * @param {object} field
 */
export function toTypeScriptType(field) {
  if (field.kind === 'enum') {
    const base = field.enumValues
      .map((value) => `"${value}"`)
      .join(' | ');
    return field.nullable ? `${base} | null` : base;
  }

  if (field.kind === 'relationship') {
    if (isRelationshipToMany(field)) {
      return 'string[]';
    }
    return field.nullable ? 'string | null' : 'string';
  }

  if (isMediaKind(field.kind)) {
    if (field.cardinality === 'multiple') {
      return 'string[]';
    }
    return field.required && !field.nullable ? 'string' : 'string | null';
  }

  const map = {
    string: 'string',
    int: 'number',
    long: 'number',
    decimal: 'number',
    double: 'number',
    boolean: 'boolean',
    Guid: 'string',
    DateTime: 'string',
    DateTimeOffset: 'string',
  };

  const base = map[field.type];
  return field.nullable ? `${base} | null` : base;
}

/**
 * Default C# property initializer.
 * @param {object} field
 */
export function csharpDefaultInitializer(field) {
  if (field.kind === 'relationship' && isRelationshipToMany(field)) {
    return ` = new List<${field.target}>();`;
  }

  if (isMediaKind(field.kind) && field.cardinality === 'multiple') {
    return ' = new List<StoredFile>();';
  }

  if (field.type === 'string' && !field.nullable) {
    return ' = string.Empty;';
  }

  return '';
}
