import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { PageHeaderComponent } from "../../shared/components/page-header.component";
import { StatCardComponent } from "../../shared/components/stat-card.component";
import { EmptyStateComponent } from "../../shared/components/empty-state.component";

@Component({
  selector: "app-dashboard-page",
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, StatCardComponent, EmptyStateComponent],
  template: `
    <app-page-header
      title="Overview"
      description="__DISPLAY_NAME__ workspace. Generate features to populate navigation, APIs, and tables."
    >
      <a routerLink="/categories" class="ui-btn ui-btn-ghost">Categories</a>
    </app-page-header>

    <div class="ui-grid ui-grid-4" style="margin-bottom: 1.25rem">
      <app-stat-card label="Generated features" value="—" hint="None yet" />
      <app-stat-card label="Surfaces" value="3" hint="Site, dashboard, auth" />
      <app-stat-card label="Recent activity" value="—" hint="Waiting on the first module" />
      <app-stat-card label="Next step" value="Feature" hint="create-fullstack-feature" />
    </div>

    <div class="ui-grid ui-grid-2">
      <section class="ui-card">
        <h3>Quick actions</h3>
        <p class="ui-note" style="margin: 0.35rem 0 1rem">These links stay inside the generated app.</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.6rem">
          <a routerLink="/" class="ui-btn ui-btn-ghost">View public site</a>
          <a routerLink="/categories" class="ui-btn ui-btn-ghost">Open categories</a>
          <a routerLink="/login" class="ui-btn ui-btn-primary">Account</a>
        </div>
      </section>
      <app-empty-state
        title="No activity yet"
        description="When you generate a feature, list views and navigation entries will show up in this workspace."
      />
    </div>
  `,
})
export class DashboardPageComponent {}
