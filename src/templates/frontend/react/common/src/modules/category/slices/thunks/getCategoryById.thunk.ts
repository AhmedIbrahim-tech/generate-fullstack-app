import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { categoryService } from "../../services/category.service";
import type { Category } from "../../types/category.types";

export const getCategoryById = createAsyncThunk<
  Category,
  string,
  { rejectValue: string }
>("category/getCategoryById", async (id, { rejectWithValue }) => {
  try {
    return await categoryService.getById(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
