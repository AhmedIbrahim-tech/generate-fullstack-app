import { Injectable, inject } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { catchError, map, of, switchMap } from "rxjs";
import { getErrorMessage } from "../../../shared/utils/get-error-message";
import { ExampleService } from "../services/example.service";
import { ExampleActions } from "./example.actions";

@Injectable()
export class ExampleEffects {
  private readonly actions$ = inject(Actions);
  private readonly exampleService = inject(ExampleService);

  loadExamples$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.loadExamples),
      switchMap(({ query }) =>
        this.exampleService.search(query).pipe(
          map((result) => ExampleActions.loadExamplesSuccess({ result })),
          catchError((error: unknown) =>
            of(ExampleActions.loadExamplesFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  loadExampleById$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.loadExampleById),
      switchMap(({ id }) =>
        this.exampleService.getById(id).pipe(
          map((example) => ExampleActions.loadExampleByIdSuccess({ example })),
          catchError((error: unknown) =>
            of(ExampleActions.loadExampleByIdFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  createExample$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.createExample),
      switchMap(({ input }) =>
        this.exampleService.create(input).pipe(
          map((example) => ExampleActions.createExampleSuccess({ example })),
          catchError((error: unknown) =>
            of(ExampleActions.createExampleFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  updateExample$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExampleActions.updateExample),
      switchMap(({ input }) =>
        this.exampleService.update(input).pipe(
          map((example) => ExampleActions.updateExampleSuccess({ example })),
          catchError((error: unknown) =>
            of(ExampleActions.updateExampleFailure({ error: getErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );
}
