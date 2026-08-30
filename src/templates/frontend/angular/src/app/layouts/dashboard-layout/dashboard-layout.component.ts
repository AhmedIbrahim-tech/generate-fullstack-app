import { Component } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { generatedDashboardNav } from "../../navigation/generated-dashboard-nav";

@Component({
  selector: "app-dashboard-layout",
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `
    <div class="min-h-screen">
      <header class="border-b border-zinc-200 px-6 py-4">
        <nav class="mx-auto flex max-w-5xl flex-wrap gap-4 text-sm">
          <a routerLink="/dashboard" class="underline">Dashboard</a>
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" class="underline">{{ item.label }}</a>
          }
          <a routerLink="/" class="underline">Website</a>
        </nav>
      </header>
      <router-outlet />
    </div>
  `,
})
export class DashboardLayoutComponent {
  readonly navItems = generatedDashboardNav;
}
