import { z } from "zod";

export const categoryQuerySchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  search: z.string().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: z.string().uuid(),
});

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;
export type UpdateCategoryFormValues = z.infer<typeof updateCategorySchema>;
export type CategoryQueryValues = z.infer<typeof categoryQuerySchema>;
