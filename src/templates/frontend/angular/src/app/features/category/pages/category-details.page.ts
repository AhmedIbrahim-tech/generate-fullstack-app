import { Component, inject, OnInit } from "@angular/core";
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
  selector: "app-category-details-page",
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, EmptyStateComponent, ErrorStateComponent],
  template: `
    <div class="ui-page">
      <app-page-header
        [title]="selected()?.name ?? 'Category details'"
        description="Inspect a single category returned by GET /api/v1/categories/{id}."
      >
        <a routerLink="/dashboard/category" class="ui-btn ui-btn-ghost">Back to list</a>
        @if (id) {
          <a [routerLink]="['/dashboard/category', id, 'edit']" class="ui-btn ui-btn-primary">Edit category</a>
        }
      </app-page-header>

      @if (error(); as message) {
        <app-error-state [description]="message" />
      }

      @if (!selected()) {
        <app-empty-state
          title="Category not loaded"
          description="Load the list and open a category, or check the id in the URL."
        />
      } @else {
        <article class="ui-card">
          <p class="ui-note">Name</p>
          <p>{{ selected()!.name }}</p>
          <p class="ui-note" style="margin-top: 0.9rem">Description</p>
          <p>{{ selected()!.description || "—" }}</p>
          <p class="ui-note" style="margin-top: 0.9rem">Created</p>
          <p>{{ selected()!.createdAtUtc || "—" }}</p>
        </article>
      }
    </div>
  `,
})
export class CategoryDetailsPageComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);

  readonly id = this.route.snapshot.paramMap.get("id") ?? "";
  readonly selected = this.store.selectSignal(selectSelectedCategory);
  readonly error = this.store.selectSignal(selectCategoryError);

  ngOnInit() {
    if (this.id) {
      this.store.dispatch(CategoryActions.loadCategoryById({ id: this.id }));
    }
  }
}
