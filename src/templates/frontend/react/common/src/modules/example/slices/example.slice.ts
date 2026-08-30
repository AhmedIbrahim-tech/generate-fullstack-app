import { createSlice } from "@reduxjs/toolkit";
import type { PaginationResult } from "@/shared/state/pagination/pagination.types";
import type { Example } from "../types/example.types";
import { createExample } from "./thunks/createExample.thunk";
import { getExampleById } from "./thunks/getExampleById.thunk";
import { getExamples } from "./thunks/getExamples.thunk";
import { updateExample } from "./thunks/updateExample.thunk";

type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

type ExampleState = {
  items: Example[];
  selected: Example | null;
  pagination: PaginationResult<Example> | null;
  status: RequestStatus;
  error: string | null;
};

const initialState: ExampleState = {
  items: [],
  selected: null,
  pagination: null,
  status: "idle",
  error: null,
};

const exampleSlice = createSlice({
  name: "example",
  initialState,
  reducers: {
    clearExampleError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getExamples.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getExamples.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload.data;
        state.pagination = action.payload;
      })
      .addCase(getExamples.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to load examples";
      })
      .addCase(getExampleById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(getExampleById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.selected = action.payload;
      })
      .addCase(getExampleById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to load example";
      })
      .addCase(createExample.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(createExample.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = [action.payload, ...state.items];
        state.selected = action.payload;
      })
      .addCase(createExample.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to create example";
      })
      .addCase(updateExample.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateExample.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.selected = action.payload;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
      })
      .addCase(updateExample.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to update example";
      });
  },
});

export const { clearExampleError } = exampleSlice.actions;
export default exampleSlice.reducer;
