import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
import { categoryService } from "../../services/category.service";
import type { Category, CategoryQuery } from "../../types/category.types";

export const getCategories = createAsyncThunk<
  PaginationResult<Category>,
  CategoryQuery,
  { rejectValue: string }
>("category/getCategories", async (query, { rejectWithValue }) => {
  try {
    return await categoryService.search(query);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
