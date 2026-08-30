import { Component } from "@angular/core";

@Component({
  selector: "app-login-page",
  standalone: true,
  template: `
    <main class="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
      <h1 class="text-2xl font-semibold">Sign in</h1>
      <p class="text-zinc-600">
        Authentication is intentionally not implemented in this starter phase.
      </p>
    </main>
  `,
})
export class LoginPageComponent {}
