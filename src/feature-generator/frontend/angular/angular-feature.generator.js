import path from 'node:path';
import { toTypeScriptType } from '../../fields/field-types.js';
import { toCamelCase, toKebabCase } from '../../utils/feature-naming.js';

/**
 * Plan every Angular file for a generated feature.
 *
 * Supports V2 scalar fields plus V3 field kinds:
 *   - scalar (string/int/long/decimal/double/boolean/Guid/DateTime/...)
 *   - enum (single select backed by a string union)
 *   - relationship (single -> `${target}Id`, multiple -> `${target}Ids`)
 *   - file / image (uploaded via multipart to /api/v1/Files, stores the id)
 *
 * @param {object} config
 * @returns {{ relativePath: string, contents: string }[]}
 */
export function planAngularFeatureFiles(config) {
  const ctx = buildContext(config);
  const base = path.join('Client', 'src', 'app', 'features', ctx.kebabPlural);

  /** @type {{ relativePath: string, contents: string }[]} */
  const files = [];

  files.push({
    relativePath: path.join(base, 'models', `${ctx.kebab}.model.ts`),
    contents: renderModel(ctx),
  });
  files.push({
    relativePath: path.join(base, 'services', `${ctx.kebab}.service.ts`),
    contents: renderService(ctx),
  });
  files.push({
    relativePath: path.join(base, 'store', `${ctx.kebab}.state.ts`),
    contents: renderState(ctx),
  });
  files.push({
    relativePath: path.join(base, 'store', `${ctx.kebab}.actions.ts`),
    contents: renderActions(ctx),
  });
  files.push({
    relativePath: path.join(base, 'store', `${ctx.kebab}.reducer.ts`),
    contents: renderReducer(ctx),
  });
  files.push({
    relativePath: path.join(base, 'store', `${ctx.kebab}.effects.ts`),
    contents: renderEffects(ctx),
  });
  files.push({
    relativePath: path.join(base, 'store', `${ctx.kebab}.selectors.ts`),
    contents: renderSelectors(ctx),
  });

  files.push({
    relativePath: path.join(
      base,
      'components',
      `${ctx.kebab}-form`,
      `${ctx.kebab}-form.component.ts`,
    ),
    contents: renderFormComponent(ctx),
  });
  files.push({
    relativePath: path.join(
      base,
      'components',
      `${ctx.kebab}-table`,
      `${ctx.kebab}-table.component.ts`,
    ),
    contents: renderTableComponent(ctx),
  });
  files.push({
    relativePath: path.join(
      base,
      'components',
      `${ctx.kebab}-filters`,
      `${ctx.kebab}-filters.component.ts`,
    ),
    contents: renderFiltersComponent(ctx),
  });

  files.push({
    relativePath: path.join(
      base,
      'pages',
      `${ctx.kebabPlural}-page`,
      `${ctx.kebabPlural}-page.component.ts`,
    ),
    contents: renderListPage(ctx),
  });
  if (ctx.ops.create) {
    files.push({
      relativePath: path.join(
        base,
        'pages',
        `create-${ctx.kebab}-page`,
        `create-${ctx.kebab}-page.component.ts`,
      ),
      contents: renderCreatePage(ctx),
    });
  }
  if (ctx.ops.update) {
    files.push({
      relativePath: path.join(
        base,
        'pages',
        `edit-${ctx.kebab}-page`,
        `edit-${ctx.kebab}-page.component.ts`,
      ),
      contents: renderEditPage(ctx),
    });
  }

  files.push({
    relativePath: path.join(base, `${ctx.kebab}.routes.ts`),
    contents: renderRoutes(ctx),
  });

  return files;
}

/**
 * @param {object} config
 */
function buildContext(config) {
  const {
    singularName: Singular,
    pluralName: Plural,
    camelName: camel,
    camelPluralName: camelPlural,
    kebabName: kebab,
    kebabPluralName: kebabPlural,
  } = config.feature;

  const ops = config.operations ?? {
    list: true,
    getById: true,
    create: true,
    update: true,
    delete: true,
    restore: false,
    search: true,
    pagination: true,
  };

  const fields = (config.fields ?? []).map((field) => normalizeNgField(field));
  const surface = config.surface ?? { dashboard: true, public: false };

  /** @type {Map<string, { enumName: string, camelName: string, values: string[] }>} */
  const enumMap = new Map();
  for (const field of fields) {
    if (field.kind === 'enum' && !enumMap.has(field.enumName)) {
      enumMap.set(field.enumName, {
        enumName: field.enumName,
        camelName: toCamelCase(field.enumName),
        values: field.enumValues,
      });
    }
  }

  return {
    Singular,
    Plural,
    camel,
    camelPlural,
    kebab,
    kebabPlural,
    ops,
    fields,
    surface,
    enums: Array.from(enumMap.values()),
    enSingular: config.labels?.enSingular ?? Singular,
    enPlural: config.labels?.enPlural ?? Plural,
    listUrl: surface.dashboard ? `/dashboard/${kebabPlural}` : `/${kebabPlural}`,
    featureKey: camel,
  };
}

/**
 * Normalise a raw config field (V2 scalar or V3 kind) into a render model.
 * @param {object} field
 */
