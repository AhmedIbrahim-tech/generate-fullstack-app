import { createReducer, on } from "@ngrx/store";
import { ExampleActions } from "./example.actions";
import { initialExampleState } from "./example.state";

export const exampleReducer = createReducer(
  initialExampleState,
  on(ExampleActions.loadExamples, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(ExampleActions.loadExamplesSuccess, (state, { result }) => ({
    ...state,
    status: "succeeded" as const,
    items: result.data,
    pagination: result,
  })),
  on(ExampleActions.loadExamplesFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(ExampleActions.loadExampleById, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(ExampleActions.loadExampleByIdSuccess, (state, { example }) => ({
    ...state,
    status: "succeeded" as const,
    selected: example,
  })),
  on(ExampleActions.loadExampleByIdFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(ExampleActions.createExample, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(ExampleActions.createExampleSuccess, (state, { example }) => ({
    ...state,
    status: "succeeded" as const,
    selected: example,
    items: [example, ...state.items],
  })),
  on(ExampleActions.createExampleFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(ExampleActions.updateExample, (state) => ({
    ...state,
    status: "loading" as const,
    error: null,
  })),
  on(ExampleActions.updateExampleSuccess, (state, { example }) => ({
    ...state,
    status: "succeeded" as const,
    selected: example,
    items: state.items.map((item) => (item.id === example.id ? example : item)),
  })),
  on(ExampleActions.updateExampleFailure, (state, { error }) => ({
    ...state,
    status: "failed" as const,
    error,
  })),
  on(ExampleActions.clearError, (state) => ({
    ...state,
    error: null,
  })),
);
