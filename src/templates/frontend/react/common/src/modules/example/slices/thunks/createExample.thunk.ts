import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { exampleService } from "../../services/example.service";
import type { CreateExampleInput, Example } from "../../types/example.types";

export const createExample = createAsyncThunk<
  Example,
  CreateExampleInput,
  { rejectValue: string }
>("example/createExample", async (input, { rejectWithValue }) => {
  try {
    return await exampleService.create(input);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