function normalizeNgField(field) {
  const name = field.name;
  const camel = toCamelCase(name);
  const label = toLabel(name);
  const kind = resolveKind(field);
  const required = field.required !== false;
  const nullable = field.nullable === true || (!required && field.nullable !== false);

  if (kind === 'enum') {
    const enumName = field.enum?.name ?? field.enumName ?? name;
    const values = field.enum?.values ?? field.enumValues ?? [];
    const tsType = values.length > 0 ? enumName : 'string';
    return {
      ...field,
      name,
      camel,
      label,
      kind,
      required,
      nullable,
      enumName,
      enumValues: values,
      control: camel,
      readType: required ? tsType : `${tsType} | null`,
      inputType: required ? tsType : `${tsType} | null`,
      initial: 'null',
    };
  }

  if (kind === 'relationship') {
    // Flat field model: multiplicity comes from `relationshipType`, and the
    // wire property names come from `commandIdsName` / `foreignKeyName`.
    const relationshipType =
      field.relationshipType ?? field.relationship?.type ?? null;
    const multiple =
      relationshipType === 'many-to-many' ||
      relationshipType === 'one-to-many' ||
      field.relationship?.multiple === true ||
      field.multiple === true;
    const target = toPascal(
      field.target ?? field.relationship?.target ?? (multiple ? singularize(name) : name),
    );
    const targetCamel = toCamelCase(target);
    const control = multiple
      ? toCamelCase(field.commandIdsName ?? `${target}Ids`)
      : toCamelCase(field.foreignKeyName ?? field.commandIdName ?? `${targetCamel}Id`);
    const optionsInput = `${targetCamel}Options`;
    return {
      ...field,
      name,
      camel,
      label,
      kind,
      required,
      nullable,
      multiple,
      target,
      targetCamel,
      control,
      optionsInput,
      readType: multiple ? 'string[]' : nullable ? 'string | null' : 'string',
      inputType: multiple ? 'string[]' : nullable ? 'string | null' : 'string',
      initial: multiple ? '[]' : 'null',
    };
  }

  if (kind === 'file' || kind === 'image') {
    // Flat field model: `cardinality` drives multiplicity; the wire property
    // names come from `commandIdsName` (multiple) / `commandIdName` (single).
    const multiple =
      field.cardinality === 'multiple' || field.media?.multiple === true;
    const control = multiple
      ? toCamelCase(field.commandIdsName ?? `${name}FileIds`)
      : toCamelCase(field.foreignKeyName ?? field.commandIdName ?? `${name}Id`);
    return {
      ...field,
      name,
      camel,
      label,
      kind,
      required,
      nullable,
      multiple,
      control,
      urlProp: `${camel}Url`,
      readType: multiple ? 'string[]' : 'string | null',
      inputType: multiple ? 'string[]' : 'string | null',
      initial: multiple ? '[]' : 'null',
    };
  }

  const type = field.type ?? 'string';
  const scalarField = { ...field, type, nullable };
  const tsType = toTypeScriptType(scalarField);
  return {
    ...field,
    name,
    camel,
    label,
    kind: 'scalar',
    type,
    required,
    nullable,
    control: camel,
    readType: tsType,
    inputType: tsType,
    initial: type === 'boolean' ? 'false' : 'null',
  };
}

/**
 * @param {object} field
 */
function resolveKind(field) {
  const kind = field.kind;
  if (kind) {
    if (kind === 'string' || kind === 'scalar') {
      return 'scalar';
    }
    if (['enum', 'relationship', 'file', 'image'].includes(kind)) {
      return kind;
    }
  }
  if (field.relationship || field.target) {
    return 'relationship';
  }
  if (field.enum || field.enumValues) {
    return 'enum';
  }
  return 'scalar';
}

/**
 * @param {string} pascal
 */
function toLabel(pascal) {
  return pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
}

/**
 * @param {string} value
 */
