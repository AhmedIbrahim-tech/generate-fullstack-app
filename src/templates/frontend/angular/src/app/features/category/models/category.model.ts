export type Category = {
  id: string;
  name: string;
  description: string;
  createdAtUtc: string;
};

export type CategoryQuery = {
  page: number;
  pageSize: number;
  search?: string;
};

export type CreateCategoryInput = {
  name: string;
  description: string;
};

export type UpdateCategoryInput = {
  id: string;
  name: string;
  description: string;
};
