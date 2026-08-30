import { createFeatureSelector, createSelector } from "@ngrx/store";
import type { ExampleState } from "./example.state";

export const selectExampleState = createFeatureSelector<ExampleState>("example");

export const selectExampleItems = createSelector(selectExampleState, (state) => state.items);
export const selectSelectedExample = createSelector(selectExampleState, (state) => state.selected);
export const selectExampleStatus = createSelector(selectExampleState, (state) => state.status);
export const selectExampleError = createSelector(selectExampleState, (state) => state.error);
export const selectExamplePagination = createSelector(
  selectExampleState,
  (state) => state.pagination,
);
