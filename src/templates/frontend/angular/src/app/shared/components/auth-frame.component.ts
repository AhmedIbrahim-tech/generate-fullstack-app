import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-auth-frame",
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="ui-auth">
      <aside class="ui-auth-aside">
        <a routerLink="/" class="ui-brand" style="color: inherit">__DISPLAY_NAME__</a>
        <div>
          <h2 style="margin:0;font-size:1.8rem;letter-spacing:-0.04em">A quiet place to authenticate.</h2>
          <p>Sign-in lives outside the dashboard on purpose. Session handling stays isolated from the public site and workspace.</p>
        </div>
        <p style="margin:0;font-size:0.85rem;color:rgb(250 250 250 / 0.55)">
          <a routerLink="/" style="color:inherit">Back to site</a>
        </p>
      </aside>
      <section class="ui-auth-main">
        <div class="ui-auth-card">
          <h1>{{ title() }}</h1>
          <p>{{ description() }}</p>
          <ng-content />
        </div>
      </section>
    </div>
  `,
})
export class AuthFrameComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
