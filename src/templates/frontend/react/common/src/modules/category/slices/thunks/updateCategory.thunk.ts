import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { categoryService } from "../../services/category.service";
import type { Category, UpdateCategoryInput } from "../../types/category.types";

export const updateCategory = createAsyncThunk<
  Category,
  UpdateCategoryInput,
  { rejectValue: string }
>("category/updateCategory", async (input, { rejectWithValue }) => {
  try {
    return await categoryService.update(input);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
