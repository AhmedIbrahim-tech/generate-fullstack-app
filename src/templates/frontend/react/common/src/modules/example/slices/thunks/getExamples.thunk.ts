import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
import { exampleService } from "../../services/example.service";
import type { Example, ExampleQuery } from "../../types/example.types";

export const getExamples = createAsyncThunk<
  PaginationResult<Example>,
  ExampleQuery,
  { rejectValue: string }
>("example/getExamples", async (query, { rejectWithValue }) => {
  try {
    return await exampleService.search(query);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
