import { Component, effect, inject, OnInit } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { Store } from "@ngrx/store";
import { CategoryActions } from "../store/category.actions";
import {
  selectCategoryError,
  selectSelectedCategory,
} from "../store/category.selectors";
import { PageHeaderComponent } from "../../../shared/components/page-header.component";
import { EmptyStateComponent } from "../../../shared/components/empty-state.component";
import { ErrorStateComponent } from "../../../shared/components/error-state.component";

@Component({
  selector: "app-edit-category-page",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="ui-page">
      <app-page-header
        title="Edit category"
        description="Update the category name or description."
      >
        <a routerLink="/dashboard/category" class="ui-btn ui-btn-ghost">Back to list</a>
      </app-page-header>

      @if (error(); as message) {
        <app-error-state [description]="message" />
      }

      @if (!selected()) {
        <app-empty-state
          title="Category not loaded"
          description="Open a category from the list to edit it."
        />
      } @else {
        <form class="ui-card" style="margin: 1.2rem 0" [formGroup]="form" (ngSubmit)="save()">
          <label class="ui-field">
            Name
            <input class="ui-input" formControlName="name" />
          </label>
          <label class="ui-field">
            Description
            <textarea class="ui-input" rows="3" formControlName="description"></textarea>
          </label>
          <button type="submit" class="ui-btn ui-btn-primary">Save changes</button>
        </form>
      }
    </div>
  `,
})
export class EditCategoryPageComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);

  readonly id = this.route.snapshot.paramMap.get("id") ?? "";
  readonly selected = this.store.selectSignal(selectSelectedCategory);
  readonly error = this.store.selectSignal(selectCategoryError);

  readonly form = this.formBuilder.nonNullable.group({
    name: ["", [Validators.required, Validators.maxLength(200)]],
    description: ["", [Validators.maxLength(2000)]],
  });

  constructor() {
    effect(() => {
      const category = this.selected();
      if (category) {
        this.form.reset({
          name: category.name,
          description: category.description,
        });
      }
    });
  }

  ngOnInit() {
    if (this.id) {
      this.store.dispatch(CategoryActions.loadCategoryById({ id: this.id }));
    }
  }

  save() {
    if (this.form.invalid || !this.id) {
      this.form.markAllAsTouched();
      return;
    }

    this.store.dispatch(
      CategoryActions.updateCategory({
        input: { id: this.id, ...this.form.getRawValue() },
      }),
    );
  }
}
