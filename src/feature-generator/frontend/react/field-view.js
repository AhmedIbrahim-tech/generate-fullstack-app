import { toTypeScriptType } from '../../fields/field-types.js';
import { toCamelCase } from '../../utils/feature-naming.js';
import { pluralizePascal } from '../../utils/feature-naming.js';
import { toPascalCase } from '../../../utils/naming.js';

/**
 * Field categories understood by the React feature generators.
 * @typedef {'scalar' | 'enum' | 'relationship' | 'media'} FieldKind
 */

const SCALAR_TYPES = new Set([
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

/**
 * @param {object} field
 * @returns {FieldKind}
 */
export function classifyField(field) {
  const kind = field.kind;
  if (kind === 'enum') {
    return 'enum';
  }
  if (kind === 'relationship') {
    return 'relationship';
  }
  if (kind === 'image' || kind === 'file') {
    return 'media';
  }
  return 'scalar';
}

/**
 * Resolve the underlying scalar type for a field, tolerating V2 and V3 shapes.
 * @param {object} field
 */
function resolveScalarType(field) {
  if (typeof field.type === 'string' && SCALAR_TYPES.has(field.type)) {
    return field.type;
  }
  if (typeof field.kind === 'string' && SCALAR_TYPES.has(field.kind)) {
    return field.kind;
  }
  return 'string';
}

/**
 * @param {string} pascal
 */
export function toLabel(pascal) {
  return String(pascal)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

/**
 * @param {object} field
 */
function isRequired(field) {
  return field.required !== false;
}

/**
 * @param {object} field
 */
function isNullable(field) {
  return field.nullable === true;
}

/**
 * Build a zod schema expression for a scalar field.
 * @param {object} view
 */
function scalarZod(view) {
  const { type } = view;
  /** @type {string} */
  let schema;

  switch (type) {
    case 'string': {
      schema = 'z.string()';
      if (view.required && !view.nullable) {
        const min = view.minLength ?? 1;
        schema += `.min(${min})`;
      } else if (view.minLength != null) {
        schema += `.min(${view.minLength})`;
      }
      if (view.maxLength != null) {
        schema += `.max(${view.maxLength})`;
      }
      break;
    }
    case 'int':
    case 'long': {
      schema = 'z.number().int()';
      if (view.minimum != null) schema += `.min(${view.minimum})`;
      if (view.maximum != null) schema += `.max(${view.maximum})`;
      break;
    }
    case 'decimal':
    case 'double': {
      schema = 'z.number()';
      if (view.minimum != null) schema += `.min(${view.minimum})`;
      if (view.maximum != null) schema += `.max(${view.maximum})`;
      break;
    }
    case 'boolean':
      schema = 'z.boolean()';
      break;
    case 'Guid':
      schema = 'z.string().uuid()';
      break;
    case 'DateTime':
    case 'DateTimeOffset':
      schema = 'z.string().min(1)';
      break;
    default:
      schema = 'z.string()';
  }

  if (view.nullable) {
    schema += '.nullable()';
  }
  if (!view.required && view.type !== 'boolean') {
    schema += '.optional()';
  }

  return schema;
}

/**
 * @param {object} view
 */
function scalarDefault(view) {
  if (view.type === 'boolean') {
    return 'false';
  }
  if (
    view.type === 'int' ||
    view.type === 'long' ||
    view.type === 'decimal' ||
    view.type === 'double'
  ) {
    return view.nullable ? 'null' : '0';
  }
  return view.nullable ? 'null' : '""';
}

/**
 * Render the register-based JSX control for a scalar field.
 * @param {object} view
 */
function scalarFormNode(view) {
  const errorExpr = `form.formState.errors.${view.camel}?.message`;

  if (view.type === 'boolean') {
    return `      <label className="flex items-center gap-2 text-sm text-zinc-800">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-zinc-300"
          {...form.register("${view.camel}")}
        />
        ${view.label}
      </label>
      {${errorExpr} ? (
        <p className="text-sm text-red-600" role="alert">
          {${errorExpr}}
        </p>
      ) : null}`;
  }

  if (
    view.type === 'int' ||
    view.type === 'long' ||
    view.type === 'decimal' ||
    view.type === 'double'
  ) {
    const step = view.type === 'int' || view.type === 'long' ? '1' : 'any';
    return `      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        ${view.label}
        <input
          type="number"
          step="${step}"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          {...form.register("${view.camel}", { valueAsNumber: true })}
        />
      </label>
      {${errorExpr} ? (
        <p className="text-sm text-red-600" role="alert">
          {${errorExpr}}
        </p>
      ) : null}`;
  }

  if (view.type === 'DateTime' || view.type === 'DateTimeOffset') {
    return `      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        ${view.label}
        <input
          type="datetime-local"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          {...form.register("${view.camel}")}
        />
      </label>
      {${errorExpr} ? (
        <p className="text-sm text-red-600" role="alert">
          {${errorExpr}}
        </p>
      ) : null}`;
  }

  return `      <label className="flex flex-col gap-1 text-sm text-zinc-800">
        ${view.label}
        <input
          type="text"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          {...form.register("${view.camel}")}
        />
      </label>
      {${errorExpr} ? (
        <p className="text-sm text-red-600" role="alert">
          {${errorExpr}}
        </p>
      ) : null}`;
}

/**
 * Wrap a custom control in a react-hook-form Controller.
 * @param {object} options
 */
function controllerNode({ name, label, control }) {
  return `      <Controller
        control={form.control}
        name="${name}"
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-1 text-sm text-zinc-800">
            <span>${label}</span>
${control}
            {fieldState.error ? (
              <p className="text-sm text-red-600" role="alert">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        )}
      />`;
}

/**
 * @param {Array<{ name: string, value: unknown }>} values
 */
function enumValueLiteral(value) {
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

/**
 * Produce a descriptor bundling everything the generators need for a field.
 * @param {object} field
 */
export function describeField(field) {
  const kind = classifyField(field);
  const name = field.name;
  const camel = toCamelCase(name);
  const label = toLabel(name);
  const required = isRequired(field);
  const nullable = isNullable(field);

  /** @type {ReturnType<typeof baseDescriptor>} */
  const descriptor = baseDescriptor({ kind, name, camel, label, required, nullable });

  if (kind === 'scalar') {
    return scalarDescriptor(descriptor, field);
  }
  if (kind === 'enum') {
    return enumDescriptor(descriptor, field);
  }
  if (kind === 'relationship') {
    return relationshipDescriptor(descriptor, field);
  }
  return mediaDescriptor(descriptor, field);
}

/**
 * @param {object} base
 */
function baseDescriptor(base) {
  return {
    ...base,
    readLines: /** @type {string[]} */ ([]),
    requestLines: /** @type {string[]} */ ([]),
    schemaLines: /** @type {string[]} */ ([]),
    defaultLines: /** @type {string[]} */ ([]),
    resetLines: /** @type {string[]} */ ([]),
    enumDecl: /** @type {string | null} */ (null),
    optionsConst: /** @type {string | null} */ (null),
    needsStoredFile: false,
    controls: {
      controller: false,
      lookupSelect: false,
      multiLookupSelect: false,
      enumSelect: false,
      imageUpload: false,
      fileUpload: false,
    },
    formNode: '',
    tableLabel: base.label,
    tableCell: '',
    tableNeedsOptions: /** @type {string | null} */ (null),
    publicLabel: base.label,
    publicValue: '',
    publicNeedsOptions: /** @type {string | null} */ (null),
  };
}

/**
 * @param {ReturnType<typeof baseDescriptor>} descriptor
 * @param {object} field
 */
function scalarDescriptor(descriptor, field) {
  const type = resolveScalarType(field);
  const view = {
    type,
    camel: descriptor.camel,
    label: descriptor.label,
    required: descriptor.required,
    nullable: descriptor.nullable,
    minLength: field.minLength ?? null,
    maxLength: field.maxLength ?? null,
    minimum: field.minimum ?? null,
    maximum: field.maximum ?? null,
  };

  const tsType = toTypeScriptType({ type, nullable: descriptor.nullable });

  descriptor.readLines.push(`  ${descriptor.camel}: ${tsType};`);
  descriptor.requestLines.push(`  ${descriptor.camel}: ${tsType};`);
  descriptor.schemaLines.push(`  ${descriptor.camel}: ${scalarZod(view)},`);
  descriptor.defaultLines.push(`  ${descriptor.camel}: ${scalarDefault(view)},`);
  descriptor.resetLines.push(`    ${descriptor.camel}: selected.${descriptor.camel},`);
  descriptor.formNode = scalarFormNode(view);

  if (type === 'boolean') {
    descriptor.tableCell = `{item.${descriptor.camel} ? "Yes" : "No"}`;
    descriptor.publicValue = `{item.${descriptor.camel} ? "Yes" : "No"}`;
  } else {
    descriptor.tableCell = `{item.${descriptor.camel} ?? "—"}`;
    descriptor.publicValue = `{String(item.${descriptor.camel} ?? "—")}`;
  }

  return descriptor;
}

/**
 * @param {ReturnType<typeof baseDescriptor>} descriptor
 * @param {object} field
 */
function enumDescriptor(descriptor, field) {
  const enumName = toPascalCase(field.enumName ?? field.enum?.name ?? `${descriptor.name}Enum`);
  const optionsConst = `${toCamelCase(enumName)}Options`;
  const rawValues = Array.isArray(field.enumValues)
    ? field.enumValues
    : Array.isArray(field.enum?.values)
      ? field.enum.values
      : [];
  const values = rawValues.map((option, index) => {
    if (typeof option === 'string') {
      return { name: option, value: index + 1 };
    }
    return {
      name: option.name ?? String(option.value ?? option),
      value: option.value ?? index + 1,
    };
  });
  const { camel, nullable, required } = descriptor;

  const optionRows = values
    .map(
      (option) =>
        `  { value: ${enumValueLiteral(option.value)}, label: ${JSON.stringify(
          option.name,
        )} },`,
    )
    .join('\n');

  descriptor.enumDecl = `export const ${optionsConst} = [
${optionRows}
] as const;

export type ${enumName} = (typeof ${optionsConst})[number]["value"];`;
  descriptor.optionsConst = optionsConst;

  const tsType = nullable ? `${enumName} | null` : enumName;
  descriptor.readLines.push(`  ${camel}: ${tsType};`);
  descriptor.requestLines.push(`  ${camel}: ${tsType};`);

  const literals = values.map((option) => `z.literal(${enumValueLiteral(option.value)})`);
  let zod;
  if (literals.length > 1) {
    zod = `z.union([${literals.join(', ')}])`;
  } else if (literals.length === 1) {
    zod = literals[0];
  } else {
    zod = 'z.number().int()';
  }
  if (nullable) {
    zod += '.nullable()';
  }
  descriptor.schemaLines.push(`  ${camel}: ${zod},`);

  const firstValue = values.length > 0 ? enumValueLiteral(values[0].value) : '0';
  descriptor.defaultLines.push(
    `  ${camel}: ${nullable || !required ? 'null' : firstValue},`,
  );
  descriptor.resetLines.push(`    ${camel}: selected.${camel},`);

  descriptor.controls.controller = true;
  descriptor.controls.enumSelect = true;
  descriptor.formNode = controllerNode({
    name: camel,
    label: descriptor.label,
    control: `            <EnumSelect
              value={field.value}
              onChange={field.onChange}
              options={${optionsConst}}
              placeholder="Select ${descriptor.label.toLowerCase()}"
            />`,
  });

  descriptor.tableCell = `{${optionsConst}.find((option) => option.value === item.${camel})?.label ?? "—"}`;
  descriptor.tableNeedsOptions = optionsConst;
  descriptor.publicValue = descriptor.tableCell;
  descriptor.publicNeedsOptions = optionsConst;

  return descriptor;
}

/**
 * @param {ReturnType<typeof baseDescriptor>} descriptor
 * @param {object} field
 */
function relationshipDescriptor(descriptor, field) {
  const rel = field.relationship ?? {};
  const relType = field.relationshipType ?? rel.type ?? 'many-to-one';
  const isCollection = relType === 'many-to-many' || relType === 'one-to-many';
  const targetPascal = toPascalCase(
    field.target ?? rel.targetEntity ?? rel.targetFeature ?? descriptor.name,
  );
  const targetPlural = pluralizePascal(targetPascal);
  const endpoint = `/api/v1/${targetPlural}/Lookup`;
  const { nullable, required, label } = descriptor;

  if (isCollection) {
    const idsCamel = toCamelCase(field.commandIdsName ?? `${targetPascal}Ids`);
    const displayNamesCamel = `${toCamelCase(targetPascal)}DisplayNames`;

    descriptor.readLines.push(`  ${idsCamel}: string[];`);
    descriptor.readLines.push(`  ${displayNamesCamel}: string[];`);
    descriptor.requestLines.push(`  ${idsCamel}: string[];`);
    descriptor.schemaLines.push(`  ${idsCamel}: z.array(z.string().uuid()),`);
    descriptor.defaultLines.push(`  ${idsCamel}: [],`);
    descriptor.resetLines.push(`    ${idsCamel}: selected.${idsCamel},`);

    descriptor.controls.controller = true;
    descriptor.controls.multiLookupSelect = true;
    descriptor.formNode = controllerNode({
      name: idsCamel,
      label,
      control: `            <MultiLookupSelect
              value={field.value}
              onChange={field.onChange}
              endpoint="${endpoint}"
            />`,
    });

    descriptor.tableCell = `{item.${displayNamesCamel}.length ? item.${displayNamesCamel}.join(", ") : "—"}`;
    descriptor.publicValue = `{item.${displayNamesCamel}.length ? item.${displayNamesCamel}.join(", ") : "—"}`;
    return descriptor;
  }

  const idPascal = field.foreignKeyName
    ? toPascalCase(field.foreignKeyName)
    : rel.foreignKey
      ? toPascalCase(rel.foreignKey)
      : `${targetPascal}Id`;
  const idCamel = toCamelCase(idPascal);
  const displayCamel = toCamelCase(field.displayName ?? `${targetPascal}DisplayName`);
  const idType = nullable ? 'string | null' : 'string';

  descriptor.readLines.push(`  ${idCamel}: ${idType};`);
  descriptor.readLines.push(`  ${displayCamel}: string | null;`);
  descriptor.requestLines.push(`  ${idCamel}: ${idType};`);
  descriptor.schemaLines.push(
    `  ${idCamel}: z.string().uuid()${nullable ? '.nullable()' : ''},`,
  );
  descriptor.defaultLines.push(`  ${idCamel}: ${nullable ? 'null' : '""'},`);
  descriptor.resetLines.push(`    ${idCamel}: selected.${idCamel},`);

  descriptor.controls.controller = true;
  descriptor.controls.lookupSelect = true;
  descriptor.formNode = controllerNode({
    name: idCamel,
    label,
    control: `            <LookupSelect
              value={field.value}
              onChange={field.onChange}
              endpoint="${endpoint}"
              placeholder="Select ${label.toLowerCase()}"
            />`,
  });

  descriptor.tableCell = `{item.${displayCamel} ?? "—"}`;
  descriptor.publicValue = `{item.${displayCamel} ?? "—"}`;
  return descriptor;
}

/**
 * @param {ReturnType<typeof baseDescriptor>} descriptor
 * @param {object} field
 */
function mediaDescriptor(descriptor, field) {
  const media = field.media ?? {};
  const multiple =
    field.cardinality === 'multiple' || media.multiple === true;
  const isImage = field.kind === 'image';
  const { camel, nullable, label } = descriptor;

  descriptor.needsStoredFile = true;
  descriptor.controls.controller = true;
  if (isImage) {
    descriptor.controls.imageUpload = true;
  } else {
    descriptor.controls.fileUpload = true;
  }

  const componentName = isImage ? 'ImageUploadField' : 'FileUploadField';

  /** @type {string[]} */
  const extraProps = [];
  if (isImage) {
    extraProps.push('accept="image/*"');
  } else if (Array.isArray(media.allowedMimeTypes) && media.allowedMimeTypes.length > 0) {
    extraProps.push(`accept=${JSON.stringify(media.allowedMimeTypes.join(","))}`);
  }
  if (typeof field.maxFiles === 'number') {
    extraProps.push(`maxFiles={${field.maxFiles}}`);
  } else if (typeof media.maxFiles === 'number') {
    extraProps.push(`maxFiles={${media.maxFiles}}`);
  }
  if (typeof media.maxSizeBytes === 'number') {
    extraProps.push(`maxSizeBytes={${media.maxSizeBytes}}`);
  }
  const extraPropsText = extraProps.length
    ? `\n              ${extraProps.join('\n              ')}`
    : '';

  if (multiple) {
    const idsCamel = toCamelCase(field.commandIdsName ?? `${descriptor.name}FileIds`);
    descriptor.readLines.push(`  ${idsCamel}: string[];`);
    descriptor.readLines.push(`  ${camel}: StoredFileDto[];`);
    descriptor.requestLines.push(`  ${idsCamel}: string[];`);
    descriptor.schemaLines.push(`  ${idsCamel}: z.array(z.string().uuid()),`);
    descriptor.defaultLines.push(`  ${idsCamel}: [],`);
    descriptor.resetLines.push(`    ${idsCamel}: selected.${idsCamel},`);

    descriptor.formNode = controllerNode({
      name: idsCamel,
      label,
      control: `            <${componentName}
              value={field.value}
              onChange={field.onChange}
              multiple${extraPropsText}
            />`,
    });

    descriptor.tableCell = isImage
      ? `{item.${camel}[0] ? <img src={item.${camel}[0].url} alt="" className="h-8 w-8 rounded object-cover" /> : "—"}`
      : `{item.${camel}.length ? \`\${item.${camel}.length} file(s)\` : "—"}`;
    descriptor.publicValue = descriptor.tableCell;
    return descriptor;
  }

  const idCamel = toCamelCase(field.foreignKeyName ?? field.commandIdName ?? `${descriptor.name}Id`);
  const idType = nullable ? 'string | null' : 'string';
  descriptor.readLines.push(`  ${idCamel}: ${idType};`);
  descriptor.readLines.push(`  ${camel}: StoredFileDto | null;`);
  descriptor.requestLines.push(`  ${idCamel}: ${idType};`);
  descriptor.schemaLines.push(
    `  ${idCamel}: z.string().uuid()${nullable ? '.nullable()' : ''},`,
  );
  descriptor.defaultLines.push(`  ${idCamel}: ${nullable ? 'null' : '""'},`);
  descriptor.resetLines.push(`    ${idCamel}: selected.${idCamel},`);

  descriptor.formNode = controllerNode({
    name: idCamel,
    label,
    control: `            <${componentName}
              value={field.value}
              onChange={field.onChange}${extraPropsText}
            />`,
  });

  descriptor.tableCell = isImage
    ? `{item.${camel} ? <img src={item.${camel}.url} alt="" className="h-8 w-8 rounded object-cover" /> : "—"}`
    : `{item.${camel}?.fileName ?? "—"}`;
  descriptor.publicValue = descriptor.tableCell;
  return descriptor;
}
