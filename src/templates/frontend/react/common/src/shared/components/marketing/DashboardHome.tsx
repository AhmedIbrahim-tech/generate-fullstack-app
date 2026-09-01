"use client";

import { Blocks, Plus, Route, Timer } from "lucide-react";
import type { ReactElement } from "react";
import type { AppLinkProps } from "@/shared/navigation/app-link";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { StatCard } from "@/shared/components/cards/StatCard";
import { EmptyState } from "@/shared/components/empty-state/EmptyState";

type DashboardHomeProps = {
  productName: string;
  Link: (props: AppLinkProps) => ReactElement;
};

export function DashboardHome({ productName, Link }: DashboardHomeProps) {
  return (
    <div>
      <PageHeader
        title="Overview"
        description={`${productName} workspace. Generate features to populate navigation, APIs, and tables.`}
        actions={
          <Link href="/examples" className="ui-btn ui-btn-ghost">
            Architecture sample
          </Link>
        }
      />

      <div className="ui-grid ui-grid-4" style={{ marginBottom: "1.25rem" }}>
        <StatCard icon={Blocks} label="Generated features" value="—" hint="None yet" />
        <StatCard icon={Route} label="Surfaces" value="3" hint="Site, dashboard, auth" />
        <StatCard icon={Timer} label="Recent activity" value="—" hint="Waiting on the first module" />
        <StatCard icon={Plus} label="Next step" value="Feature" hint="create-fullstack-feature" />
      </div>

      <div className="ui-grid ui-grid-2">
        <section className="ui-card">
          <h3>Quick actions</h3>
          <p className="ui-note" style={{ margin: "0.35rem 0 1rem" }}>
            These links stay inside the generated app. They do not invent product data.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            <Link href="/" className="ui-btn ui-btn-ghost">
              View public site
            </Link>
            <Link href="/examples" className="ui-btn ui-btn-ghost">
              Open sample module
            </Link>
            <Link href="/login" className="ui-btn ui-btn-primary">
              Account
            </Link>
          </div>
        </section>
        <EmptyState
          title="No activity yet"
          description="When you generate a feature, list views, permissions, and navigation entries will show up in this workspace."
        />
      </div>
    </div>
  );
}
