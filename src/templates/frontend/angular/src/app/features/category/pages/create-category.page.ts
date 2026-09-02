import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { Store } from "@ngrx/store";
import { CategoryActions } from "../store/category.actions";
import { selectCategoryError } from "../store/category.selectors";
import { PageHeaderComponent } from "../../../shared/components/page-header.component";
import { ErrorStateComponent } from "../../../shared/components/error-state.component";

@Component({
  selector: "app-create-category-page",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, ErrorStateComponent],
  template: `
    <div class="ui-page">
      <app-page-header
        title="Create category"
        description="Add a category name and optional description."
      >
        <a routerLink="/dashboard/category" class="ui-btn ui-btn-ghost">Back to list</a>
      </app-page-header>

      @if (error(); as message) {
        <app-error-state [description]="message" />
      }

      <form class="ui-card" style="margin: 1.2rem 0" [formGroup]="form" (ngSubmit)="create()">
        <label class="ui-field">
          Name
          <input class="ui-input" formControlName="name" />
        </label>
        <label class="ui-field">
          Description
          <textarea class="ui-input" rows="3" formControlName="description"></textarea>
        </label>
        <button type="submit" class="ui-btn ui-btn-primary">Save category</button>
      </form>
    </div>
  `,
})
export class CreateCategoryPageComponent {
  private readonly store = inject(Store);
  private readonly formBuilder = inject(FormBuilder);

  readonly error = this.store.selectSignal(selectCategoryError);

  readonly form = this.formBuilder.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(200)]],
    description: ["", [Validators.maxLength(2000)]],
  });

  create() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.store.dispatch(CategoryActions.createCategory({ input: this.form.getRawValue() }));
  }
}
