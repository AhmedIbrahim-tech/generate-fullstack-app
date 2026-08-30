import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { exampleService } from "../../services/example.service";
import type { Example, UpdateExampleInput } from "../../types/example.types";

export const updateExample = createAsyncThunk<
  Example,
  UpdateExampleInput,
  { rejectValue: string }
>("example/updateExample", async (input, { rejectWithValue }) => {
  try {
    return await exampleService.update(input);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
