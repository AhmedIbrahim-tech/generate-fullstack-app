import { Component, inject, signal } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { generatedDashboardNav } from "../../navigation/generated-dashboard-nav";
import { BreadcrumbsComponent } from "../../shared/components/breadcrumbs.component";

@Component({
  selector: "app-dashboard-layout",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, BreadcrumbsComponent],
  template: `
    <div class="ui-dash">
      <aside class="ui-sidebar" [class.is-collapsed]="collapsed()">
        <a routerLink="/dashboard" class="ui-sidebar-brand">
          <span class="ui-brand-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" />
              <rect x="8" y="8" width="5" height="5" rx="1.2" fill="currentColor" />
            </svg>
          </span>
          <span>__DISPLAY_NAME__</span>
        </a>
        <nav class="ui-side-nav" aria-label="Dashboard">
          <a routerLink="/dashboard" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }" class="ui-side-link">
            <svg class="ui-nav-glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            <span class="ui-side-label">Overview</span>
          </a>
          @for (item of navItems; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="is-active" class="ui-side-link">
              <svg class="ui-nav-glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M4 19.5V6.4c0-.8.6-1.4 1.4-1.4H12v14.5" />
                <path d="M12 5h6.6c.8 0 1.4.6 1.4 1.4v13.1" />
                <path d="M8 9h2M8 13h2" />
              </svg>
              <span class="ui-side-label">{{ item.label }}</span>
            </a>
          }
        </nav>
        <div class="ui-side-foot">
          <a routerLink="/" class="ui-side-link">
            <svg class="ui-nav-glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span class="ui-side-label">Back to site</span>
          </a>
          <button type="button" class="ui-side-link" (click)="collapsed.set(!collapsed())" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
            <svg class="ui-nav-glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" [style.transform]="collapsed() ? 'rotate(180deg)' : null">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span class="ui-side-label">{{ collapsed() ? "Expand" : "Collapse" }}</span>
          </button>
        </div>
      </aside>

      @if (mobileOpen()) {
        <button type="button" class="ui-backdrop" (click)="mobileOpen.set(false)" aria-label="Close navigation"></button>
        <aside class="ui-drawer">
          <a routerLink="/dashboard" class="ui-sidebar-brand" (click)="mobileOpen.set(false)">
            <span class="ui-brand-mark" aria-hidden="true">◆</span>
            <span>__DISPLAY_NAME__</span>
          </a>
          <nav class="ui-side-nav" aria-label="Dashboard">
            <a routerLink="/dashboard" class="ui-side-link" (click)="mobileOpen.set(false)">Overview</a>
            @for (item of navItems; track item.path) {
              <a [routerLink]="item.path" class="ui-side-link" (click)="mobileOpen.set(false)">{{ item.label }}</a>
            }
          </nav>
        </aside>
      }

      <div class="ui-dash-main">
        <header class="ui-topbar">
          <button type="button" class="ui-icon-btn ui-top-mobile" (click)="mobileOpen.set(true)" aria-label="Open navigation">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <app-breadcrumbs [items]="crumbs()" />
          <label class="ui-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3-3" />
            </svg>
            <input type="search" placeholder="Search workspace…" aria-label="Search workspace" />
          </label>
          <div class="ui-top-actions">
            <div class="ui-relative">
              <button type="button" class="ui-icon-btn" (click)="notifyOpen.set(!notifyOpen())" aria-label="Notifications">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3s3-2 3-9" />
                  <path d="M10 20a2 2 0 0 0 4 0" />
                </svg>
              </button>
              @if (notifyOpen()) {
                <div class="ui-popover">
                  <strong>Notifications</strong>
                  <p class="ui-note" style="margin-top: 0.4rem">
                    You are all caught up. Alerts from generated modules will appear here.
                  </p>
                </div>
              }
            </div>
            <a routerLink="/login" class="ui-btn ui-btn-ghost">Account</a>
          </div>
        </header>
        <main class="ui-dash-content ui-page">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class DashboardLayoutComponent {
  private readonly router = inject(Router);
  readonly navItems = generatedDashboardNav;
  readonly collapsed = signal(false);
  readonly mobileOpen = signal(false);
  readonly notifyOpen = signal(false);

  crumbs() {
    const parts = this.router.url.split("?")[0].split("/").filter(Boolean);
    const items: { label: string; path?: string }[] = [{ label: "Workspace", path: "/dashboard" }];
    for (let index = 1; index < parts.length; index += 1) {
      const href = `/${parts.slice(0, index + 1).join("/")}`;
      items.push({
        label: parts[index].replace(/-/g, " "),
        path: index === parts.length - 1 ? undefined : href,
      });
    }
    if (parts.length <= 1) {
      items.push({ label: "Overview" });
    }
    return items;
  }
}
