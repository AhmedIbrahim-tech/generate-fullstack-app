"use client";

import { Boxes, KeyRound, LayoutDashboard, ShieldCheck, Workflow } from "lucide-react";
import type { ReactElement } from "react";
import type { AppLinkProps } from "@/shared/navigation/app-link";

type HomeLandingProps = {
  productName: string;
  headline?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  Link: (props: AppLinkProps) => ReactElement;
};

export function HomeLanding({
  productName,
  headline,
  description,
  primaryLabel = "Open dashboard",
  secondaryLabel = "Sign in",
  Link,
}: HomeLandingProps) {
  const features = [
    {
      icon: Workflow,
      title: "Layered architecture",
      copy: "A Clean Architecture backend and a structured client, ready for generated domain features.",
    },
    {
      icon: LayoutDashboard,
      title: "Product surfaces",
      copy: "Public site, dashboard shell, and auth layout ship together so you start from a real app, not a blank page.",
    },
    {
      icon: ShieldCheck,
      title: "Auth-ready baseline",
      copy: "Install the auth module when you need identity. The layout and routing are already in place.",
    },
  ];

  return (
    <div className="ui-page">
      <section className="ui-container ui-hero">
        <div>
          <p className="ui-kicker">{productName}</p>
          <h1>{headline ?? "A professional baseline for the product you are about to build."}</h1>
          <p className="ui-lead">
            {description ??
              "Public pages, a dashboard workspace, and a typed API client — generated as a coherent application instead of a starter screen."}
          </p>
          <div className="ui-hero-actions">
            <Link href="/dashboard" className="ui-btn ui-btn-primary">
              {primaryLabel}
            </Link>
            <Link href="/login" className="ui-btn ui-btn-ghost">
              {secondaryLabel}
            </Link>
          </div>
        </div>
        <div className="ui-hero-visual" aria-hidden="true">
          <svg viewBox="0 0 420 280" fill="none">
            <rect x="24" y="28" width="168" height="224" rx="16" stroke="#18181b" strokeOpacity="0.18" fill="#fff" />
            <rect x="40" y="48" width="88" height="10" rx="5" fill="#18181b" fillOpacity="0.18" />
            <rect x="40" y="74" width="136" height="28" rx="8" fill="#18181b" fillOpacity="0.08" />
            <rect x="40" y="114" width="136" height="28" rx="8" fill="#18181b" fillOpacity="0.08" />
            <rect x="40" y="154" width="136" height="28" rx="8" fill="#18181b" fillOpacity="0.08" />
            <rect x="212" y="48" width="184" height="72" rx="14" stroke="#18181b" strokeOpacity="0.18" fill="#fff" />
            <rect x="228" y="66" width="72" height="10" rx="5" fill="#18181b" fillOpacity="0.2" />
            <rect x="228" y="86" width="120" height="8" rx="4" fill="#18181b" fillOpacity="0.1" />
            <rect x="212" y="136" width="88" height="96" rx="14" stroke="#18181b" strokeOpacity="0.18" fill="#fff" />
            <rect x="308" y="136" width="88" height="96" rx="14" stroke="#18181b" strokeOpacity="0.18" fill="#fff" />
            <circle cx="256" cy="184" r="14" fill="#18181b" fillOpacity="0.12" />
            <circle cx="352" cy="184" r="14" fill="#18181b" fillOpacity="0.12" />
          </svg>
        </div>
      </section>

      <section className="ui-container ui-section">
        <h2>What you get on day one</h2>
        <p className="ui-section-copy">
          These surfaces are part of the generated project. Replace copy, then generate domain features into the same shells.
        </p>
        <div className="ui-grid ui-grid-3">
          {features.map((feature) => (
            <article className="ui-card" key={feature.title}>
              <span className="ui-card-icon">
                <feature.icon size={16} />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ui-container ui-section">
        <div className="ui-grid ui-grid-2">
          <article className="ui-card">
            <span className="ui-card-icon">
              <Boxes size={16} />
            </span>
            <h3>Generate the next module, not the next folder structure</h3>
            <p>
              Use <code>create-fullstack-feature</code> to add entities, APIs, and screens that register into this dashboard automatically.
            </p>
          </article>
          <article className="ui-card">
            <span className="ui-card-icon">
              <KeyRound size={16} />
            </span>
            <h3>Keep secrets and identity in the platform</h3>
            <p>
              Authentication pages live in the auth layout. Enable the auth module when you are ready to issue tokens.
            </p>
          </article>
        </div>
      </section>

      <section className="ui-container ui-section">
        <div className="ui-cta-band">
          <div>
            <h2 style={{ margin: 0, color: "inherit" }}>Continue in the workspace</h2>
            <p>The dashboard is the operator surface. The public site stays available at the root route.</p>
          </div>
          <Link href="/dashboard" className="ui-btn ui-btn-ghost">
            Go to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
