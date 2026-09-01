import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

export type BreadcrumbItem = { label: string; path?: string };

@Component({
  selector: "app-breadcrumbs",
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="ui-crumbs" aria-label="Breadcrumb">
      @for (item of items(); track $index) {
        @if (item.path && !$last) {
          <a [routerLink]="item.path">{{ item.label }}</a>
        } @else {
          <span [style.font-weight]="$last ? 600 : 400">{{ item.label }}</span>
        }
        @if (!$last) {
          <span>/</span>
        }
      }
    </nav>
  `,
})
export class BreadcrumbsComponent {
  readonly items = input.required<BreadcrumbItem[]>();
}
