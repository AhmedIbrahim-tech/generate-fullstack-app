import { createActionGroup, emptyProps, props } from "@ngrx/store";
import type { PaginationResult } from "../../../shared/models/pagination";
import type {
  CreateCategoryInput,
  Category,
  CategoryQuery,
  UpdateCategoryInput,
} from "../models/category.model";

export const CategoryActions = createActionGroup({
  source: "Category",
  events: {
    "Load Categories": props<{ query: CategoryQuery }>(),
    "Load Categories Success": props<{ result: PaginationResult<Category> }>(),
    "Load Categories Failure": props<{ error: string }>(),
    "Load Category By Id": props<{ id: string }>(),
    "Load Category By Id Success": props<{ category: Category }>(),
    "Load Category By Id Failure": props<{ error: string }>(),
    "Create Category": props<{ input: CreateCategoryInput }>(),
    "Create Category Success": props<{ category: Category }>(),
    "Create Category Failure": props<{ error: string }>(),
    "Update Category": props<{ input: UpdateCategoryInput }>(),
    "Update Category Success": props<{ category: Category }>(),
    "Update Category Failure": props<{ error: string }>(),
    "Clear Error": emptyProps(),
  },
});
