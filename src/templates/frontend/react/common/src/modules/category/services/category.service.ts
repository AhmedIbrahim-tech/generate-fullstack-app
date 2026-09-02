import { apiClient } from "@/lib/api/api-client";
import {
  normalizePagination,
  type PaginationResult,
} from "@/shared/state/pagination/pagination.types";
import type {
  CreateCategoryInput,
  Category,
  CategoryQuery,
  UpdateCategoryInput,
} from "../types/category.types";

const basePath = "/api/v1/categories";

export const categoryService = {
  async search(query: CategoryQuery): Promise<PaginationResult<Category>> {
    const response = await apiClient.get<PaginationResult<Category>>(basePath, {
      params: query,
    });
    return normalizePagination(response.data);
  },

  async getById(id: string): Promise<Category> {
    const response = await apiClient.get<Category>(`${basePath}/${id}`);
    return response.data;
  },

  async create(input: CreateCategoryInput): Promise<Category> {
    const response = await apiClient.post<Category>(basePath, input);
    return response.data;
  },

  async update(input: UpdateCategoryInput): Promise<Category> {
    const response = await apiClient.put<Category>(`${basePath}/${input.id}`, input);
    return response.data;
  },
};
