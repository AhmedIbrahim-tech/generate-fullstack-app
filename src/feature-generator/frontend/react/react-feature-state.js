/**
 * Zustand and local-state controllers for generated React features.
 */

/**
 * @param {object} ctx
 */
export function renderZustandStore(ctx) {
  const hasList = ctx.ops.search || ctx.ops.list;
  const paginationType = hasList
    ? `
  pagination: PaginationResult<${ctx.Singular}> | null;`
    : '';
  const paginationInit = hasList
    ? `
  pagination: null,`
    : '';
  const paginationArg = hasList
    ? `, pagination?: PaginationResult<${ctx.Singular}> | null`
    : '';
  const paginationAssign = hasList
    ? `
      pagination: pagination === undefined ? state.pagination : pagination,`
    : '';
  const paginationImport = hasList
    ? `import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
`
    : '';

  return `${paginationImport}import { create } from "zustand";
import type { ${ctx.Singular} } from "../types/${ctx.camel}.types";

type ${ctx.Singular}Store = {
  items: ${ctx.Singular}[];
  selected: ${ctx.Singular} | null;${paginationType}
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  setItems: (items: ${ctx.Singular}[]${paginationArg}) => void;
  setSelected: (selected: ${ctx.Singular} | null) => void;
  setLoading: (isLoading: boolean) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  removeItem: (id: string) => void;
  upsertItem: (item: ${ctx.Singular}) => void;
};

export const use${ctx.Plural}Store = create<${ctx.Singular}Store>((set) => ({
  items: [],
  selected: null,${paginationInit}
  isLoading: false,
  isSubmitting: false,
  error: null,
  setItems: (items${hasList ? ', pagination' : ''}) =>
    set((state) => ({
      items,${paginationAssign}
      isLoading: false,
      error: null,
    })),
  setSelected: (selected) => set({ selected, isLoading: false, error: null }),
  setLoading: (isLoading) =>
    set(isLoading ? { isLoading, error: null } : { isLoading }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  setError: (error) => set({ error, isLoading: false, isSubmitting: false }),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      selected: state.selected?.id === id ? null : state.selected,
      isSubmitting: false,
    })),
  upsertItem: (item) =>
    set((state) => ({
      selected: item,
      isSubmitting: false,
      items: state.items.some((entry) => entry.id === item.id)
        ? state.items.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...state.items],
    })),
}));
`;
}

/**
 * @param {object} ctx
 */
export function renderZustandController(ctx) {
  return renderServiceController(ctx, 'zustand');
}

/**
 * @param {object} ctx
 */
export function renderLocalController(ctx) {
  return renderServiceController(ctx, 'local');
}

/**
 * @param {object} ctx
 * @param {'zustand' | 'local'} mode
 */
