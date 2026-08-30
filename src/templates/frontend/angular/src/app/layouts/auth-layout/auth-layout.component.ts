import { Component } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";

@Component({
  selector: "app-auth-layout",
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="min-h-screen">
      <header class="border-b border-zinc-200 px-6 py-4">
        <a routerLink="/" class="text-sm underline">Back to site</a>
      </header>
      <router-outlet />
    </div>
  `,
})
export class AuthLayoutComponent {}
