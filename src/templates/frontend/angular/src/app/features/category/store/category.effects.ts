import { Injectable, inject } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, map, of, switchMap } from "rxjs";
import { getErrorMessage } from "../../../shared/utils/get-error-message";
import { CategoryService } from "../services/category.service";
import { CategoryActions } from "./category.actions";

@Injectable()
export class CategoryEffects {
  private readonly actions$ = inject(Actions);
  private readonly categoryService = inject(CategoryService);

  loadCategories$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.loadCategories),
      switchMap(({ query }) =>
        this.categoryService.search(query).pipe(
          map((result) => CategoryActions.loadCategoriesSuccess({ result })),
          catchError((error: unknown) =>
            of(CategoryActions.loadCategoriesFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  loadCategoryById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.loadCategoryById),
      switchMap(({ id }) =>
        this.categoryService.getById(id).pipe(
          map((category) => CategoryActions.loadCategoryByIdSuccess({ category })),
          catchError((error: unknown) =>
            of(CategoryActions.loadCategoryByIdFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  createCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.createCategory),
      switchMap(({ input }) =>
        this.categoryService.create(input).pipe(
          map((category) => CategoryActions.createCategorySuccess({ category })),
          catchError((error: unknown) =>
            of(CategoryActions.createCategoryFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  updateCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CategoryActions.updateCategory),
      switchMap(({ input }) =>
        this.categoryService.update(input).pipe(
          map((category) => CategoryActions.updateCategorySuccess({ category })),
          catchError((error: unknown) =>
            of(CategoryActions.updateCategoryFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );
}