function renderServiceController(ctx, mode) {
  /** @type {string[]} */
  const typeImports = [];
  if (ctx.ops.search || ctx.ops.list) typeImports.push(`${ctx.Singular}SearchRequest`);
  if (ctx.ops.create) typeImports.push(`Create${ctx.Singular}Request`);
  if (ctx.ops.update) typeImports.push(`Update${ctx.Singular}Request`);

  const typeImportBlock = `import type {
  ${ctx.Singular}${typeImports.length > 0 ? `,\n  ${typeImports.join(',\n  ')}` : ''},
} from "../types/${ctx.camel}.types";
`;

  const confirmImport = ctx.ops.delete
    ? `import { useConfirmDialog } from "@/shared/components/ConfirmDialog";
`
    : '';

  const storeImport =
    mode === 'zustand'
      ? `import { use${ctx.Plural}Store } from "../store/use${ctx.Plural}Store";
`
      : '';

  const paginationImport =
    ctx.ops.search || ctx.ops.list
      ? `import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
`
      : '';

  const localState =
    mode === 'local'
      ? `  const [items, setItems] = useState<${ctx.Singular}[]>([]);
  const [selected, setSelected] = useState<${ctx.Singular} | null>(null);
  const [pagination, setPagination] = useState<PaginationResult<${ctx.Singular}> | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
`
      : `  const items = use${ctx.Plural}Store((state) => state.items);
  const selected = use${ctx.Plural}Store((state) => state.selected);
  const pagination = use${ctx.Plural}Store((state) => state.pagination);
  const isLoading = use${ctx.Plural}Store((state) => state.isLoading);
  const isSubmitting = use${ctx.Plural}Store((state) => state.isSubmitting);
  const error = use${ctx.Plural}Store((state) => state.error);
  const setItems = use${ctx.Plural}Store((state) => state.setItems);
  const setSelected = use${ctx.Plural}Store((state) => state.setSelected);
  const setLoading = use${ctx.Plural}Store((state) => state.setLoading);
  const setSubmitting = use${ctx.Plural}Store((state) => state.setSubmitting);
  const setError = use${ctx.Plural}Store((state) => state.setError);
  const removeItem = use${ctx.Plural}Store((state) => state.removeItem);
  const upsertItem = use${ctx.Plural}Store((state) => state.upsertItem);
`;

  const confirmSetup = ctx.ops.delete
    ? `  const { confirm, dialog } = useConfirmDialog();
`
    : '';

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

  const setItemsCall = (itemsExpr, paginationExpr) =>
    mode === 'zustand'
      ? `setItems(${itemsExpr}, ${paginationExpr})`
      : `setItems(${itemsExpr});
        setPagination(${paginationExpr})`;

  if (ctx.ops.search || ctx.ops.list) {
    callbacks.push(`  const load = useCallback(
    (request: ${ctx.Singular}SearchRequest) => {
      setLoading(true);
      void ${ctx.camel}Service
        .search(request)
        .then((result) => {
          ${setItemsCall('result.data', 'result')};
        })
        .catch((cause) => {
          setError(getErrorMessage(cause));
        });
    },
    [${mode === 'zustand' ? 'setError, setItems, setLoading' : 'setError, setItems, setLoading, setPagination'}],
  );`);
    returns.push('    load');
  }

  if (ctx.ops.getById) {
    callbacks.push(`  const loadById = useCallback(
    (id: string) => {
      setLoading(true);
      void ${ctx.camel}Service
        .getById(id)
        .then((item) => {
          ${mode === 'zustand' ? 'setSelected(item)' : 'setSelected(item); setLoading(false)'};
        })
        .catch((cause) => {
          setError(getErrorMessage(cause));
        });
    },
    [${mode === 'zustand' ? 'setError, setLoading, setSelected' : 'setError, setLoading, setSelected'}],
  );`);
    returns.push('    loadById');
  }

  if (ctx.ops.create) {
    callbacks.push(`  const create = useCallback(
    async (input: Create${ctx.Singular}Request) => {
      setSubmitting(true);
      try {
        const created = await ${ctx.camel}Service.create(input);
        ${mode === 'zustand' ? 'upsertItem(created)' : 'setItems((current) => [created, ...current]); setSelected(created); setSubmitting(false)'};
        notify.success("${ctx.enSingular} created");
        return created;
      } catch (cause) {
        setError(getErrorMessage(cause));
        notify.error("Unable to create ${ctx.enSingular.toLowerCase()}");
        return null;
      }
    },
    [${mode === 'zustand' ? 'setError, setSubmitting, upsertItem' : 'setError, setItems, setSelected, setSubmitting'}],
  );`);
    returns.push('    create');
  }

  if (ctx.ops.update) {
    callbacks.push(`  const update = useCallback(
    async (input: Update${ctx.Singular}Request) => {
      setSubmitting(true);
      try {
        const updated = await ${ctx.camel}Service.update(input);
        ${mode === 'zustand' ? 'upsertItem(updated)' : 'setSelected(updated); setItems((current) => current.map((item) => (item.id === updated.id ? updated : item))); setSubmitting(false)'};
        notify.success("${ctx.enSingular} updated");
        return updated;
      } catch (cause) {
        setError(getErrorMessage(cause));
        notify.error("Unable to update ${ctx.enSingular.toLowerCase()}");
        return null;
      }
    },
    [${mode === 'zustand' ? 'setError, setSubmitting, upsertItem' : 'setError, setItems, setSelected, setSubmitting'}],
  );`);
    returns.push('    update');
  }

  if (ctx.ops.delete) {
    const removeBody =
      mode === 'zustand'
        ? 'removeItem(id);'
        : 'setItems((current) => current.filter((item) => item.id !== id)); setSelected((current) => (current?.id === id ? null : current)); setSubmitting(false);';
    callbacks.push(`  const remove = useCallback(
    async (id: string) => {
      const confirmed = await confirm(
        "Delete ${ctx.enSingular}",
        "Are you sure you want to delete this ${ctx.enSingular.toLowerCase()}? This action can be undone if restore is available.",
      );
      if (!confirmed) {
        return false;
      }

      setSubmitting(true);
      try {
        await ${ctx.camel}Service.delete(id);
        ${removeBody}
        notify.success("${ctx.enSingular} deleted");
        return true;
      } catch (cause) {
        setError(getErrorMessage(cause));
        notify.error("Unable to delete ${ctx.enSingular.toLowerCase()}");
        return false;
      }
    },
    [${mode === 'zustand' ? 'confirm, removeItem, setError, setSubmitting' : 'confirm, setError, setItems, setSelected, setSubmitting'}],
  );`);
    returns.push('    remove', '    dialog');
  }

  if (ctx.ops.restore) {
    callbacks.push(`  const restore = useCallback(
    async (id: string) => {
      setSubmitting(true);
      try {
        const restored = await ${ctx.camel}Service.restore(id);
        ${mode === 'zustand' ? 'upsertItem(restored)' : 'setSelected(restored); setItems((current) => [restored, ...current.filter((item) => item.id !== restored.id)]); setSubmitting(false)'};
        notify.success("${ctx.enSingular} restored");
        return restored;
      } catch (cause) {
        setError(getErrorMessage(cause));
        notify.error("Unable to restore ${ctx.enSingular.toLowerCase()}");
        return null;
      }
    },
    [${mode === 'zustand' ? 'setError, setSubmitting, upsertItem' : 'setError, setItems, setSelected, setSubmitting'}],
  );`);
    returns.push('    restore');
  }

  const reactImports =
    mode === 'local'
      ? `import { useCallback, useState } from "react";`
      : `import { useCallback } from "react";`;

  const localPagination =
    mode === 'local' && !(ctx.ops.search || ctx.ops.list)
      ? localState.replace(
          `  const [pagination, setPagination] = useState<PaginationResult<${ctx.Singular}> | null>(null);\n`,
          '',
        )
      : localState;

  return `"use client";

${reactImports}
import { notify } from "@/shared/utils/toast";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { ${ctx.camel}Service } from "../services/${ctx.camel}.service";
${confirmImport}${storeImport}${paginationImport}${typeImportBlock}
export function use${ctx.Plural}Controller() {
${confirmSetup}${localPagination}
${callbacks.join('\n\n')}

  return {
${returns.join(',\n')},
  };
}
`;
}
