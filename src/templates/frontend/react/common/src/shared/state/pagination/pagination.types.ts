export type PaginationMeta = Record<string, unknown>;

export type PaginationResult<TItem, TFilter = unknown, TMeta = PaginationMeta> = {
  data: TItem[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  meta: TMeta | null;
  filterData: TFilter | null;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type PaginationInput<TItem, TFilter = unknown, TMeta = PaginationMeta> = {
  data: TItem[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  meta?: TMeta | null;
  filterData?: TFilter | null;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
};

export function normalizePagination<TItem, TFilter = unknown, TMeta = PaginationMeta>(
  input: PaginationInput<TItem, TFilter, TMeta>,
): PaginationResult<TItem, TFilter, TMeta> {
  return {
    data: input.data,
    currentPage: input.currentPage,
    totalPages: input.totalPages,
    totalCount: input.totalCount,
    pageSize: input.pageSize,
    meta: input.meta ?? null,
    filterData: input.filterData ?? null,
    hasPreviousPage: input.hasPreviousPage ?? input.currentPage > 1,
    hasNextPage: input.hasNextPage ?? input.currentPage < input.totalPages,
  };
}
