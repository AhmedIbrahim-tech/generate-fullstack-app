import { Component, input } from "@angular/core";

@Component({
  selector: "app-empty-state",
  standalone: true,
  template: `
    <div class="ui-empty">
      <span class="ui-card-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="4" y="7" width="16" height="13" rx="2" />
          <path d="M8 7V5a4 4 0 0 1 8 0v2" />
        </svg>
      </span>
      <h3>{{ title() }}</h3>
      <p class="ui-note">{{ description() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
