"use client";

import { useCallback } from "react";
import { useAppStore } from "@/store/use-app-store";
import { exampleService } from "../services/example.service";
import type { CreateExampleInput, ExampleQuery } from "../types/example.types";

export function useExamplesController() {
  const items = useAppStore((state) => state.example.items);
  const status = useAppStore((state) => state.example.status);
  const error = useAppStore((state) => state.example.error);
  const setExampleItems = useAppStore((state) => state.setExampleItems);
  const setExampleError = useAppStore((state) => state.setExampleError);
  const setExampleStatus = useAppStore((state) => state.setExampleStatus);

  const load = useCallback((query: ExampleQuery) => {
    setExampleStatus("loading");
    void exampleService
      .search(query)
      .then((result) => setExampleItems(result.items ?? result.data ?? []))
      .catch((err) => setExampleError(err instanceof Error ? err.message : "Unable to load examples"));
  }, [setExampleError, setExampleItems, setExampleStatus]);

  const create = useCallback((input: CreateExampleInput) => {
    void exampleService
      .create(input)
      .then((item) => setExampleItems([item, ...useAppStore.getState().example.items]))
      .catch((err) => setExampleError(err instanceof Error ? err.message : "Unable to create example"));
  }, [setExampleError, setExampleItems]);

  return { items, status, error, load, create };
}