function toPascal(value) {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * @param {string} word
 */
function singularize(word) {
  if (/ies$/i.test(word)) {
    return word.replace(/ies$/i, 'y');
  }
  if (/ses$/i.test(word)) {
    return word.replace(/es$/i, '');
  }
  if (/s$/i.test(word) && !/ss$/i.test(word)) {
    return word.replace(/s$/i, '');
  }
  return word;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function scalarValidators(field) {
  /** @type {string[]} */
  const validators = [];
  if (field.kind === 'scalar') {
    if (field.required && field.type !== 'boolean') {
      validators.push('Validators.required');
    }
    if (field.type === 'string') {
      if (field.minLength != null) {
        validators.push(`Validators.minLength(${field.minLength})`);
      }
      if (field.maxLength != null) {
        validators.push(`Validators.maxLength(${field.maxLength})`);
      }
    }
    if (['int', 'long', 'decimal', 'double'].includes(field.type)) {
      if (field.minimum != null) {
        validators.push(`Validators.min(${field.minimum})`);
      }
      if (field.maximum != null) {
        validators.push(`Validators.max(${field.maximum})`);
      }
    }
    return validators;
  }

  if (field.required && !(field.kind === 'relationship' && field.multiple)) {
    validators.push('Validators.required');
  }
  return validators;
}

/**
 * Resolve the strongly-typed FormControl shape (value type, initial literal, and
 * whether the control is non-nullable) for a normalised field.
 * @param {object} field
 */
function formControlShape(field) {
  if (field.kind === 'scalar' && field.type === 'boolean') {
    return { type: 'boolean', initial: 'false', nonNullable: true };
  }
  if (field.kind === 'relationship' && field.multiple) {
    return { type: 'string[]', initial: '[]', nonNullable: true };
  }
  if ((field.kind === 'file' || field.kind === 'image') && field.multiple) {
    return { type: 'string[]', initial: '[]', nonNullable: true };
  }
  if (field.kind === 'enum') {
    return { type: `${field.enumName} | null`, initial: 'null', nonNullable: false };
  }
  if (
    field.kind === 'scalar' &&
    ['int', 'long', 'decimal', 'double'].includes(field.type)
  ) {
    return { type: 'number | null', initial: 'null', nonNullable: false };
  }
  return { type: 'string | null', initial: 'null', nonNullable: false };
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderModel(ctx) {
  const hasEnums = ctx.enums.length > 0;

  /** @type {string[]} */
  const parts = [];

  if (hasEnums) {
    parts.push(`import type { LookupOption } from "../../../shared/models/lookup.model";`);
    parts.push('');
    for (const meta of ctx.enums) {
      if (meta.values.length > 0) {
        const union = meta.values.map((value) => `"${value}"`).join(' | ');
        parts.push(`export type ${meta.enumName} = ${union};`);
        const options = meta.values
          .map((value) => `  { value: "${value}", label: "${value}" },`)
          .join('\n');
        parts.push(`export const ${meta.enumName}Options: LookupOption[] = [
${options}
];`);
      } else {
        parts.push(`export type ${meta.enumName} = string;`);
        parts.push(`export const ${meta.enumName}Options: LookupOption[] = [];`);
      }
      parts.push('');
    }
  }

  const readLines = ['  id: string;'];
  for (const field of ctx.fields) {
    readLines.push(`  ${field.control}: ${field.readType};`);
    if (field.kind === 'file' || field.kind === 'image') {
      readLines.push(`  ${field.urlProp}?: string | null;`);
    }
  }
  readLines.push('  createdAtUtc: string;');
  readLines.push('  updatedAtUtc: string | null;');
  readLines.push('  rowVersion: string;');

  const inputLines = ctx.fields.map(
    (field) => `  ${field.control}: ${field.inputType};`,
  );

  parts.push(`export type ${ctx.Singular} = {
${readLines.join('\n')}
};`);

  parts.push('');
  parts.push(`export type ${ctx.Singular}Query = {
  page: number;
  pageSize: number;
  search?: string;
};`);

  parts.push('');
  parts.push(`export type Create${ctx.Singular}Input = {
${inputLines.join('\n')}
};`);

  if (ctx.ops.update) {
    parts.push('');
    parts.push(`export type Update${ctx.Singular}Input = Create${ctx.Singular}Input & {
  id: string;
  rowVersion: string;
};`);
  }

  return `${parts.join('\n')}\n`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderService(ctx) {
  /** @type {string[]} */
  const typeImports = [`${ctx.Singular}`, `${ctx.Singular}Query`];
  if (ctx.ops.create) typeImports.push(`Create${ctx.Singular}Input`);
  if (ctx.ops.update) typeImports.push(`Update${ctx.Singular}Input`);

  /** @type {string[]} */
  const methods = [];

  methods.push(`  search(query: ${ctx.Singular}Query): Observable<PaginationResult<${ctx.Singular}>> {
    let params = new HttpParams()
      .set("page", String(query.page))
      .set("pageSize", String(query.pageSize));

    if (query.search) {
      params = params.set("search", query.search);
    }

    return this.http.get<PaginationResult<${ctx.Singular}>>(basePath, { params });
  }`);

  if (ctx.ops.getById) {
    methods.push(`  getById(id: string): Observable<${ctx.Singular}> {
    return this.http.get<${ctx.Singular}>(\`\${basePath}/\${id}\`);
  }`);
  }

  if (ctx.ops.create) {
    methods.push(`  create(input: Create${ctx.Singular}Input): Observable<${ctx.Singular}> {
    return this.http.post<${ctx.Singular}>(basePath, input);
  }`);
  }

  if (ctx.ops.update) {
    methods.push(`  update(input: Update${ctx.Singular}Input): Observable<${ctx.Singular}> {
    return this.http.put<${ctx.Singular}>(\`\${basePath}/\${input.id}\`, input);
  }`);
  }

  if (ctx.ops.delete) {
    methods.push(`  delete(id: string): Observable<void> {
    return this.http.delete<void>(\`\${basePath}/\${id}\`);
  }`);
  }

  if (ctx.ops.restore) {
    methods.push(`  restore(id: string): Observable<${ctx.Singular}> {
    return this.http.post<${ctx.Singular}>(\`\${basePath}/\${id}/Restore\`, {});
  }`);
  }

  return `import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import type { PaginationResult } from "../../../shared/models/pagination";
import type {
  ${typeImports.join(',\n  ')},
} from "../models/${ctx.kebab}.model";

const basePath = "/api/v1/${ctx.Plural}";

@Injectable({ providedIn: "root" })
export class ${ctx.Singular}Service {
  constructor(private readonly http: HttpClient) {}

${methods.join('\n\n')}
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderState(ctx) {
  return `import type { PaginationResult } from "../../../shared/models/pagination";
import type { ${ctx.Singular} } from "../models/${ctx.kebab}.model";

export const ${ctx.featureKey}FeatureKey = "${ctx.featureKey}";

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export type ${ctx.Singular}State = {
  items: ${ctx.Singular}[];
  selected: ${ctx.Singular} | null;
  pagination: PaginationResult<${ctx.Singular}> | null;
  status: RequestStatus;
  error: string | null;
};

export const initial${ctx.Singular}State: ${ctx.Singular}State = {
  items: [],
  selected: null,
  pagination: null,
  status: "idle",
  error: null,
};
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderActions(ctx) {
  /** @type {string[]} */
  const typeImports = [`${ctx.Singular}`, `${ctx.Singular}Query`];
  if (ctx.ops.create) typeImports.push(`Create${ctx.Singular}Input`);
  if (ctx.ops.update) typeImports.push(`Update${ctx.Singular}Input`);

  /** @type {string[]} */
  const events = [];
  events.push(`    "Load ${ctx.Plural}": props<{ query: ${ctx.Singular}Query }>(),`);
  events.push(`    "Load ${ctx.Plural} Success": props<{ result: PaginationResult<${ctx.Singular}> }>(),`);
  events.push(`    "Load ${ctx.Plural} Failure": props<{ error: string }>(),`);

  if (ctx.ops.getById) {
    events.push(`    "Load ${ctx.Singular} By Id": props<{ id: string }>(),`);
    events.push(`    "Load ${ctx.Singular} By Id Success": props<{ ${ctx.camel}: ${ctx.Singular} }>(),`);
    events.push(`    "Load ${ctx.Singular} By Id Failure": props<{ error: string }>(),`);
  }
  if (ctx.ops.create) {
    events.push(`    "Create ${ctx.Singular}": props<{ input: Create${ctx.Singular}Input }>(),`);
    events.push(`    "Create ${ctx.Singular} Success": props<{ ${ctx.camel}: ${ctx.Singular} }>(),`);
    events.push(`    "Create ${ctx.Singular} Failure": props<{ error: string }>(),`);
  }
  if (ctx.ops.update) {
    events.push(`    "Update ${ctx.Singular}": props<{ input: Update${ctx.Singular}Input }>(),`);
    events.push(`    "Update ${ctx.Singular} Success": props<{ ${ctx.camel}: ${ctx.Singular} }>(),`);
    events.push(`    "Update ${ctx.Singular} Failure": props<{ error: string }>(),`);
  }
  if (ctx.ops.delete) {
    events.push(`    "Delete ${ctx.Singular}": props<{ id: string }>(),`);
    events.push(`    "Delete ${ctx.Singular} Success": props<{ id: string }>(),`);
    events.push(`    "Delete ${ctx.Singular} Failure": props<{ error: string }>(),`);
  }
  if (ctx.ops.restore) {
    events.push(`    "Restore ${ctx.Singular}": props<{ id: string }>(),`);
    events.push(`    "Restore ${ctx.Singular} Success": props<{ ${ctx.camel}: ${ctx.Singular} }>(),`);
    events.push(`    "Restore ${ctx.Singular} Failure": props<{ error: string }>(),`);
  }
  events.push(`    "Clear Error": emptyProps(),`);

  return `import { createActionGroup, emptyProps, props } from "@ngrx/store";
import type { PaginationResult } from "../../../shared/models/pagination";
import type {
  ${typeImports.join(',\n  ')},
} from "../models/${ctx.kebab}.model";

export const ${ctx.Singular}Actions = createActionGroup({
  source: "${ctx.Singular}",
  events: {
${events.join('\n')}
  },
});
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderReducer(ctx) {
  /** @type {string[]} */
  const handlers = [];

  handlers.push(`  on(${ctx.Singular}Actions.load${ctx.Plural}, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(${ctx.Singular}Actions.load${ctx.Plural}Success, (state, { result }) => ({
    ...state,
    status: "succeeded" as const,
    items: result.data,
    pagination: result,
  })),
  on(${ctx.Singular}Actions.load${ctx.Plural}Failure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  }))`);

  if (ctx.ops.getById) {
    handlers.push(`  on(${ctx.Singular}Actions.load${ctx.Singular}ById, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(${ctx.Singular}Actions.load${ctx.Singular}ByIdSuccess, (state, { ${ctx.camel} }) => ({
    ...state,
    status: "succeeded" as const,
    selected: ${ctx.camel},
  })),
  on(${ctx.Singular}Actions.load${ctx.Singular}ByIdFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  }))`);
  }

  if (ctx.ops.create) {
    handlers.push(`  on(${ctx.Singular}Actions.create${ctx.Singular}, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(${ctx.Singular}Actions.create${ctx.Singular}Success, (state, { ${ctx.camel} }) => ({
    ...state,
    status: "succeeded" as const,
    selected: ${ctx.camel},
    items: [${ctx.camel}, ...state.items],
  })),
  on(${ctx.Singular}Actions.create${ctx.Singular}Failure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  }))`);
  }

  if (ctx.ops.update) {
    handlers.push(`  on(${ctx.Singular}Actions.update${ctx.Singular}, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(${ctx.Singular}Actions.update${ctx.Singular}Success, (state, { ${ctx.camel} }) => ({
    ...state,
    status: "succeeded" as const,
    selected: ${ctx.camel},
    items: state.items.map((item) => (item.id === ${ctx.camel}.id ? ${ctx.camel} : item)),
  })),
  on(${ctx.Singular}Actions.update${ctx.Singular}Failure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  }))`);
  }

  if (ctx.ops.delete) {
    handlers.push(`  on(${ctx.Singular}Actions.delete${ctx.Singular}, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(${ctx.Singular}Actions.delete${ctx.Singular}Success, (state, { id }) => ({
    ...state,
    status: "succeeded" as const,
    items: state.items.filter((item) => item.id !== id),
    selected: state.selected?.id === id ? null : state.selected,
  })),
  on(${ctx.Singular}Actions.delete${ctx.Singular}Failure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  }))`);
  }

  if (ctx.ops.restore) {
    handlers.push(`  on(${ctx.Singular}Actions.restore${ctx.Singular}, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(${ctx.Singular}Actions.restore${ctx.Singular}Success, (state, { ${ctx.camel} }) => ({
    ...state,
    status: "succeeded" as const,
    selected: ${ctx.camel},
    items: state.items.some((item) => item.id === ${ctx.camel}.id)
      ? state.items.map((item) => (item.id === ${ctx.camel}.id ? ${ctx.camel} : item))
      : [${ctx.camel}, ...state.items],
  })),
  on(${ctx.Singular}Actions.restore${ctx.Singular}Failure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  }))`);
  }

  handlers.push(`  on(${ctx.Singular}Actions.clearError, (state) => ({
    ...state,
    error: null,
  }))`);

  return `import { createReducer, on } from "@ngrx/store";
