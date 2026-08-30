export type Example = {
  id: string;
  name: string;
  description: string;
  createdAtUtc: string;
};

export type ExampleQuery = {
  page: number;
  pageSize: number;
  search?: string;
};

export type CreateExampleInput = {
  name: string;
  description: string;
};

export type UpdateExampleInput = {
  id: string;
  name: string;
  description: string;
};
