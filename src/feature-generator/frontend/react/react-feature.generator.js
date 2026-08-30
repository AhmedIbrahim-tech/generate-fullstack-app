import path from 'node:path';
import { describeField } from './field-view.js';

/**
 * Plan every file that makes up a React feature module under Client/.
 * @param {object} config
 * @returns {{ relativePath: string, contents: string }[]}
 */
export function planReactModuleFiles(config) {
  const ctx = buildContext(config);
  const base = path.join('Client', 'src', 'modules', ctx.kebabPlural);
  /** @type {{ relativePath: string, contents: string }[]} */
  const files = [];

  files.push({
    relativePath: path.join(base, 'types', `${ctx.camel}.types.ts`),
    contents: renderTypes(ctx),
  });
  files.push({
    relativePath: path.join(base, 'schemas', `${ctx.camel}.schema.ts`),
    contents: renderSchema(ctx),
  });
  files.push({
    relativePath: path.join(base, 'services', `${ctx.camel}.routes.ts`),
    contents: renderRoutes(ctx),
  });
  files.push({
    relativePath: path.join(base, 'services', `${ctx.camel}.service.ts`),
    contents: renderService(ctx),
  });

  if (ctx.ops.search || ctx.ops.list) {
    files.push({
      relativePath: path.join(base, 'slices', 'thunks', `get${ctx.Plural}.thunk.ts`),
      contents: renderGetListThunk(ctx),
    });
  }
  if (ctx.ops.getById) {
    files.push({
      relativePath: path.join(base, 'slices', 'thunks', `get${ctx.Singular}ById.thunk.ts`),
      contents: renderGetByIdThunk(ctx),
    });
  }
  if (ctx.ops.create) {
    files.push({
      relativePath: path.join(base, 'slices', 'thunks', `create${ctx.Singular}.thunk.ts`),
      contents: renderCreateThunk(ctx),
    });
  }
  if (ctx.ops.update) {
    files.push({
      relativePath: path.join(base, 'slices', 'thunks', `update${ctx.Singular}.thunk.ts`),
      contents: renderUpdateThunk(ctx),
    });
  }
  if (ctx.ops.delete) {
    files.push({
      relativePath: path.join(base, 'slices', 'thunks', `delete${ctx.Singular}.thunk.ts`),
      contents: renderDeleteThunk(ctx),
    });
  }
  if (ctx.ops.restore) {
    files.push({
      relativePath: path.join(base, 'slices', 'thunks', `restore${ctx.Singular}.thunk.ts`),
      contents: renderRestoreThunk(ctx),
    });
  }

  files.push({
    relativePath: path.join(base, 'slices', `${ctx.camelPlural}.slice.ts`),
    contents: renderSlice(ctx),
  });
  files.push({
    relativePath: path.join(base, 'hooks', `use${ctx.Singular}Form.ts`),
    contents: renderFormHook(ctx),
  });
  files.push({
    relativePath: path.join(base, 'hooks', `use${ctx.Plural}Controller.ts`),
    contents: renderControllerHook(ctx),
  });
  files.push({
    relativePath: path.join(base, 'components', `${ctx.Singular}Form.tsx`),
    contents: renderFormComponent(ctx),
  });
  files.push({
    relativePath: path.join(base, 'components', `${ctx.Singular}Table.tsx`),
    contents: renderTableComponent(ctx),
  });
  files.push({
    relativePath: path.join(base, 'components', `${ctx.Singular}Filters.tsx`),
    contents: renderFiltersComponent(ctx),
  });
  files.push({
    relativePath: path.join(base, 'pages', `${ctx.Plural}Page.tsx`),
    contents: renderListPage(ctx),
  });
  if (ctx.ops.create) {
    files.push({
      relativePath: path.join(base, 'pages', `Create${ctx.Singular}Page.tsx`),
      contents: renderCreatePage(ctx),
    });
  }
  if (ctx.ops.update) {
    files.push({
      relativePath: path.join(base, 'pages', `Edit${ctx.Singular}Page.tsx`),
      contents: renderEditPage(ctx),
    });
  }
  files.push({
    relativePath: path.join(base, 'index.ts'),
    contents: renderIndex(ctx),
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

  const framework = config.frontendStrategy?.framework === 'vite' ? 'vite' : 'next';
  const ops = config.operations;
  const fields = (config.fields ?? []).map((field) => describeField(field));

  const needsStoredFile = fields.some((field) => field.needsStoredFile);
  const enumDecls = fields
    .filter((field) => field.enumDecl)
    .map((field) => field.enumDecl);
  const enumOptionConsts = fields
    .filter((field) => field.optionsConst)
    .map((field) => field.optionsConst);

  return {
    Singular,
    Plural,
    camel,
    camelPlural,
    kebab,
    kebabPlural,
    ops,
    fields,
    framework,
    needsStoredFile,
    enumDecls,
    enumOptionConsts,
    enSingular: config.labels?.enSingular ?? Singular,
    enPlural: config.labels?.enPlural ?? Plural,
    surface: config.surface ?? { dashboard: true, public: false },
  };
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 * @param {{ needParams?: boolean, needLink?: boolean }} [options]
 */
function navHelpers(ctx, options = {}) {
  const needParams = options.needParams === true;
  const needLink = options.needLink === true;

  if (ctx.framework === 'next') {
    /** @type {string[]} */
    const importLines = [];
    if (needLink) {
      importLines.push('import Link from "next/link";');
    }
    const navImports = ['useRouter'];
    if (needParams) {
      navImports.unshift('useParams');
    }
    importLines.push(
      `import { ${navImports.join(', ')} } from "next/navigation";`,
    );

    return {
      imports: importLines.join('\n'),
      linkProp: 'href',
      useNavSetup: needParams
        ? `const router = useRouter();
  const params = useParams<{ id: string }>();`
        : 'const router = useRouter();',
      push: (expr) => `router.push(${expr})`,
      idExpr: 'String(params?.id ?? "")',
    };
  }

  /** @type {string[]} */
  const rrImports = ['useNavigate'];
  if (needLink) {
    rrImports.unshift('Link');
  }
  if (needParams) {
    rrImports.push('useParams');
  }

  return {
    imports: `import { ${rrImports.join(', ')} } from "react-router-dom";`,
    linkProp: 'to',
    useNavSetup: needParams
      ? `const navigate = useNavigate();
  const params = useParams<{ id: string }>();`
      : 'const navigate = useNavigate();',
    push: (expr) => `navigate(${expr})`,
    idExpr: 'String(params?.id ?? "")',
  };
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderTypes(ctx) {
  const fieldLines = ctx.fields.flatMap((field) => field.readLines).join('\n');
  const createFields = ctx.fields.flatMap((field) => field.requestLines).join('\n');
  const updateFields = [
    '  id: string;',
    '  rowVersion: string;',
    ...ctx.fields.flatMap((field) => field.requestLines),
  ].join('\n');

  /** @type {string[]} */
  const parts = [];

  if (ctx.needsStoredFile) {
    parts.push(
      'import type { StoredFileDto } from "@/shared/types/stored-file.types";\n',
    );
  }

  if (ctx.enumDecls.length > 0) {
    parts.push(ctx.enumDecls.join('\n\n'));
  }

  parts.push(`export type ${ctx.Singular} = {
  id: string;
${fieldLines}
  createdAtUtc: string;
  updatedAtUtc: string | null;
  rowVersion: string;
};`);

  if (ctx.ops.search || ctx.ops.list || ctx.ops.pagination) {
    parts.push(`export type ${ctx.Singular}SearchRequest = {
  page: number;
  pageSize: number;
  searchTerm?: string | null;
  sortBy?: string | null;
  sortDirection?: string | null;
};`);
  }

  if (ctx.ops.create) {
    parts.push(`export type Create${ctx.Singular}Request = {
${createFields}
};`);
  }

  if (ctx.ops.update) {
    parts.push(`export type Update${ctx.Singular}Request = {
${updateFields}
};`);
  }

  return `${parts.join('\n\n')}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderSchema(ctx) {
  const createFields = ctx.fields.flatMap((field) => field.schemaLines).join('\n');

  /** @type {string[]} */
  const parts = [`import { z } from "zod";`, ''];

  if (ctx.ops.search || ctx.ops.list) {
    parts.push(`export const ${ctx.camel}SearchSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  searchTerm: z.string().optional().nullable(),
  sortBy: z.string().optional().nullable(),
  sortDirection: z.string().optional().nullable(),
});
`);
  }

  if (ctx.ops.create || ctx.ops.update) {
    parts.push(`export const create${ctx.Singular}Schema = z.object({
${createFields}
});
`);
  }

  if (ctx.ops.update) {
    parts.push(`export const update${ctx.Singular}Schema = create${ctx.Singular}Schema.extend({
  id: z.string().uuid(),
  rowVersion: z.string().min(1),
});
`);
  }

  if (ctx.ops.create || ctx.ops.update) {
    parts.push(`export type Create${ctx.Singular}FormValues = z.infer<typeof create${ctx.Singular}Schema>;`);
  }
  if (ctx.ops.update) {
    parts.push(`export type Update${ctx.Singular}FormValues = z.infer<typeof update${ctx.Singular}Schema>;`);
  }
  if (ctx.ops.search || ctx.ops.list) {
    parts.push(`export type ${ctx.Singular}SearchFormValues = z.infer<typeof ${ctx.camel}SearchSchema>;`);
  }

  return `${parts.join('\n')}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderRoutes(ctx) {
  /** @type {string[]} */
  const apiLines = [`  root: "/api/v1/${ctx.Plural}",`];
  if (ctx.ops.search || ctx.ops.list) {
    apiLines.push(`  search: "/api/v1/${ctx.Plural}/Search",`);
  }
  apiLines.push(`  byId: (id: string) => \`/api/v1/${ctx.Plural}/\${id}\`,`);
  if (ctx.ops.restore) {
    apiLines.push(`  restore: (id: string) => \`/api/v1/${ctx.Plural}/\${id}/Restore\`,`);
  }

  return `export const ${ctx.camel}ApiRoutes = {
${apiLines.join('\n')}
} as const;

export const ${ctx.camel}AppRoutes = {
  dashboard: {
    list: "/dashboard/${ctx.kebabPlural}",
    create: "/dashboard/${ctx.kebabPlural}/create",
    edit: (id: string) => \`/dashboard/${ctx.kebabPlural}/\${id}/edit\`,
  },
  public: {
    list: "/${ctx.kebabPlural}",
    detail: (id: string) => \`/${ctx.kebabPlural}/\${id}\`,
  },
} as const;
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderService(ctx) {
  /** @type {string[]} */
  const typeImports = [ctx.Singular];
  if (ctx.ops.search || ctx.ops.list) typeImports.push(`${ctx.Singular}SearchRequest`);
  if (ctx.ops.create) typeImports.push(`Create${ctx.Singular}Request`);
  if (ctx.ops.update) typeImports.push(`Update${ctx.Singular}Request`);

  /** @type {string[]} */
  const methods = [];

  if (ctx.ops.search || ctx.ops.list) {
    methods.push(`  async search(
    request: ${ctx.Singular}SearchRequest,
  ): Promise<PaginationResult<${ctx.Singular}>> {
    const response = await apiClient.post<PaginationResult<${ctx.Singular}>>(
      ${ctx.camel}ApiRoutes.search,
      request,
    );
    return normalizePagination(response.data);
  },`);
  }

  if (ctx.ops.getById) {
    methods.push(`  async getById(id: string): Promise<${ctx.Singular}> {
    const response = await apiClient.get<${ctx.Singular}>(${ctx.camel}ApiRoutes.byId(id));
    return response.data;
  },`);
  }

  if (ctx.ops.create) {
    methods.push(`  async create(input: Create${ctx.Singular}Request): Promise<${ctx.Singular}> {
    const response = await apiClient.post<${ctx.Singular}>(${ctx.camel}ApiRoutes.root, input);
    return response.data;
  },`);
  }

  if (ctx.ops.update) {
    methods.push(`  async update(input: Update${ctx.Singular}Request): Promise<${ctx.Singular}> {
    const response = await apiClient.put<${ctx.Singular}>(
      ${ctx.camel}ApiRoutes.byId(input.id),
      input,
    );
    return response.data;
  },`);
  }

  if (ctx.ops.delete) {
    methods.push(`  async delete(id: string): Promise<void> {
    await apiClient.delete(${ctx.camel}ApiRoutes.byId(id));
  },`);
  }

  if (ctx.ops.restore) {
    methods.push(`  async restore(id: string): Promise<${ctx.Singular}> {
    const response = await apiClient.post<${ctx.Singular}>(${ctx.camel}ApiRoutes.restore(id));
    return response.data;
  },`);
  }

  const paginationImport =
    ctx.ops.search || ctx.ops.list
      ? `import {
  normalizePagination,
  type PaginationResult,
} from "@/shared/state/pagination/pagination.types";
`
      : '';

  return `import { apiClient } from "@/lib/api/api-client";
${paginationImport}import { ${ctx.camel}ApiRoutes } from "./${ctx.camel}.routes";
import type {
  ${typeImports.join(',\n  ')},
} from "../types/${ctx.camel}.types";

export const ${ctx.camel}Service = {
${methods.join('\n\n')}
};
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderGetListThunk(ctx) {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
import { ${ctx.camel}Service } from "../../services/${ctx.camel}.service";
import type {
  ${ctx.Singular},
  ${ctx.Singular}SearchRequest,
} from "../../types/${ctx.camel}.types";

export const get${ctx.Plural} = createAsyncThunk<
  PaginationResult<${ctx.Singular}>,
  ${ctx.Singular}SearchRequest,
  { rejectValue: string }
>("${ctx.camelPlural}/get${ctx.Plural}", async (request, { rejectWithValue }) => {
  try {
    return await ${ctx.camel}Service.search(request);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderGetByIdThunk(ctx) {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { ${ctx.camel}Service } from "../../services/${ctx.camel}.service";
import type { ${ctx.Singular} } from "../../types/${ctx.camel}.types";

export const get${ctx.Singular}ById = createAsyncThunk<
  ${ctx.Singular},
  string,
  { rejectValue: string }
>("${ctx.camelPlural}/get${ctx.Singular}ById", async (id, { rejectWithValue }) => {
  try {
    return await ${ctx.camel}Service.getById(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderCreateThunk(ctx) {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { ${ctx.camel}Service } from "../../services/${ctx.camel}.service";
import type {
  Create${ctx.Singular}Request,
  ${ctx.Singular},
} from "../../types/${ctx.camel}.types";

export const create${ctx.Singular} = createAsyncThunk<
  ${ctx.Singular},
  Create${ctx.Singular}Request,
  { rejectValue: string }
>("${ctx.camelPlural}/create${ctx.Singular}", async (input, { rejectWithValue }) => {
  try {
    return await ${ctx.camel}Service.create(input);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderUpdateThunk(ctx) {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { ${ctx.camel}Service } from "../../services/${ctx.camel}.service";
import type {
  ${ctx.Singular},
  Update${ctx.Singular}Request,
} from "../../types/${ctx.camel}.types";

export const update${ctx.Singular} = createAsyncThunk<
  ${ctx.Singular},
  Update${ctx.Singular}Request,
  { rejectValue: string }
>("${ctx.camelPlural}/update${ctx.Singular}", async (input, { rejectWithValue }) => {
  try {
    return await ${ctx.camel}Service.update(input);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderDeleteThunk(ctx) {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { ${ctx.camel}Service } from "../../services/${ctx.camel}.service";

export const delete${ctx.Singular} = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>("${ctx.camelPlural}/delete${ctx.Singular}", async (id, { rejectWithValue }) => {
  try {
    await ${ctx.camel}Service.delete(id);
    return id;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderRestoreThunk(ctx) {
  return `import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { ${ctx.camel}Service } from "../../services/${ctx.camel}.service";
import type { ${ctx.Singular} } from "../../types/${ctx.camel}.types";

export const restore${ctx.Singular} = createAsyncThunk<
  ${ctx.Singular},
  string,
  { rejectValue: string }
>("${ctx.camelPlural}/restore${ctx.Singular}", async (id, { rejectWithValue }) => {
  try {
    return await ${ctx.camel}Service.restore(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderSlice(ctx) {
  /** @type {string[]} */
  const thunkImports = [];
  if (ctx.ops.search || ctx.ops.list) {
    thunkImports.push(`import { get${ctx.Plural} } from "./thunks/get${ctx.Plural}.thunk";`);
  }
  if (ctx.ops.getById) {
    thunkImports.push(`import { get${ctx.Singular}ById } from "./thunks/get${ctx.Singular}ById.thunk";`);
  }
  if (ctx.ops.create) {
    thunkImports.push(`import { create${ctx.Singular} } from "./thunks/create${ctx.Singular}.thunk";`);
  }
  if (ctx.ops.update) {
    thunkImports.push(`import { update${ctx.Singular} } from "./thunks/update${ctx.Singular}.thunk";`);
  }
  if (ctx.ops.delete) {
    thunkImports.push(`import { delete${ctx.Singular} } from "./thunks/delete${ctx.Singular}.thunk";`);
  }
  if (ctx.ops.restore) {
    thunkImports.push(`import { restore${ctx.Singular} } from "./thunks/restore${ctx.Singular}.thunk";`);
  }

  /** @type {string[]} */
  const cases = [];

  if (ctx.ops.search || ctx.ops.list) {
    cases.push(`      .addCase(get${ctx.Plural}.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(get${ctx.Plural}.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.data;
        state.pagination = action.payload;
      })
      .addCase(get${ctx.Plural}.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Unable to load ${ctx.enPlural.toLowerCase()}";
      })`);
  }

  if (ctx.ops.getById) {
    cases.push(`      .addCase(get${ctx.Singular}ById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(get${ctx.Singular}ById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selected = action.payload;
      })
      .addCase(get${ctx.Singular}ById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Unable to load ${ctx.enSingular.toLowerCase()}";
      })`);
  }

  if (ctx.ops.create) {
    cases.push(`      .addCase(create${ctx.Singular}.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(create${ctx.Singular}.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.items = [action.payload, ...state.items];
        state.selected = action.payload;
      })
      .addCase(create${ctx.Singular}.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload ?? "Unable to create ${ctx.enSingular.toLowerCase()}";
      })`);
  }

  if (ctx.ops.update) {
    cases.push(`      .addCase(update${ctx.Singular}.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(update${ctx.Singular}.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.selected = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
      })
      .addCase(update${ctx.Singular}.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload ?? "Unable to update ${ctx.enSingular.toLowerCase()}";
      })`);
  }

  if (ctx.ops.delete) {
    cases.push(`      .addCase(delete${ctx.Singular}.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(delete${ctx.Singular}.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selected?.id === action.payload) {
          state.selected = null;
        }
      })
      .addCase(delete${ctx.Singular}.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload ?? "Unable to delete ${ctx.enSingular.toLowerCase()}";
      })`);
  }

  if (ctx.ops.restore) {
    cases.push(`      .addCase(restore${ctx.Singular}.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(restore${ctx.Singular}.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.selected = action.payload;
        const exists = state.items.some((item) => item.id === action.payload.id);
        state.items = exists
          ? state.items.map((item) =>
              item.id === action.payload.id ? action.payload : item,
            )
          : [action.payload, ...state.items];
      })
      .addCase(restore${ctx.Singular}.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload ?? "Unable to restore ${ctx.enSingular.toLowerCase()}";
      })`);
  }

  const paginationImport =
    ctx.ops.search || ctx.ops.list
      ? `import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
`
      : '';

  const paginationField =
    ctx.ops.search || ctx.ops.list
      ? `  pagination: PaginationResult<${ctx.Singular}> | null;
`
      : '';

  const paginationInitial =
    ctx.ops.search || ctx.ops.list
      ? `  pagination: null,
`
      : '';

  return `import { createSlice } from "@reduxjs/toolkit";
${paginationImport}import type { ${ctx.Singular} } from "../types/${ctx.camel}.types";
${thunkImports.join('\n')}

type ${ctx.Singular}State = {
  items: ${ctx.Singular}[];
  selected: ${ctx.Singular} | null;
${paginationField}  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
};

const initialState: ${ctx.Singular}State = {
  items: [],
  selected: null,
${paginationInitial}  isLoading: false,
  isSubmitting: false,
  error: null,
};

const ${ctx.camelPlural}Slice = createSlice({
  name: "${ctx.camelPlural}",
  initialState,
  reducers: {
    clear${ctx.Singular}Error(state) {
      state.error = null;
    },
    clearSelected${ctx.Singular}(state) {
      state.selected = null;
    },
  },
  extraReducers: (builder) => {
    builder
${cases.join('\n')};
  },
});

export const { clear${ctx.Singular}Error, clearSelected${ctx.Singular} } = ${ctx.camelPlural}Slice.actions;
export default ${ctx.camelPlural}Slice.reducer;
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderFormHook(ctx) {
  if (!ctx.ops.create && !ctx.ops.update) {
    return `"use client";

export function use${ctx.Singular}Form() {
  return null;
}
`;
  }

  const defaults = ctx.fields.flatMap((field) => field.defaultLines).join('\n');

  return `"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  create${ctx.Singular}Schema,
  type Create${ctx.Singular}FormValues,
} from "../schemas/${ctx.camel}.schema";

const defaultValues: Create${ctx.Singular}FormValues = {
${defaults}
};

export function use${ctx.Singular}Form(
  initialValues?: Partial<Create${ctx.Singular}FormValues>,
) {
  return useForm<Create${ctx.Singular}FormValues>({
    resolver: zodResolver(create${ctx.Singular}Schema),
    defaultValues: {
      ...defaultValues,
      ...initialValues,
    },
  });
}

export { defaultValues as ${ctx.camel}FormDefaults };
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderControllerHook(ctx) {
  /** @type {string[]} */
  const thunkImports = [];
  if (ctx.ops.search || ctx.ops.list) {
    thunkImports.push(`import { get${ctx.Plural} } from "../slices/thunks/get${ctx.Plural}.thunk";`);
  }
  if (ctx.ops.getById) {
    thunkImports.push(`import { get${ctx.Singular}ById } from "../slices/thunks/get${ctx.Singular}ById.thunk";`);
  }
  if (ctx.ops.create) {
    thunkImports.push(`import { create${ctx.Singular} } from "../slices/thunks/create${ctx.Singular}.thunk";`);
  }
  if (ctx.ops.update) {
    thunkImports.push(`import { update${ctx.Singular} } from "../slices/thunks/update${ctx.Singular}.thunk";`);
  }
  if (ctx.ops.delete) {
    thunkImports.push(`import { delete${ctx.Singular} } from "../slices/thunks/delete${ctx.Singular}.thunk";`);
  }
  if (ctx.ops.restore) {
    thunkImports.push(`import { restore${ctx.Singular} } from "../slices/thunks/restore${ctx.Singular}.thunk";`);
  }

  /** @type {string[]} */
  const typeImports = [];
  if (ctx.ops.search || ctx.ops.list) typeImports.push(`${ctx.Singular}SearchRequest`);
  if (ctx.ops.create) typeImports.push(`Create${ctx.Singular}Request`);
  if (ctx.ops.update) typeImports.push(`Update${ctx.Singular}Request`);

  /** @type {string[]} */
  const callbacks = [];
  /** @type {string[]} */
  const returns = [
    '    items',
    '    selected',
    ...(ctx.ops.search || ctx.ops.list ? ['    pagination'] : []),
    '    isLoading',
    '    isSubmitting',
    '    error',
  ];

  if (ctx.ops.search || ctx.ops.list) {
    callbacks.push(`  const load = useCallback(
    (request: ${ctx.Singular}SearchRequest) => {
      void dispatch(get${ctx.Plural}(request));
    },
    [dispatch],
  );`);
    returns.push('    load');
  }

  if (ctx.ops.getById) {
    callbacks.push(`  const loadById = useCallback(
    (id: string) => {
      void dispatch(get${ctx.Singular}ById(id));
    },
    [dispatch],
  );`);
    returns.push('    loadById');
  }

  if (ctx.ops.create) {
    callbacks.push(`  const create = useCallback(
    async (input: Create${ctx.Singular}Request) => {
      const result = await dispatch(create${ctx.Singular}(input));
      if (create${ctx.Singular}.fulfilled.match(result)) {
        notify.success("${ctx.enSingular} created");
        return result.payload;
      }
      notify.error(result.payload ?? "Unable to create ${ctx.enSingular.toLowerCase()}");
      return null;
    },
    [dispatch],
  );`);
    returns.push('    create');
  }

  if (ctx.ops.update) {
    callbacks.push(`  const update = useCallback(
    async (input: Update${ctx.Singular}Request) => {
      const result = await dispatch(update${ctx.Singular}(input));
      if (update${ctx.Singular}.fulfilled.match(result)) {
        notify.success("${ctx.enSingular} updated");
        return result.payload;
      }
      notify.error(result.payload ?? "Unable to update ${ctx.enSingular.toLowerCase()}");
      return null;
    },
    [dispatch],
  );`);
    returns.push('    update');
  }

  if (ctx.ops.delete) {
    callbacks.push(`  const remove = useCallback(
    async (id: string) => {
      const confirmed = await confirm(
        "Delete ${ctx.enSingular}",
        "Are you sure you want to delete this ${ctx.enSingular.toLowerCase()}? This action can be undone if restore is available.",
      );
      if (!confirmed) {
        return false;
      }

      const result = await dispatch(delete${ctx.Singular}(id));
      if (delete${ctx.Singular}.fulfilled.match(result)) {
        notify.success("${ctx.enSingular} deleted");
        return true;
      }
      notify.error(result.payload ?? "Unable to delete ${ctx.enSingular.toLowerCase()}");
      return false;
    },
    [confirm, dispatch],
  );`);
    returns.push('    remove', '    dialog');
  }

  if (ctx.ops.restore) {
    callbacks.push(`  const restore = useCallback(
    async (id: string) => {
      const result = await dispatch(restore${ctx.Singular}(id));
      if (restore${ctx.Singular}.fulfilled.match(result)) {
        notify.success("${ctx.enSingular} restored");
        return result.payload;
      }
      notify.error(result.payload ?? "Unable to restore ${ctx.enSingular.toLowerCase()}");
      return null;
    },
    [dispatch],
  );`);
    returns.push('    restore');
  }

  const confirmImport = ctx.ops.delete
    ? `import { useConfirmDialog } from "@/shared/components/ConfirmDialog";
`
    : '';

  const confirmSetup = ctx.ops.delete
    ? `  const { confirm, dialog } = useConfirmDialog();
`
    : '';

  const typeImportBlock =
    typeImports.length > 0
      ? `import type {
  ${typeImports.join(',\n  ')},
} from "../types/${ctx.camel}.types";
`
      : '';

  const stateSelect = [
    'items',
    'selected',
    ...(ctx.ops.search || ctx.ops.list ? ['pagination'] : []),
    'isLoading',
    'isSubmitting',
    'error',
  ].join(', ');

  return `"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { notify } from "@/shared/utils/toast";
${confirmImport}${thunkImports.join('\n')}
${typeImportBlock}
export function use${ctx.Plural}Controller() {
  const dispatch = useAppDispatch();
${confirmSetup}  const { ${stateSelect} } = useAppSelector(
    (state) => state.${ctx.camelPlural},
  );

${callbacks.join('\n\n')}

  return {
${returns.join(',\n')},
  };
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderFormComponent(ctx) {
  const fields = ctx.fields.map((field) => field.formNode).join('\n\n');

  const needsController = ctx.fields.some((field) => field.controls.controller);
  const needsLookup = ctx.fields.some((field) => field.controls.lookupSelect);
  const needsMultiLookup = ctx.fields.some((field) => field.controls.multiLookupSelect);
  const needsEnum = ctx.fields.some((field) => field.controls.enumSelect);
  const needsImage = ctx.fields.some((field) => field.controls.imageUpload);
  const needsFile = ctx.fields.some((field) => field.controls.fileUpload);

  const rhfImport = needsController
    ? `import { Controller, type UseFormReturn } from "react-hook-form";`
    : `import type { UseFormReturn } from "react-hook-form";`;

  /** @type {string[]} */
  const controlImports = [];
  if (needsLookup) {
    controlImports.push(
      'import { LookupSelect } from "@/shared/components/forms/LookupSelect";',
    );
  }
  if (needsMultiLookup) {
    controlImports.push(
      'import { MultiLookupSelect } from "@/shared/components/forms/MultiLookupSelect";',
    );
  }
  if (needsEnum) {
    controlImports.push(
      'import { EnumSelect } from "@/shared/components/forms/EnumSelect";',
    );
  }
  if (needsImage) {
    controlImports.push(
      'import { ImageUploadField } from "@/shared/components/forms/ImageUploadField";',
    );
  }
  if (needsFile) {
    controlImports.push(
      'import { FileUploadField } from "@/shared/components/forms/FileUploadField";',
    );
  }

  const enumOptionImport =
    ctx.enumOptionConsts.length > 0
      ? `import { ${ctx.enumOptionConsts.join(', ')} } from "../types/${ctx.camel}.types";\n`
      : '';

  const controlImportBlock =
    controlImports.length > 0 ? `${controlImports.join('\n')}\n` : '';

  return `"use client";

${rhfImport}
${controlImportBlock}${enumOptionImport}import type { Create${ctx.Singular}FormValues } from "../schemas/${ctx.camel}.schema";

type ${ctx.Singular}FormProps = {
  form: UseFormReturn<Create${ctx.Singular}FormValues>;
  onSubmit: (values: Create${ctx.Singular}FormValues) => void | Promise<void>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
};

export function ${ctx.Singular}Form({
  form,
  onSubmit,
  submitLabel,
  isSubmitting = false,
  onCancel,
}: ${ctx.Singular}FormProps) {
  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={form.handleSubmit((values) => {
        void onSubmit(values);
      })}
      noValidate
    >
${fields}

      <div className="mt-2 flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-800"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderTableComponent(ctx) {
  const nav = navHelpers(ctx, { needParams: false, needLink: true });
  const columns = ctx.fields.slice(0, 4);

  const headerCells = columns
    .map(
      (field) =>
        `          <th scope="col" className="px-3 py-2 text-left font-medium">
            ${field.tableLabel}
          </th>`,
    )
    .join('\n');

  const bodyCells = columns
    .map(
      (field) =>
        `            <td className="px-3 py-2">${field.tableCell}</td>`,
    )
    .join('\n');

  const enumOptionConsts = Array.from(
    new Set(columns.map((field) => field.tableNeedsOptions).filter(Boolean)),
  );

  /** @type {string[]} */
  const actionBits = [];
  if (ctx.ops.update) {
    actionBits.push(`                <Link
                  ${nav.linkProp}={${ctx.camel}AppRoutes.dashboard.edit(item.id)}
                  className="text-sm text-zinc-900 underline"
                >
                  Edit
                </Link>`);
  }
  if (ctx.ops.delete) {
    actionBits.push(`                <button
                  type="button"
                  className="text-sm text-red-700 underline"
                  onClick={() => {
                    void onDelete?.(item.id);
                  }}
                >
                  Delete
                </button>`);
  }
  if (ctx.ops.restore) {
    actionBits.push(`                <button
                  type="button"
                  className="text-sm text-zinc-700 underline"
                  onClick={() => {
                    void onRestore?.(item.id);
                  }}
                >
                  Restore
                </button>`);
  }

  const actionsHeader =
    actionBits.length > 0
      ? `          <th scope="col" className="px-3 py-2 text-right font-medium">
            Actions
          </th>`
      : '';

  const actionsCell =
    actionBits.length > 0
      ? `            <td className="px-3 py-2">
              <div className="flex justify-end gap-3">
${actionBits.join('\n')}
              </div>
            </td>`
      : '';

  const linkImport = ctx.ops.update
    ? ctx.framework === 'next'
      ? 'import Link from "next/link";\n'
      : 'import { Link } from "react-router-dom";\n'
    : '';

  const routesImport = ctx.ops.update
    ? `import { ${ctx.camel}AppRoutes } from "../services/${ctx.camel}.routes";
`
    : '';

  const enumOptionImport =
    enumOptionConsts.length > 0
      ? `import { ${enumOptionConsts.join(', ')} } from "../types/${ctx.camel}.types";\n`
      : '';

  return `"use client";

${linkImport}${routesImport}${enumOptionImport}import type { ${ctx.Singular} } from "../types/${ctx.camel}.types";

type ${ctx.Singular}TableProps = {
  items: ${ctx.Singular}[];
  onDelete?: (id: string) => unknown;
  onRestore?: (id: string) => unknown;
};

export function ${ctx.Singular}Table({
  items,
  onDelete,
  onRestore,
}: ${ctx.Singular}TableProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-600">
        No ${ctx.enPlural.toLowerCase()} found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead className="bg-zinc-50 text-zinc-700">
          <tr>
${headerCells}
${actionsHeader}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white text-zinc-900">
          {items.map((item) => (
            <tr key={item.id}>
${bodyCells}
${actionsCell}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderFiltersComponent(ctx) {
  return `"use client";

type ${ctx.Singular}FiltersProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSubmit: () => void;
};

export function ${ctx.Singular}Filters({
  searchTerm,
  onSearchTermChange,
  onSubmit,
}: ${ctx.Singular}FiltersProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-sm text-zinc-800">
        Search
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search ${ctx.enPlural.toLowerCase()}..."
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
        />
      </label>
      <button
        type="submit"
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900"
      >
        Apply
      </button>
    </form>
  );
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderListPage(ctx) {
  const nav = navHelpers(ctx, { needParams: false, needLink: true });

  const createButton = ctx.ops.create
    ? `        <Link
          ${nav.linkProp}={${ctx.camel}AppRoutes.dashboard.create}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
        >
          Create ${ctx.enSingular}
        </Link>`
    : '';

  const filtersBlock = ctx.ops.search
    ? `      <${ctx.Singular}Filters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSubmit={() => {
          setPage(1);
          load({
            page: 1,
            pageSize,
            searchTerm: searchTerm.trim() || null,
          });
        }}
      />`
    : '';

  const paginationBlock =
    ctx.ops.pagination && (ctx.ops.search || ctx.ops.list)
      ? `      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-700">
          <p>
            Page {pagination.currentPage} of {pagination.totalPages} ·{" "}
            {pagination.totalCount} total
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
              disabled={!pagination.hasPreviousPage || isLoading}
              onClick={() => {
                const nextPage = Math.max(1, page - 1);
                setPage(nextPage);
                load({
                  page: nextPage,
                  pageSize,
                  searchTerm: searchTerm.trim() || null,
                });
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded-md border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
              disabled={!pagination.hasNextPage || isLoading}
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                load({
                  page: nextPage,
                  pageSize,
                  searchTerm: searchTerm.trim() || null,
                });
              }}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}`
      : '';

  const tableProps = [
    'items={items}',
    ...(ctx.ops.delete ? ['onDelete={remove}'] : []),
    ...(ctx.ops.restore ? ['onRestore={restore}'] : []),
  ].join('\n        ');

  const dialogRender = ctx.ops.delete ? `\n      {dialog}` : '';

  const loadEffect =
    ctx.ops.search || ctx.ops.list
      ? `
  useEffect(() => {
    load({ page, pageSize, searchTerm: searchTerm.trim() || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
`
      : '';

  const linkImportLine = ctx.ops.create
    ? ctx.framework === 'next'
      ? 'import Link from "next/link";\n'
      : 'import { Link } from "react-router-dom";\n'
    : '';

  const routesImport = ctx.ops.create
    ? `import { ${ctx.camel}AppRoutes } from "../services/${ctx.camel}.routes";
`
    : '';

  const controllerDestructure = [
    'items',
    ...(ctx.ops.search || ctx.ops.list ? ['pagination', 'load'] : []),
    'isLoading',
    'error',
    ...(ctx.ops.delete ? ['remove', 'dialog'] : []),
    ...(ctx.ops.restore ? ['restore'] : []),
  ].join(', ');

  return `"use client";

import { useEffect, useState } from "react";
${linkImportLine}${routesImport}import { ${ctx.Singular}Filters } from "../components/${ctx.Singular}Filters";
import { ${ctx.Singular}Table } from "../components/${ctx.Singular}Table";
import { use${ctx.Plural}Controller } from "../hooks/use${ctx.Plural}Controller";

export default function ${ctx.Plural}Page() {
  const { ${controllerDestructure} } = use${ctx.Plural}Controller();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
${loadEffect}
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">${ctx.enPlural}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage ${ctx.enPlural.toLowerCase()} with search, pagination, and CRUD actions.
          </p>
        </div>
${createButton}
      </header>

${filtersBlock}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-zinc-600">Loading ${ctx.enPlural.toLowerCase()}...</p>
      ) : (
        <${ctx.Singular}Table
        ${tableProps}
        />
      )}

${paginationBlock}
${dialogRender}
    </main>
  );
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderCreatePage(ctx) {
  const nav = navHelpers(ctx, { needParams: false, needLink: false });

  return `"use client";

${nav.imports}
import { ${ctx.Singular}Form } from "../components/${ctx.Singular}Form";
import { use${ctx.Plural}Controller } from "../hooks/use${ctx.Plural}Controller";
import { use${ctx.Singular}Form } from "../hooks/use${ctx.Singular}Form";
import { ${ctx.camel}AppRoutes } from "../services/${ctx.camel}.routes";

export default function Create${ctx.Singular}Page() {
  ${nav.useNavSetup}
  const { create, isSubmitting } = use${ctx.Plural}Controller();
  const form = use${ctx.Singular}Form();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold text-zinc-900">Create ${ctx.enSingular}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Fill in the fields below to create a new ${ctx.enSingular.toLowerCase()}.
        </p>
      </header>

      <${ctx.Singular}Form
        form={form}
        submitLabel="Create ${ctx.enSingular}"
        isSubmitting={isSubmitting}
        onCancel={() => {
          ${nav.push(`${ctx.camel}AppRoutes.dashboard.list`)};
        }}
        onSubmit={async (values) => {
          const created = await create(values);
          if (created) {
            ${nav.push(`${ctx.camel}AppRoutes.dashboard.list`)};
          }
        }}
      />
    </main>
  );
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderEditPage(ctx) {
  const nav = navHelpers(ctx, { needParams: true, needLink: false });
  const resetFields = ctx.fields.flatMap((field) => field.resetLines).join('\n');

  return `"use client";

import { useEffect } from "react";
${nav.imports}
import { ${ctx.Singular}Form } from "../components/${ctx.Singular}Form";
import { use${ctx.Plural}Controller } from "../hooks/use${ctx.Plural}Controller";
import { use${ctx.Singular}Form } from "../hooks/use${ctx.Singular}Form";
import { ${ctx.camel}AppRoutes } from "../services/${ctx.camel}.routes";

export default function Edit${ctx.Singular}Page() {
  ${nav.useNavSetup}
  const id = ${nav.idExpr};
  const { selected, loadById, update, isLoading, isSubmitting, error } =
    use${ctx.Plural}Controller();
  const form = use${ctx.Singular}Form();

  useEffect(() => {
    if (id) {
      loadById(id);
    }
  }, [id, loadById]);

  useEffect(() => {
    if (!selected || selected.id !== id) {
      return;
    }

    form.reset({
${resetFields}
    });
  }, [selected, id, form]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold text-zinc-900">Edit ${ctx.enSingular}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Update the ${ctx.enSingular.toLowerCase()} and save your changes.
        </p>
      </header>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {isLoading && !selected ? (
        <p className="text-sm text-zinc-600">Loading ${ctx.enSingular.toLowerCase()}...</p>
      ) : (
        <${ctx.Singular}Form
          form={form}
          submitLabel="Save changes"
          isSubmitting={isSubmitting}
          onCancel={() => {
            ${nav.push(`${ctx.camel}AppRoutes.dashboard.list`)};
          }}
          onSubmit={async (values) => {
            if (!selected) {
              return;
            }

            const updated = await update({
              id: selected.id,
              rowVersion: selected.rowVersion,
              ...values,
            });

            if (updated) {
              ${nav.push(`${ctx.camel}AppRoutes.dashboard.list`)};
            }
          }}
        />
      )}
    </main>
  );
}
`;
}

/**
 * @param {ReturnType<typeof buildContext>} ctx
 */
function renderIndex(ctx) {
  /** @type {string[]} */
  const lines = [
    `export { default as ${ctx.camelPlural}Reducer } from "./slices/${ctx.camelPlural}.slice";`,
    `export { default as ${ctx.Plural}Page } from "./pages/${ctx.Plural}Page";`,
  ];

  if (ctx.ops.create) {
    lines.push(
      `export { default as Create${ctx.Singular}Page } from "./pages/Create${ctx.Singular}Page";`,
    );
  }
  if (ctx.ops.update) {
    lines.push(
      `export { default as Edit${ctx.Singular}Page } from "./pages/Edit${ctx.Singular}Page";`,
    );
  }

  lines.push(`export { use${ctx.Plural}Controller } from "./hooks/use${ctx.Plural}Controller";`);
  lines.push(`export { ${ctx.camel}Service } from "./services/${ctx.camel}.service";`);
  lines.push(`export { ${ctx.camel}ApiRoutes, ${ctx.camel}AppRoutes } from "./services/${ctx.camel}.routes";`);

  if (ctx.ops.search || ctx.ops.list) {
    lines.push(
      `export { get${ctx.Plural} } from "./slices/thunks/get${ctx.Plural}.thunk";`,
    );
  }
  if (ctx.ops.getById) {
    lines.push(
      `export { get${ctx.Singular}ById } from "./slices/thunks/get${ctx.Singular}ById.thunk";`,
    );
  }
  if (ctx.ops.create) {
    lines.push(
      `export { create${ctx.Singular} } from "./slices/thunks/create${ctx.Singular}.thunk";`,
    );
  }
  if (ctx.ops.update) {
    lines.push(
      `export { update${ctx.Singular} } from "./slices/thunks/update${ctx.Singular}.thunk";`,
    );
  }
  if (ctx.ops.delete) {
    lines.push(
      `export { delete${ctx.Singular} } from "./slices/thunks/delete${ctx.Singular}.thunk";`,
    );
  }
  if (ctx.ops.restore) {
    lines.push(
      `export { restore${ctx.Singular} } from "./slices/thunks/restore${ctx.Singular}.thunk";`,
    );
  }

  lines.push(`export type { ${ctx.Singular} } from "./types/${ctx.camel}.types";`);

  return `${lines.join('\n')}
`;
}
