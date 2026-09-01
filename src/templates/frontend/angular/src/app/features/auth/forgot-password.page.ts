import { Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthFrameComponent } from "../../shared/components/auth-frame.component";

@Component({
  selector: "app-forgot-password-page",
  standalone: true,
  imports: [RouterLink, AuthFrameComponent],
  template: `
    <app-auth-frame title="Reset password" description="We will email a reset link when the auth module is enabled.">
      <form class="ui-form-stack" (submit)="submit($event)">
        <label class="ui-field">
          Email
          <input class="ui-input" type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)" />
        </label>
        @if (error()) {
          <p class="ui-error-text">{{ error() }}</p>
        }
        @if (notice()) {
          <p class="ui-note">{{ notice() }}</p>
        }
        <button class="ui-btn ui-btn-primary" type="submit" [disabled]="loading()">
          {{ loading() ? "Sending…" : "Send reset link" }}
        </button>
        <p class="ui-form-foot">
          <a routerLink="/login">Back to sign in</a>
        </p>
      </form>
    </app-auth-frame>
  `,
})
export class ForgotPasswordPageComponent {
  readonly email = signal("");
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly loading = signal(false);

  submit(event: Event): void {
    event.preventDefault();
    this.notice.set(null);
    if (!this.email().trim()) {
      this.error.set("Enter the email associated with your account.");
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    window.setTimeout(() => {
      this.loading.set(false);
      this.notice.set("Enable the auth module to send a reset email.");
    }, 400);
  }
}
