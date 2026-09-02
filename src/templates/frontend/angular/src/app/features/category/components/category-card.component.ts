import { Component, input } from "@angular/core";
import { Category } from "../models/category.model";

@Component({
  selector: "app-category-card",
  standalone: true,
  template: `
    <article class="ui-card">
      <h2 style="margin:0;font-size:1.05rem">{{ category().name }}</h2>
      <p class="ui-note" style="margin-top:0.45rem">{{ category().description }}</p>
      <ng-content />
    </article>
  `,
})
export class CategoryCardComponent {
  readonly category = input.required<Category>();
}
