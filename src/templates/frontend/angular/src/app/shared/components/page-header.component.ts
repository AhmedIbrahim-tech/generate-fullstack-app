import { Component, input } from "@angular/core";

@Component({
  selector: "app-page-header",
  standalone: true,
  template: `
    <header class="ui-page-header">
      <div>
        <h1>{{ title() }}</h1>
        @if (description()) {
          <p>{{ description() }}</p>
        }
      </div>
      <ng-content />
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
