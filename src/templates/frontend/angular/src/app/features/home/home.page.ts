import { Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { I18nService } from "../../core/services/i18n.service";

@Component({
  selector: "app-home-page",
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="ui-page">
      <section class="ui-container ui-hero">
        <div>
          <p class="ui-kicker">__DISPLAY_NAME__</p>
          <h1>{{ i18n.translate("home.title") }}</h1>
          <p class="ui-lead">{{ i18n.translate("home.description") }}</p>
          <div class="ui-hero-actions">
            <a routerLink="/dashboard" class="ui-btn ui-btn-primary">{{ i18n.translate("home.ctaPrimary") }}</a>
            <a routerLink="/login" class="ui-btn ui-btn-ghost">{{ i18n.translate("home.ctaSecondary") }}</a>
          </div>
        </div>
        <div class="ui-hero-visual" aria-hidden="true">
          <svg viewBox="0 0 420 280" fill="none">
            <rect x="24" y="28" width="168" height="224" rx="16" stroke="#18181b" stroke-opacity="0.18" fill="#fff" />
            <rect x="40" y="48" width="88" height="10" rx="5" fill="#18181b" fill-opacity="0.18" />
            <rect x="212" y="48" width="184" height="72" rx="14" stroke="#18181b" stroke-opacity="0.18" fill="#fff" />
            <rect x="212" y="136" width="88" height="96" rx="14" stroke="#18181b" stroke-opacity="0.18" fill="#fff" />
            <rect x="308" y="136" width="88" height="96" rx="14" stroke="#18181b" stroke-opacity="0.18" fill="#fff" />
          </svg>
        </div>
      </section>

      <section class="ui-container ui-section">
        <h2>What you get on day one</h2>
        <p class="ui-section-copy">
          Public site, dashboard workspace, and auth layout ship together so you start from a real application.
        </p>
        <div class="ui-grid ui-grid-3">
          <article class="ui-card">
            <span class="ui-card-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M4 6h16M4 12h10M4 18h7" />
              </svg>
            </span>
            <h3>Layered architecture</h3>
            <p>Clean Architecture on the API and a structured Angular client ready for generated features.</p>
          </article>
          <article class="ui-card">
            <span class="ui-card-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="7" height="9" rx="1.5" />
                <rect x="14" y="3" width="7" height="5" rx="1.5" />
                <rect x="14" y="12" width="7" height="9" rx="1.5" />
                <rect x="3" y="16" width="7" height="5" rx="1.5" />
              </svg>
            </span>
            <h3>Product surfaces</h3>
            <p>Website, dashboard, and auth shells are already wired into the router.</p>
          </article>
          <article class="ui-card">
            <span class="ui-card-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7z" />
              </svg>
            </span>
            <h3>Auth-ready baseline</h3>
            <p>Install the auth module when you need identity. Routing is already in place.</p>
          </article>
        </div>
      </section>

      <section class="ui-container ui-section">
        <div class="ui-grid ui-grid-2">
          <article class="ui-card">
            <h3>Generate the next module, not the next folder structure</h3>
            <p>Use create-fullstack-feature to add entities, APIs, and screens that register into this dashboard automatically.</p>
          </article>
          <article class="ui-card">
            <h3>Keep secrets and identity in the platform</h3>
            <p>Authentication pages live in the auth layout. Enable the auth module when you are ready to issue tokens.</p>
          </article>
        </div>
      </section>

      <section class="ui-container ui-section">
        <div class="ui-cta-band">
          <div>
            <h2 style="margin:0;color:inherit">Continue in the workspace</h2>
            <p>The dashboard is the operator surface. The public site stays at the root route.</p>
          </div>
          <a routerLink="/dashboard" class="ui-btn ui-btn-ghost">Go to dashboard</a>
        </div>
      </section>
    </div>
  `,
})
export class HomePageComponent {
  readonly i18n = inject(I18nService);
}
