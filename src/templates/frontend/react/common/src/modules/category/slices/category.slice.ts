import { createSlice } from "@reduxjs/toolkit";
import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
import type { Category } from "../types/category.types";
import { createCategory } from "./thunks/createCategory.thunk";
import { getCategoryById } from "./thunks/getCategoryById.thunk";
import { getCategories } from "./thunks/getCategories.thunk";
import { updateCategory } from "./thunks/updateCategory.thunk";

type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

type CategoryState = {
  items: Category[];
  selected: Category | null;
  pagination: PaginationResult<Category> | null;
  status: RequestStatus;
  error: string | null;
};

const initialState: CategoryState = {
  items: [],
  selected: null,
  pagination: null,
  status: "idle",
  error: null,
};

const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    clearCategoryError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCategories.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getCategories.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data;
        state.pagination = action.payload;
      })
      .addCase(getCategories.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to load categories";
      })
      .addCase(getCategoryById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getCategoryById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.selected = action.payload;
      })
      .addCase(getCategoryById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to load category";
      })
      .addCase(createCategory.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = [action.payload, ...state.items];
        state.selected = action.payload;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to create category";
      })
      .addCase(updateCategory.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.selected = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to update category";
      });
  },
});

export const { clearCategoryError } = categorySlice.actions;
export default categorySlice.reducer;
