import { Component, signal } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

@Component({
  selector: "app-website-layout",
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="ui-site">
      <header class="ui-nav">
        <div class="ui-nav-inner">
          <a routerLink="/" class="ui-brand">
            <span class="ui-brand-mark" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" />
                <rect x="8" y="8" width="5" height="5" rx="1.2" fill="currentColor" />
              </svg>
            </span>
            __DISPLAY_NAME__
          </a>

          <nav class="ui-nav-links" aria-label="Primary">
            <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }" class="ui-nav-link">Product</a>
            <a routerLink="/categories" routerLinkActive="is-active" class="ui-nav-link">Categories</a>
            <a routerLink="/dashboard" routerLinkActive="is-active" class="ui-nav-link">Dashboard</a>
          </nav>

          <div class="ui-nav-actions">
            <a routerLink="/login" class="ui-btn ui-btn-ghost">Sign in</a>
            <a routerLink="/register" class="ui-btn ui-btn-primary">Create account</a>
          </div>

          <button type="button" class="ui-menu-btn" (click)="open.set(!open())" [attr.aria-expanded]="open()" [attr.aria-label]="open() ? 'Close menu' : 'Open menu'">
            @if (open()) {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            }
          </button>
        </div>

        @if (open()) {
          <div class="ui-mobile-panel is-open">
            <a routerLink="/" class="ui-nav-link" (click)="open.set(false)">Product</a>
            <a routerLink="/categories" class="ui-nav-link" (click)="open.set(false)">Categories</a>
            <a routerLink="/dashboard" class="ui-nav-link" (click)="open.set(false)">Dashboard</a>
            <a routerLink="/login" class="ui-btn ui-btn-ghost" (click)="open.set(false)">Sign in</a>
            <a routerLink="/register" class="ui-btn ui-btn-primary" (click)="open.set(false)">Create account</a>
          </div>
        }
      </header>

      <main class="ui-site-main">
        <router-outlet />
      </main>

      <footer class="ui-footer">
        <div class="ui-footer-inner">
          <div>
            <p class="ui-brand" style="margin-bottom: 0.55rem">__DISPLAY_NAME__</p>
            <p class="ui-footer-meta">
              Production-ready full-stack foundation. Generate features as your domain grows.
            </p>
          </div>
          <div>
            <ul class="ui-footer-links">
              <li><a routerLink="/dashboard">Dashboard</a></li>
              <li><a routerLink="/categories">Categories</a></li>
              <li><a routerLink="/login">Sign in</a></li>
              <li><a href="https://github.com" rel="noreferrer" target="_blank">Source</a></li>
            </ul>
            <p class="ui-footer-meta" style="margin-top: 1rem">© {{ year }} __DISPLAY_NAME__</p>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class WebsiteLayoutComponent {
  readonly open = signal(false);
  readonly year = new Date().getFullYear();
}
