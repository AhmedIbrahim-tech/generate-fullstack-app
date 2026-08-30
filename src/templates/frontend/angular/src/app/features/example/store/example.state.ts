import type { PaginationResult } from "../../../shared/models/pagination";
import type { Example } from "../models/example.model";

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

export type ExampleState = {
  items: Example[];
  selected: Example | null;
  pagination: PaginationResult<Example> | null;
  status: RequestStatus;
  error: string | null;
};

export const initialExampleState: ExampleState = {
  items: [],
  selected: null,
  pagination: null,
  status: "idle",
  error: null,
};
