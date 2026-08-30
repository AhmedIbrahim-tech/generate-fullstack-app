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
