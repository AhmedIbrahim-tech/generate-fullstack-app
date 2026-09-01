import { Component, input } from "@angular/core";

@Component({
  selector: "app-loading-state",
  standalone: true,
  template: `
    <div class="ui-loading" role="status">
      <span class="ui-spinner" aria-hidden="true"></span>
      <h3>{{ title() }}</h3>
      @if (description()) {
        <p class="ui-note">{{ description() }}</p>
      }
    </div>
  `,
})
export class LoadingStateComponent {
  readonly title = input("Loading");
  readonly description = input<string>();
}
