import { createAsyncThunk } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { exampleService } from "../../services/example.service";
import type { Example } from "../../types/example.types";

export const getExampleById = createAsyncThunk<
  Example,
  string,
  { rejectValue: string }
>("example/getExampleById", async (id, { rejectWithValue }) => {
  try {
    return await exampleService.getById(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});
