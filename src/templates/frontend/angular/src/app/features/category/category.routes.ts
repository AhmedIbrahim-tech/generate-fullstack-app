import { Routes } from "@angular/router";
import { CategoriesPageComponent } from "./pages/categories.page";
import { CreateCategoryPageComponent } from "./pages/create-category.page";
import { CategoryDetailsPageComponent } from "./pages/category-details.page";
import { EditCategoryPageComponent } from "./pages/edit-category.page";

export const categoryRoutes: Routes = [
  {
    path: "",
    component: CategoriesPageComponent,
  },
  {
    path: "create",
    component: CreateCategoryPageComponent,
  },
  {
    path: ":id/edit",
    component: EditCategoryPageComponent,
  },
  {
    path: ":id",
    component: CategoryDetailsPageComponent,
  },
];
