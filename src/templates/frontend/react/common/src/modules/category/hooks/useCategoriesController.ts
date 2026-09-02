"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createCategory } from "../slices/thunks/createCategory.thunk";
import { getCategoryById } from "../slices/thunks/getCategoryById.thunk";
import { getCategories } from "../slices/thunks/getCategories.thunk";
import { updateCategory } from "../slices/thunks/updateCategory.thunk";
import type {
  CreateCategoryInput,
  CategoryQuery,
  UpdateCategoryInput,
} from "../types/category.types";

export function useCategoriesController() {
  const dispatch = useAppDispatch();
  const { items, selected, pagination, status, error } = useAppSelector(
    (state) => state.category,
  );

  const load = useCallback(
    (query: CategoryQuery) => {
      void dispatch(getCategories(query));
    },
    [dispatch],
  );

  const loadById = useCallback(
    (id: string) => {
      void dispatch(getCategoryById(id));
    },
    [dispatch],
  );

  const create = useCallback(
    (input: CreateCategoryInput) => {
      void dispatch(createCategory(input));
    },
    [dispatch],
  );

  const update = useCallback(
    (input: UpdateCategoryInput) => {
      void dispatch(updateCategory(input));
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