import { ${ctx.Singular}Actions } from "./${ctx.kebab}.actions";
import { initial${ctx.Singular}State } from "./${ctx.kebab}.state";

export const ${ctx.featureKey}Reducer = createReducer(
  initial${ctx.Singular}State,
${handlers.join(',\n')},
);
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderEffects(ctx) {
  /** @type {string[]} */
  const effects = [];

  effects.push(`  load${ctx.Plural}$ = createEffect(() =>
    this.actions$.pipe(
      ofType(${ctx.Singular}Actions.load${ctx.Plural}),
      switchMap(({ query }) =>
        this.${ctx.camel}Service.search(query).pipe(
          map((result) => ${ctx.Singular}Actions.load${ctx.Plural}Success({ result })),
          catchError((error: unknown) =>
            of(${ctx.Singular}Actions.load${ctx.Plural}Failure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );`);

  if (ctx.ops.getById) {
    effects.push(`  load${ctx.Singular}ById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(${ctx.Singular}Actions.load${ctx.Singular}ById),
      switchMap(({ id }) =>
        this.${ctx.camel}Service.getById(id).pipe(
          map((${ctx.camel}) => ${ctx.Singular}Actions.load${ctx.Singular}ByIdSuccess({ ${ctx.camel} })),
          catchError((error: unknown) =>
            of(${ctx.Singular}Actions.load${ctx.Singular}ByIdFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );`);
  }

  if (ctx.ops.create) {
    effects.push(`  create${ctx.Singular}$ = createEffect(() =>
    this.actions$.pipe(
      ofType(${ctx.Singular}Actions.create${ctx.Singular}),
      switchMap(({ input }) =>
        this.${ctx.camel}Service.create(input).pipe(
          map((${ctx.camel}) => ${ctx.Singular}Actions.create${ctx.Singular}Success({ ${ctx.camel} })),
          catchError((error: unknown) =>
            of(${ctx.Singular}Actions.create${ctx.Singular}Failure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );`);
  }

  if (ctx.ops.update) {
    effects.push(`  update${ctx.Singular}$ = createEffect(() =>
    this.actions$.pipe(
      ofType(${ctx.Singular}Actions.update${ctx.Singular}),
      switchMap(({ input }) =>
        this.${ctx.camel}Service.update(input).pipe(
          map((${ctx.camel}) => ${ctx.Singular}Actions.update${ctx.Singular}Success({ ${ctx.camel} })),
          catchError((error: unknown) =>
            of(${ctx.Singular}Actions.update${ctx.Singular}Failure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );`);
  }

  if (ctx.ops.delete) {
    effects.push(`  delete${ctx.Singular}$ = createEffect(() =>
    this.actions$.pipe(
      ofType(${ctx.Singular}Actions.delete${ctx.Singular}),
      switchMap(({ id }) =>
        this.${ctx.camel}Service.delete(id).pipe(
          map(() => ${ctx.Singular}Actions.delete${ctx.Singular}Success({ id })),
          catchError((error: unknown) =>
            of(${ctx.Singular}Actions.delete${ctx.Singular}Failure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );`);
  }

  if (ctx.ops.restore) {
    effects.push(`  restore${ctx.Singular}$ = createEffect(() =>
    this.actions$.pipe(
      ofType(${ctx.Singular}Actions.restore${ctx.Singular}),
      switchMap(({ id }) =>
        this.${ctx.camel}Service.restore(id).pipe(
          map((${ctx.camel}) => ${ctx.Singular}Actions.restore${ctx.Singular}Success({ ${ctx.camel} })),
          catchError((error: unknown) =>
            of(${ctx.Singular}Actions.restore${ctx.Singular}Failure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );`);
  }

  return `import { Injectable, inject } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, map, of, switchMap } from "rxjs";
import { getErrorMessage } from "../../../shared/utils/get-error-message";
import { ${ctx.Singular}Service } from "../services/${ctx.kebab}.service";
import { ${ctx.Singular}Actions } from "./${ctx.kebab}.actions";

@Injectable()
export class ${ctx.Singular}Effects {
  private readonly actions$ = inject(Actions);
  private readonly ${ctx.camel}Service = inject(${ctx.Singular}Service);

${effects.join('\n\n')}
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderSelectors(ctx) {
  return `import { createFeatureSelector, createSelector } from "@ngrx/store";
import { ${ctx.featureKey}FeatureKey, type ${ctx.Singular}State } from "./${ctx.kebab}.state";

export const select${ctx.Singular}State =
  createFeatureSelector<${ctx.Singular}State>(${ctx.featureKey}FeatureKey);

export const select${ctx.Singular}Items = createSelector(
  select${ctx.Singular}State,
  (state) => state.items,
);
export const selectSelected${ctx.Singular} = createSelector(
  select${ctx.Singular}State,
  (state) => state.selected,
);
export const select${ctx.Singular}Status = createSelector(
  select${ctx.Singular}State,
  (state) => state.status,
);
export const select${ctx.Singular}Error = createSelector(
  select${ctx.Singular}State,
  (state) => state.error,
);
export const select${ctx.Singular}Pagination = createSelector(
  select${ctx.Singular}State,
  (state) => state.pagination,
);
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderFormControlBlock(field) {
  const control = field.control;
  const errorBlock = `      @if (form.get("${control}")?.touched && form.get("${control}")?.invalid) {
        <p class="text-sm text-red-600" role="alert">${field.label} is required.</p>
      }`;

  if (field.kind === 'scalar' && field.type === 'boolean') {
    return `      <label class="flex items-center gap-2 text-sm text-zinc-800">
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-zinc-300"
          formControlName="${control}"
        />
        ${field.label}
      </label>`;
  }

  /** @type {string} */
  let controlEl;

  if (field.kind === 'enum') {
    controlEl = `        <app-enum-select formControlName="${control}" [options]="${field.enumName}Options" />`;
  } else if (field.kind === 'relationship' && field.multiple) {
    controlEl = `        <app-multi-lookup-select formControlName="${control}" [options]="${field.optionsInput}()" />`;
  } else if (field.kind === 'relationship') {
    controlEl = `        <app-lookup-select formControlName="${control}" [options]="${field.optionsInput}()" />`;
  } else if (field.kind === 'file') {
    controlEl = `        <app-file-upload-field formControlName="${control}" />`;
  } else if (field.kind === 'image') {
    controlEl = `        <app-image-upload-field formControlName="${control}" />`;
  } else if (['int', 'long', 'decimal', 'double'].includes(field.type)) {
    const step = field.type === 'int' || field.type === 'long' ? '1' : 'any';
    controlEl = `        <input
          type="number"
          step="${step}"
          class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          formControlName="${control}"
        />`;
  } else if (field.type === 'DateTime' || field.type === 'DateTimeOffset') {
    controlEl = `        <input
          type="datetime-local"
          class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          formControlName="${control}"
        />`;
  } else {
    controlEl = `        <input
          type="text"
          class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
          formControlName="${control}"
        />`;
  }

  return `      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-zinc-800">${field.label}</label>
${controlEl}
${errorBlock}
      </div>`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderFormComponent(ctx) {
  const usesEnum = ctx.fields.some((field) => field.kind === 'enum');
  const usesLookup = ctx.fields.some(
    (field) => field.kind === 'relationship' && !field.multiple,
  );
  const usesMultiLookup = ctx.fields.some(
    (field) => field.kind === 'relationship' && field.multiple,
  );
  const usesFile = ctx.fields.some((field) => field.kind === 'file');
  const usesImage = ctx.fields.some((field) => field.kind === 'image');
  // `LookupOption` is only referenced as a type by relationship option inputs;
  // enum option arrays rely on inference, so enums alone must not import it.
  const usesLookupModel = usesLookup || usesMultiLookup;

  /** @type {string[]} */
  const componentImports = ['ReactiveFormsModule'];
  /** @type {string[]} */
  const controlImportLines = [];

  if (usesLookup) {
    componentImports.push('LookupSelectComponent');
    controlImportLines.push(
      `import { LookupSelectComponent } from "../../../../shared/components/forms/lookup-select.component";`,
    );
  }
  if (usesMultiLookup) {
    componentImports.push('MultiLookupSelectComponent');
    controlImportLines.push(
      `import { MultiLookupSelectComponent } from "../../../../shared/components/forms/multi-lookup-select.component";`,
    );
  }
  if (usesEnum) {
    componentImports.push('EnumSelectComponent');
    controlImportLines.push(
      `import { EnumSelectComponent } from "../../../../shared/components/forms/enum-select.component";`,
    );
  }
  if (usesFile) {
    componentImports.push('FileUploadFieldComponent');
    controlImportLines.push(
      `import { FileUploadFieldComponent } from "../../../../shared/components/forms/file-upload-field.component";`,
    );
  }
  if (usesImage) {
    componentImports.push('ImageUploadFieldComponent');
    controlImportLines.push(
      `import { ImageUploadFieldComponent } from "../../../../shared/components/forms/image-upload-field.component";`,
    );
  }

  let usesValidators = false;
  const groupEntries = ctx.fields
    .map((field) => {
      const { type, initial, nonNullable } = formControlShape(field);
      const validators = scalarValidators(field);
      if (validators.length) {
        usesValidators = true;
      }
      /** @type {string[]} */
      const optionParts = [];
      if (nonNullable) {
        optionParts.push('nonNullable: true');
      }
      if (validators.length) {
        optionParts.push(`validators: [${validators.join(', ')}]`);
      }
      const optionsPart = optionParts.length
        ? `, { ${optionParts.join(', ')} }`
        : '';
      return `    ${field.control}: new FormControl<${type}>(${initial}${optionsPart}),`;
    })
    .join('\n');

  const angularFormsImports = ['FormBuilder', 'FormControl', 'ReactiveFormsModule'];
  if (usesValidators) {
    angularFormsImports.push('Validators');
  }

  const optionInputs = ctx.fields
    .filter((field) => field.kind === 'relationship')
    .map(
      (field) =>
        `  readonly ${field.optionsInput} = input<LookupOption[]>([]);`,
    );
  const dedupedOptionInputs = Array.from(new Set(optionInputs)).join('\n');

  const enumMembers = ctx.enums
    .map((meta) => `  protected readonly ${meta.enumName}Options = ${meta.enumName}Options;`)
    .join('\n');

  const fieldBlocks = ctx.fields
    .map((field) => renderFormControlBlock(field))
    .join('\n\n');

  /** @type {string[]} */
  const modelImports = [`${ctx.Singular}`, `Create${ctx.Singular}Input`];
  const enumTypeImports = ctx.enums.map((meta) => meta.enumName);
  const enumValueImports = ctx.enums.map((meta) => `${meta.enumName}Options`);

  const lookupModelImport = usesLookupModel
    ? `import type { LookupOption } from "../../../../shared/models/lookup.model";\n`
    : '';

  const typeImportLine = `import type {\n  ${[...modelImports, ...enumTypeImports].join(',\n  ')},\n} from "../../models/${ctx.kebab}.model";`;
  const valueImportLine = enumValueImports.length
    ? `import { ${enumValueImports.join(', ')} } from "../../models/${ctx.kebab}.model";\n`
    : '';

  return `import { Component, effect, inject, input, output } from "@angular/core";
import { ${angularFormsImports.join(', ')} } from "@angular/forms";
${controlImportLines.length ? `${controlImportLines.join('\n')}\n` : ''}${lookupModelImport}${valueImportLine}${typeImportLine}

@Component({
  selector: "app-${ctx.kebab}-form",
  standalone: true,
  imports: [${componentImports.join(', ')}],
  template: \`
    <form class="flex max-w-2xl flex-col gap-4" [formGroup]="form" (ngSubmit)="submit()">
${fieldBlocks}

      <div class="mt-2 flex gap-3">
        <button
          type="submit"
          class="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          [disabled]="submitting()"
        >
          {{ submitting() ? "Saving..." : submitLabel() }}
        </button>
        <button
          type="button"
          class="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-800"
          [disabled]="submitting()"
          (click)="cancelled.emit()"
        >
          Cancel
        </button>
      </div>
    </form>
  \`,
})
export class ${ctx.Singular}FormComponent {
  private readonly fb = inject(FormBuilder);

  readonly model = input<${ctx.Singular} | null>(null);
  readonly submitting = input(false);
  readonly submitLabel = input("Save");
${dedupedOptionInputs ? `${dedupedOptionInputs}\n` : ''}
  readonly formSubmit = output<Create${ctx.Singular}Input>();
  readonly cancelled = output<void>();
${enumMembers ? `\n${enumMembers}\n` : ''}
  readonly form = this.fb.group({
${groupEntries}
  });

  constructor() {
    effect(() => {
      const current = this.model();
      if (current) {
        this.form.patchValue(current);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.formSubmit.emit(this.form.getRawValue() as unknown as Create${ctx.Singular}Input);
  }
}
`;
}

/**
 * @param {object} field
 */
function tableCellExpression(field) {
  if (field.kind === 'scalar' && field.type === 'boolean') {
    return `{{ item.${field.control} ? "Yes" : "No" }}`;
  }
  if (field.kind === 'relationship' && field.multiple) {
    return `{{ item.${field.control}.length }}`;
  }
  if ((field.kind === 'file' || field.kind === 'image') && field.multiple) {
    return `{{ item.${field.control}.length }}`;
  }
  if (field.kind === 'file' || field.kind === 'image') {
    return `{{ item.${field.control} ?? "—" }}`;
  }
  return `{{ item.${field.control} ?? "—" }}`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderTableComponent(ctx) {
  const columns = ctx.fields.slice(0, 4);
  const showActions = ctx.ops.update || ctx.ops.delete || ctx.ops.restore;

  const headerCells = columns
    .map(
      (field) =>
        `            <th scope="col" class="px-3 py-2 text-left font-medium">${field.label}</th>`,
    )
    .join('\n');

  const bodyCells = columns
    .map(
      (field) =>
        `              <td class="px-3 py-2">${tableCellExpression(field)}</td>`,
    )
    .join('\n');

  /** @type {string[]} */
  const actionButtons = [];
  if (ctx.ops.update) {
    actionButtons.push(`                <button
                  type="button"
                  class="text-sm text-zinc-900 underline"
                  (click)="edit.emit(item.id)"
                >
                  Edit
                </button>`);
  }
  if (ctx.ops.delete) {
    actionButtons.push(`                <button
                  type="button"
                  class="text-sm text-red-700 underline"
                  (click)="remove.emit(item.id)"
                >
                  Delete
                </button>`);
  }
  if (ctx.ops.restore) {
    actionButtons.push(`                <button
                  type="button"
                  class="text-sm text-zinc-700 underline"
                  (click)="restore.emit(item.id)"
                >
                  Restore
                </button>`);
  }

  const actionsHeader = showActions
    ? `            <th scope="col" class="px-3 py-2 text-right font-medium">Actions</th>`
    : '';

  const actionsCell = showActions
    ? `              <td class="px-3 py-2">
                <div class="flex justify-end gap-3">
${actionButtons.join('\n')}
                </div>
              </td>`
    : '';

  /** @type {string[]} */
  const outputs = [];
  if (ctx.ops.update) outputs.push('  readonly edit = output<string>();');
  if (ctx.ops.delete) outputs.push('  readonly remove = output<string>();');
  if (ctx.ops.restore) outputs.push('  readonly restore = output<string>();');

  return `import { Component, input, output } from "@angular/core";
import type { ${ctx.Singular} } from "../../models/${ctx.kebab}.model";

@Component({
  selector: "app-${ctx.kebab}-table",
  standalone: true,
  template: \`
    @if (items().length === 0) {
      <p class="rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-600">
        No ${ctx.enPlural.toLowerCase()} found.
      </p>
    } @else {
      <div class="overflow-x-auto rounded-md border border-zinc-200">
        <table class="min-w-full divide-y divide-zinc-200 text-sm">
          <thead class="bg-zinc-50 text-zinc-700">
            <tr>
${headerCells}
${actionsHeader}
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 bg-white text-zinc-900">
            @for (item of items(); track item.id) {
              <tr>
${bodyCells}
${actionsCell}
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  \`,
})
export class ${ctx.Singular}TableComponent {
  readonly items = input<${ctx.Singular}[]>([]);
${outputs.join('\n')}
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderFiltersComponent(ctx) {
  return `import { Component, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-${ctx.kebab}-filters",
  standalone: true,
  imports: [FormsModule],
  template: \`
    <form
      class="flex flex-wrap items-end gap-3"
      (ngSubmit)="apply()"
    >
      <label class="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm text-zinc-800">
        Search
        <input
          type="search"
          class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          placeholder="Search ${ctx.enPlural.toLowerCase()}..."
          [ngModel]="term()"
          (ngModelChange)="term.set($event)"
          name="search"
        />
      </label>
      <button
        type="submit"
        class="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
      >
        Apply
      </button>
    </form>
  \`,
})
export class ${ctx.Singular}FiltersComponent {
  protected readonly term = signal("");
  readonly search = output<string>();

  protected apply(): void {
    this.search.emit(this.term().trim());
  }
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderListPage(ctx) {
  const showActions = ctx.ops.update || ctx.ops.delete || ctx.ops.restore;

  /** @type {string[]} */
  const tableBindings = ['[items]="items()"'];
  if (ctx.ops.update) tableBindings.push('(edit)="edit($event)"');
  if (ctx.ops.delete) tableBindings.push('(remove)="remove($event)"');
  if (ctx.ops.restore) tableBindings.push('(restore)="restore($event)"');

  const createButton = ctx.ops.create
    ? `        <button
          type="button"
          class="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
          (click)="create()"
        >
          Create ${ctx.enSingular}
        </button>`
    : '';

  /** @type {string[]} */
  const methods = [];
  methods.push(`  private load(): void {
    this.store.dispatch(
      ${ctx.Singular}Actions.load${ctx.Plural}({
        query: {
          page: this.page,
          pageSize: this.pageSize,
          search: this.search ?? undefined,
        },
      }),
    );
  }`);
  methods.push(`  onSearch(term: string): void {
    this.search = term || null;
    this.page = 1;
    this.load();
  }`);
  methods.push(`  previous(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.load();
    }
  }`);
  methods.push(`  next(): void {
    this.page += 1;
    this.load();
  }`);
  if (ctx.ops.create) {
    methods.push(`  create(): void {
    void this.router.navigateByUrl("${ctx.listUrl}/create");
  }`);
  }
  if (ctx.ops.update) {
    methods.push(`  edit(id: string): void {
    void this.router.navigateByUrl(\`${ctx.listUrl}/\${id}/edit\`);
  }`);
  }
  if (ctx.ops.delete) {
    methods.push(`  remove(id: string): void {
    this.store.dispatch(${ctx.Singular}Actions.delete${ctx.Singular}({ id }));
  }`);
  }
  if (ctx.ops.restore) {
    methods.push(`  restore(id: string): void {
    this.store.dispatch(${ctx.Singular}Actions.restore${ctx.Singular}({ id }));
  }`);
  }

  const needsRouter = ctx.ops.create || ctx.ops.update;
  const routerImport = needsRouter
    ? `import { Router } from "@angular/router";\n`
    : '';
  const routerField = needsRouter
    ? `  private readonly router = inject(Router);\n`
    : '';

  return `import { Component, OnInit, inject } from "@angular/core";
${routerImport}import { Store } from "@ngrx/store";
import { ${ctx.Singular}FiltersComponent } from "../../components/${ctx.kebab}-filters/${ctx.kebab}-filters.component";
import { ${ctx.Singular}TableComponent } from "../../components/${ctx.kebab}-table/${ctx.kebab}-table.component";
import { ${ctx.Singular}Actions } from "../../store/${ctx.kebab}.actions";
import {
  select${ctx.Singular}Error,
  select${ctx.Singular}Items,
  select${ctx.Singular}Pagination,
} from "../../store/${ctx.kebab}.selectors";

@Component({
  selector: "app-${ctx.kebabPlural}-page",
  standalone: true,
  imports: [${ctx.Singular}FiltersComponent, ${ctx.Singular}TableComponent],
  template: \`
    <main class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-semibold text-zinc-900">${ctx.enPlural}</h1>
          <p class="mt-1 text-sm text-zinc-600">
            Manage ${ctx.enPlural.toLowerCase()} with search, pagination, and CRUD actions.
          </p>
        </div>
${createButton}
      </header>

      <app-${ctx.kebab}-filters (search)="onSearch($event)" />

      @if (error(); as message) {
        <p class="text-sm text-red-600" role="alert">{{ message }}</p>
      }

      <app-${ctx.kebab}-table
        ${tableBindings.join('\n        ')}
      />

      @if (pagination(); as page) {
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-700">
          <p>
            Page {{ page.currentPage }} of {{ page.totalPages }} · {{ page.totalCount }} total
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
              [disabled]="!page.hasPreviousPage"
              (click)="previous()"
            >
              Previous
            </button>
            <button
              type="button"
              class="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
              [disabled]="!page.hasNextPage"
              (click)="next()"
            >
              Next
            </button>
          </div>
        </div>
      }
    </main>
  \`,
})
export class ${ctx.Plural}PageComponent implements OnInit {
  private readonly store = inject(Store);
${routerField}
  readonly items = this.store.selectSignal(select${ctx.Singular}Items);
  readonly pagination = this.store.selectSignal(select${ctx.Singular}Pagination);
  readonly error = this.store.selectSignal(select${ctx.Singular}Error);

  private page = 1;
  private readonly pageSize = 10;
  private search: string | null = null;

  ngOnInit(): void {
    this.load();
  }

${methods.join('\n\n')}
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderCreatePage(ctx) {
  return `import { Component, computed, inject } from "@angular/core";
import { Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { ${ctx.Singular}FormComponent } from "../../components/${ctx.kebab}-form/${ctx.kebab}-form.component";
import { ${ctx.Singular}Actions } from "../../store/${ctx.kebab}.actions";
import { select${ctx.Singular}Status } from "../../store/${ctx.kebab}.selectors";
import type { Create${ctx.Singular}Input } from "../../models/${ctx.kebab}.model";

@Component({
  selector: "app-create-${ctx.kebab}-page",
  standalone: true,
  imports: [${ctx.Singular}FormComponent],
  template: \`
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 class="text-3xl font-semibold text-zinc-900">Create ${ctx.enSingular}</h1>
        <p class="mt-1 text-sm text-zinc-600">
          Fill in the fields below to create a new ${ctx.enSingular.toLowerCase()}.
        </p>
      </header>

      <app-${ctx.kebab}-form
        submitLabel="Create ${ctx.enSingular}"
        [submitting]="submitting()"
        (formSubmit)="save($event)"
        (cancelled)="cancel()"
      />
    </main>
  \`,
})
export class Create${ctx.Singular}PageComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  private readonly status = this.store.selectSignal(select${ctx.Singular}Status);
  readonly submitting = computed(() => this.status() === "loading");

  save(input: Create${ctx.Singular}Input): void {
    this.store.dispatch(${ctx.Singular}Actions.create${ctx.Singular}({ input }));
    void this.router.navigateByUrl("${ctx.listUrl}");
  }

  cancel(): void {
    void this.router.navigateByUrl("${ctx.listUrl}");
  }
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderEditPage(ctx) {
  return `import { Component, OnInit, computed, inject } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Store } from "@ngrx/store";
import { ${ctx.Singular}FormComponent } from "../../components/${ctx.kebab}-form/${ctx.kebab}-form.component";
import { ${ctx.Singular}Actions } from "../../store/${ctx.kebab}.actions";
import {
  select${ctx.Singular}Status,
  selectSelected${ctx.Singular},
} from "../../store/${ctx.kebab}.selectors";
import type { Create${ctx.Singular}Input } from "../../models/${ctx.kebab}.model";

@Component({
  selector: "app-edit-${ctx.kebab}-page",
  standalone: true,
  imports: [${ctx.Singular}FormComponent],
  template: \`
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 class="text-3xl font-semibold text-zinc-900">Edit ${ctx.enSingular}</h1>
        <p class="mt-1 text-sm text-zinc-600">
          Update the ${ctx.enSingular.toLowerCase()} and save your changes.
        </p>
      </header>

      @if (selected(); as current) {
        <app-${ctx.kebab}-form
          [model]="current"
          submitLabel="Save changes"
          [submitting]="submitting()"
          (formSubmit)="save($event)"
          (cancelled)="cancel()"
        />
      } @else {
        <p class="text-sm text-zinc-600">Loading ${ctx.enSingular.toLowerCase()}...</p>
      }
    </main>
  \`,
})
export class Edit${ctx.Singular}PageComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly id = this.route.snapshot.paramMap.get("id") ?? "";
  private readonly status = this.store.selectSignal(select${ctx.Singular}Status);

  readonly selected = this.store.selectSignal(selectSelected${ctx.Singular});
  readonly submitting = computed(() => this.status() === "loading");

  ngOnInit(): void {
    if (this.id) {
      this.store.dispatch(${ctx.Singular}Actions.load${ctx.Singular}ById({ id: this.id }));
    }
  }

  save(input: Create${ctx.Singular}Input): void {
    const current = this.selected();
    if (!current) {
      return;
    }

    this.store.dispatch(
      ${ctx.Singular}Actions.update${ctx.Singular}({
        input: { ...input, id: current.id, rowVersion: current.rowVersion },
      }),
    );
    void this.router.navigateByUrl("${ctx.listUrl}");
  }

  cancel(): void {
    void this.router.navigateByUrl("${ctx.listUrl}");
  }
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderRoutes(ctx) {
  /** @type {string[]} */
  const imports = [
    `import { Routes } from "@angular/router";`,
    `import { provideEffects } from "@ngrx/effects";`,
    `import { provideState } from "@ngrx/store";`,
    `import { ${ctx.Plural}PageComponent } from "./pages/${ctx.kebabPlural}-page/${ctx.kebabPlural}-page.component";`,
  ];
  if (ctx.ops.create) {
    imports.push(
      `import { Create${ctx.Singular}PageComponent } from "./pages/create-${ctx.kebab}-page/create-${ctx.kebab}-page.component";`,
    );
  }
  if (ctx.ops.update) {
    imports.push(
      `import { Edit${ctx.Singular}PageComponent } from "./pages/edit-${ctx.kebab}-page/edit-${ctx.kebab}-page.component";`,
    );
  }
  imports.push(
    `import { ${ctx.Singular}Effects } from "./store/${ctx.kebab}.effects";`,
  );
  imports.push(
    `import { ${ctx.featureKey}Reducer } from "./store/${ctx.kebab}.reducer";`,
  );
  imports.push(
    `import { ${ctx.featureKey}FeatureKey } from "./store/${ctx.kebab}.state";`,
  );

  /** @type {string[]} */
  const children = [`      { path: "", component: ${ctx.Plural}PageComponent },`];
  if (ctx.ops.create) {
    children.push(
      `      { path: "create", component: Create${ctx.Singular}PageComponent },`,
    );
  }
  if (ctx.ops.update) {
    children.push(
      `      { path: ":id/edit", component: Edit${ctx.Singular}PageComponent },`,
    );
  }

  return `${imports.join('\n')}

export const ${ctx.featureKey}Routes: Routes = [
  {
    path: "",
    providers: [
      provideState(${ctx.featureKey}FeatureKey, ${ctx.featureKey}Reducer),
      provideEffects(${ctx.Singular}Effects),
    ],
    children: [
${children.join('\n')}
    ],
  },
];
`;
}
