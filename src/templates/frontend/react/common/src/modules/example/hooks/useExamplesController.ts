"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createExample } from "../slices/thunks/createExample.thunk";
import { getExampleById } from "../slices/thunks/getExampleById.thunk";
import { getExamples } from "../slices/thunks/getExamples.thunk";
import { updateExample } from "../slices/thunks/updateExample.thunk";
import type {
  CreateExampleInput,
  ExampleQuery,
  UpdateExampleInput,
} from "../types/example.types";

export function useExamplesController() {
  const dispatch = useAppDispatch();
  const { items, selected, pagination, status, error } = useAppSelector(
    (state) => state.example,
  );

  const load = useCallback(
    (query: ExampleQuery) => {
      void dispatch(getExamples(query));
    },
    [dispatch],
  );

  const loadById = useCallback(
    (id: string) => {
      void dispatch(getExampleById(id));
    },
    [dispatch],
  );

  const create = useCallback(
    (input: CreateExampleInput) => {
      void dispatch(createExample(input));
    },
    [dispatch],
  );

  const update = useCallback(
    (input: UpdateExampleInput) => {
      void dispatch(updateExample(input));
    },
    [dispatch],
  );

  return {
    items,
    selected,
    pagination,
    status,
    error,
    load,
    loadById,
    create,
    update,
  };
}
