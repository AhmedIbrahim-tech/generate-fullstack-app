import { Component } from "@angular/core";

@Component({
  selector: "app-dashboard-page",
  standalone: true,
  template: `
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-16">
      <h1 class="text-2xl font-semibold">Dashboard</h1>
      <p class="text-zinc-600">
        This layout is a dashboard-ready shell. Replace it with product modules
        when you add features.
      </p>
    </main>
  `,
})
export class DashboardPageComponent {}
