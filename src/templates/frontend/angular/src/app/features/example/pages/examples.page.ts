import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "@ngrx/store";
import { ExampleCardComponent } from "../components/example-card.component";
import { ExampleActions } from "../store/example.actions";
import {
  selectExampleError,
  selectExampleItems,
} from "../store/example.selectors";

@Component({
  selector: "app-examples-page",
  standalone: true,
  imports: [ReactiveFormsModule, ExampleCardComponent],
  template: `
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 class="text-3xl font-semibold">Examples</h1>
        <p class="mt-2 text-zinc-600">
          Page → NgRx action → effect → feature service → HttpClient. V1.1 does
          not generate a backend Example endpoint; do not expect these requests
          to succeed until that API exists.
        </p>
      </header>

      <button
        type="button"
        class="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm text-white"
        (click)="load()"
      >
        Load examples
      </button>

      @if (error(); as message) {
        <p class="text-sm text-red-600" role="alert">{{ message }}</p>
      }

      <form class="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4" [formGroup]="form" (ngSubmit)="create()">
        <label class="flex flex-col gap-1 text-sm">
          Name
          <input class="rounded-md border border-zinc-300 px-3 py-2" formControlName="name" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Description
          <textarea class="rounded-md border border-zinc-300 px-3 py-2" rows="3" formControlName="description"></textarea>
        </label>
        <button type="submit" class="w-fit rounded-md border border-zinc-300 px-4 py-2 text-sm">
          Create example
        </button>
      </form>

      <ul class="flex flex-col gap-3">
        @for (item of items(); track item.id) {
          <li>
            <app-example-card [example]="item" />
          </li>
        }
      </ul>
    </main>
  `,
})
export class ExamplesPageComponent {
  private readonly store = inject(Store);
  private readonly formBuilder = inject(FormBuilder);

  readonly items = this.store.selectSignal(selectExampleItems);
  readonly error = this.store.selectSignal(selectExampleError);

  readonly form = this.formBuilder.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(200)]],
    description: ["", [Validators.maxLength(2000)]],
  });

  load() {
    this.store.dispatch(ExampleActions.loadExamples({ query: { page: 1, pageSize: 10 } }));
  }

  create() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.store.dispatch(ExampleActions.createExample({ input: this.form.getRawValue() }));
  }
}
