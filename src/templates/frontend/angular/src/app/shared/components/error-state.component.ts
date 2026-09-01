import { Component, input } from "@angular/core";

@Component({
  selector: "app-error-state",
  standalone: true,
  template: `
    <div class="ui-error" role="alert">
      <span class="ui-card-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5h.01" />
        </svg>
      </span>
      <h3>{{ title() }}</h3>
      <p class="ui-note">{{ description() }}</p>
      <ng-content />
    </div>
  `,
})
export class ErrorStateComponent {
  readonly title = input("Something went wrong");
  readonly description = input.required<string>();
}
