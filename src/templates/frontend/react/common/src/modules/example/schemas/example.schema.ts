import { z } from "zod";

export const exampleQuerySchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  search: z.string().optional(),
});

export const createExampleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
});

export const updateExampleSchema = createExampleSchema.extend({
  id: z.string().uuid(),
});

export type CreateExampleFormValues = z.infer<typeof createExampleSchema>;
export type UpdateExampleFormValues = z.infer<typeof updateExampleSchema>;
export type ExampleQueryValues = z.infer<typeof exampleQuerySchema>;
