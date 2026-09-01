import { Component, input } from "@angular/core";

@Component({
  selector: "app-stat-card",
  standalone: true,
  template: `
    <article class="ui-card ui-stat">
      <span>{{ label() }}</span>
      <strong>{{ value() }}</strong>
      @if (hint()) {
        <span>{{ hint() }}</span>
      }
    </article>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input<string>();
}
