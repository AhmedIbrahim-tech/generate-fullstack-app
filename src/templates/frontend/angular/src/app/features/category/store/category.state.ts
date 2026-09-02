import type { PaginationResult } from "../../../shared/models/pagination";
import type { Category } from "../models/category.model";

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export type CategoryState = {
  items: Category[];
  selected: Category | null;
  pagination: PaginationResult<Category> | null;
  status: RequestStatus;
  error: string | null;
};

export const initialCategoryState: CategoryState = {
  items: [],
  selected: null,
  pagination: null,
  status: "idle",
  error: null,
};
