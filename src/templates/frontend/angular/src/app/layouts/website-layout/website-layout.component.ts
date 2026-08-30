import { Component } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";

@Component({
  selector: "app-website-layout",
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="min-h-screen">
      <header class="border-b border-zinc-200 px-6 py-4">
        <nav class="mx-auto flex max-w-5xl gap-4 text-sm">
          <a routerLink="/" class="underline">Home</a>
          <a routerLink="/examples" class="underline">Examples</a>
          <a routerLink="/login" class="underline">Auth</a>
          <a routerLink="/dashboard" class="underline">Dashboard</a>
        </nav>
      </header>
      <router-outlet />
    </div>
  `,
})
export class WebsiteLayoutComponent {}
