import { createReducer, on } from "@ngrx/store";
import { CategoryActions } from "./category.actions";
import { initialCategoryState } from "./category.state";

export const categoryReducer = createReducer(
  initialCategoryState,
  on(CategoryActions.loadCategories, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(CategoryActions.loadCategoriesSuccess, (state, { result }) => ({
    ...state,
    status: "succeeded" as const,
    items: result.data,
    pagination: result,
  })),
  on(CategoryActions.loadCategoriesFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(CategoryActions.loadCategoryById, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(CategoryActions.loadCategoryByIdSuccess, (state, { category }) => ({
    ...state,
    status: "succeeded" as const,
    selected: category,
  })),
  on(CategoryActions.loadCategoryByIdFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(CategoryActions.createCategory, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(CategoryActions.createCategorySuccess, (state, { category }) => ({
    ...state,
    status: "succeeded" as const,
    selected: category,
    items: [category, ...state.items],
  })),
  on(CategoryActions.createCategoryFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(CategoryActions.updateCategory, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(CategoryActions.updateCategorySuccess, (state, { category }) => ({
    ...state,
    status: "succeeded" as const,
    selected: category,
    items: state.items.map((item) => (item.id === category.id ? category : item)),
  })),
  on(CategoryActions.updateCategoryFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(CategoryActions.clearError, (state) => ({
    ...state,
    error: null,
  })),
);
