import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Store } from "@ngrx/store";
import { CategoryCardComponent } from "../components/category-card.component";
import { CategoryActions } from "../store/category.actions";
import {
  selectCategoryError,
  selectCategoryItems,
} from "../store/category.selectors";
import { PageHeaderComponent } from "../../../shared/components/page-header.component";
import { EmptyStateComponent } from "../../../shared/components/empty-state.component";
import { ErrorStateComponent } from "../../../shared/components/error-state.component";

@Component({
  selector: "app-categories-page",
  standalone: true,
  imports: [
    RouterLink,
    CategoryCardComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="ui-page">
      <app-page-header
        title="Categories"
        description="Group products into named categories. Load the API, then create, inspect, or edit a category."
      >
        <button type="button" class="ui-btn ui-btn-ghost" (click)="load()">Load categories</button>
        <a routerLink="/dashboard/category/create" class="ui-btn ui-btn-primary">Create category</a>
      </app-page-header>

      @if (error(); as message) {
        <app-error-state [description]="message" />
      }

      @if (items().length === 0) {
        <app-empty-state
          title="No categories yet"
          description="Create a category to organize products. The API is /api/v1/categories."
        />
      } @else {
        <ul class="ui-list">
          @for (item of items(); track item.id) {
            <li>
              <app-category-card [category]="item">
                <div style="display:flex;gap:0.6rem;margin-top:0.85rem">
                  <a [routerLink]="['/dashboard/category', item.id]" class="ui-btn ui-btn-ghost">Details</a>
                  <a [routerLink]="['/dashboard/category', item.id, 'edit']" class="ui-btn ui-btn-ghost">Edit</a>
                </div>
              </app-category-card>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class CategoriesPageComponent {
  private readonly store = inject(Store);

  readonly items = this.store.selectSignal(selectCategoryItems);
  readonly error = this.store.selectSignal(selectCategoryError);

  load() {
    this.store.dispatch(CategoryActions.loadCategories({ query: { page: 1, pageSize: 10 } }));
  }
}
