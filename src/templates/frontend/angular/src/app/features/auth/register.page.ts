import { Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthFrameComponent } from "../../shared/components/auth-frame.component";

@Component({
  selector: "app-register-page",
  standalone: true,
  imports: [RouterLink, AuthFrameComponent],
  template: `
    <app-auth-frame title="Create account" description="Set up workspace access for this application.">
      <form class="ui-form-stack" (submit)="submit($event)">
        <label class="ui-field">
          Name
          <input class="ui-input" type="text" autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value)" />
        </label>
        <label class="ui-field">
          Email
          <input class="ui-input" type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)" />
        </label>
        <label class="ui-field">
          Password
          <input class="ui-input" type="password" autocomplete="new-password" [value]="password()" (input)="password.set($any($event.target).value)" />
        </label>
        @if (error()) {
          <p class="ui-error-text">{{ error() }}</p>
        }
        @if (notice()) {
          <p class="ui-note">{{ notice() }}</p>
        }
        <button class="ui-btn ui-btn-primary" type="submit" [disabled]="loading()">
          {{ loading() ? "Creating account…" : "Create account" }}
        </button>
        <p class="ui-form-foot">
          Already registered? <a routerLink="/login">Sign in</a>
        </p>
      </form>
    </app-auth-frame>
  `,
})
export class RegisterPageComponent {
  readonly name = signal("");
  readonly email = signal("");
  readonly password = signal("");
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly loading = signal(false);

  submit(event: Event): void {
    event.preventDefault();
    this.notice.set(null);
    if (!this.name().trim() || !this.email().trim() || this.password().length < 8) {
      this.error.set("Name, email, and an 8+ character password are required.");
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    window.setTimeout(() => {
      this.loading.set(false);
      this.notice.set("Enable the auth module to create real accounts.");
    }, 400);
  }
}
