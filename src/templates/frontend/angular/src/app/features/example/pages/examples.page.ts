import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Store } from "@ngrx/store";
import { ExampleCardComponent } from "../components/example-card.component";
import { ExampleActions } from "../store/example.actions";
import {
  selectExampleError,
  selectExampleItems,
} from "../store/example.selectors";
import { PageHeaderComponent } from "../../../shared/components/page-header.component";
import { EmptyStateComponent } from "../../../shared/components/empty-state.component";
import { ErrorStateComponent } from "../../../shared/components/error-state.component";

@Component({
  selector: "app-examples-page",
  standalone: true,
  imports: [ReactiveFormsModule, ExampleCardComponent, PageHeaderComponent, EmptyStateComponent, ErrorStateComponent],
  template: `
    <div class="ui-page">
      <app-page-header
        title="Architecture sample"
        description="Page → NgRx → feature service → HttpClient. This slice exists so the generated client has a working module before you add domain features."
      >
        <button type="button" class="ui-btn ui-btn-ghost" (click)="load()">Load sample</button>
      </app-page-header>

      @if (error(); as message) {
        <app-error-state [description]="message" />
      }

      <form class="ui-card" style="margin: 1.2rem 0" [formGroup]="form" (ngSubmit)="create()">
        <h3>Create a sample record</h3>
        <label class="ui-field">
          Name
          <input class="ui-input" formControlName="name" />
        </label>
        <label class="ui-field">
          Description
          <textarea class="ui-input" rows="3" formControlName="description"></textarea>
        </label>
        <button type="submit" class="ui-btn ui-btn-primary">Save</button>
      </form>

      @if (items().length === 0) {
        <app-empty-state
          title="No sample records"
          description="The sample API is optional. Generate a real feature when you are ready to persist domain data."
        />
      } @else {
        <ul class="ui-list">
          @for (item of items(); track item.id) {
            <li>
              <app-example-card [example]="item" />
            </li>
          }
        </ul>
      }
    </div>
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
