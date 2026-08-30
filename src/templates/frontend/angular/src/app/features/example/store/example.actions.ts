import { createActionGroup, emptyProps, props } from "@ngrx/store";
import type { PaginationResult } from "../../../shared/models/pagination";
import type {
  CreateExampleInput,
  Example,
  ExampleQuery,
  UpdateExampleInput,
} from "../models/example.model";

export const ExampleActions = createActionGroup({
  source: "Example",
  events: {
    "Load Examples": props<{ query: ExampleQuery }>(),
    "Load Examples Success": props<{ result: PaginationResult<Example> }>(),
    "Load Examples Failure": props<{ error: string }>(),
    "Load Example By Id": props<{ id: string }>(),
    "Load Example By Id Success": props<{ example: Example }>(),
    "Load Example By Id Failure": props<{ error: string }>(),
    "Create Example": props<{ input: CreateExampleInput }>(),
    "Create Example Success": props<{ example: Example }>(),
    "Create Example Failure": props<{ error: string }>(),
    "Update Example": props<{ input: UpdateExampleInput }>(),
    "Update Example Success": props<{ example: Example }>(),
    "Update Example Failure": props<{ error: string }>(),
    "Clear Error": emptyProps(),
  },
});
