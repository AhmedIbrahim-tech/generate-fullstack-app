import { apiClient } from "@/lib/api/api-client";
import {
  normalizePagination,
  type PaginationResult,
} from "@/shared/state/pagination/pagination.types";
import type {
  CreateExampleInput,
  Example,
  ExampleQuery,
  UpdateExampleInput,
} from "../types/example.types";

const basePath = "/api/v1/examples";

export const exampleService = {
  async search(query: ExampleQuery): Promise<PaginationResult<Example>> {
    const response = await apiClient.get<PaginationResult<Example>>(basePath, {
      params: query,
    });
    return normalizePagination(response.data);
  },

  async getById(id: string): Promise<Example> {
    const response = await apiClient.get<Example>(`${basePath}/${id}`);
    return response.data;
  },

  async create(input: CreateExampleInput): Promise<Example> {
    const response = await apiClient.post<Example>(basePath, input);
    return response.data;
  },

  async update(input: UpdateExampleInput): Promise<Example> {
    const response = await apiClient.put<Example>(`${basePath}/${input.id}`, input);
    return response.data;
  },
};
