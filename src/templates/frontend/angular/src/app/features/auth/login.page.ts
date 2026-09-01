import { Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthFrameComponent } from "../../shared/components/auth-frame.component";

@Component({
  selector: "app-login-page",
  standalone: true,
  imports: [RouterLink, AuthFrameComponent],
  template: `
    <app-auth-frame title="Sign in" description="Enter your credentials to continue.">
      <form class="ui-form-stack" (submit)="submit($event)">
        <label class="ui-field">
          Email
          <input class="ui-input" type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)" />
        </label>
        <label class="ui-field">
          Password
          <input class="ui-input" type="password" autocomplete="current-password" [value]="password()" (input)="password.set($any($event.target).value)" />
        </label>
        @if (error()) {
          <p class="ui-error-text">{{ error() }}</p>
        }
        @if (notice()) {
          <p class="ui-note">{{ notice() }}</p>
        }
        <button class="ui-btn ui-btn-primary" type="submit" [disabled]="loading()">
          {{ loading() ? "Signing in…" : "Sign in" }}
        </button>
        <p class="ui-form-foot">
          Need an account? <a routerLink="/register">Create one</a><br />
          <a routerLink="/forgot-password">Forgot password</a>
        </p>
      </form>
    </app-auth-frame>
  `,
})
export class LoginPageComponent {
  readonly email = signal("");
  readonly password = signal("");
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly loading = signal(false);

  submit(event: Event): void {
    event.preventDefault();
    this.notice.set(null);
    if (!this.email().trim() || !this.password()) {
      this.error.set("Email and password are required.");
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    window.setTimeout(() => {
      this.loading.set(false);
      this.notice.set("Enable the auth module to connect this form to Identity.");
    }, 400);
  }
}
