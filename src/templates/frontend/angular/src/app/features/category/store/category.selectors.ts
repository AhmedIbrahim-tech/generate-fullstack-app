import { createFeatureSelector, createSelector } from "@ngrx/store";
import type { CategoryState } from "./category.state";

export const selectCategoryState = createFeatureSelector<CategoryState>("category");

export const selectCategoryItems = createSelector(selectCategoryState, (state) => state.items);
export const selectSelectedCategory = createSelector(selectCategoryState, (state) => state.selected);
export const selectCategoryStatus = createSelector(selectCategoryState, (state) => state.status);
export const selectCategoryError = createSelector(selectCategoryState, (state) => state.error);
export const selectCategoryPagination = createSelector(
  selectCategoryState,
  (state) => state.pagination,
);
