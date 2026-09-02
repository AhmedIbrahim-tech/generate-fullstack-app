import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { categoryService } from "../../services/category.service";
import type { CreateCategoryInput, Category } from "../../types/category.types";

export const createCategory = createAsyncThunk<
  Category,
  CreateCategoryInput,
  { rejectValue: string }
>("category/createCategory", async (input, { rejectWithValue }) => {
  try {
    return await categoryService.create(input);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
