import path from 'node:path';
import {
  finalizePlan,
  paths,
  isReact,
  isAngular,
  AUTO_HEADER_TS,
  reactDashboardNavUpdate,
} from '../modules-orchestrator-helpers.js';

/**
 * @param {object} config
 */
export function planDashboardModule(config) {
  /** @type {{ relativePath: string, contents: string, writeMode?: string }[]} */
  const files = [];
  /** @type {{ relativePath: string, update: (existing: string) => string }[]} */
  const registryUpdates = [];

  if (isReact(config)) {
    const shared = (...segments) =>
      paths.client('shared', 'components', 'dashboard', ...segments);

    files.push({
      relativePath: shared('PageHeader.tsx'),
      writeMode: 'ifMissing',
      contents: `export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}
`,
    });

    files.push({
      relativePath: shared('EmptyState.tsx'),
      writeMode: 'ifMissing',
      contents: `export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-600">
      {message}
    </p>
  );
}
`,
    });

    files.push({
      relativePath: shared('LoadingSkeleton.tsx'),
      writeMode: 'ifMissing',
      contents: `export function LoadingSkeleton() {
  return <div className="h-24 animate-pulse rounded-md bg-zinc-100" aria-hidden />;
}
`,
    });

    files.push({
      relativePath: shared('ErrorState.tsx'),
      writeMode: 'ifMissing',
      contents: `export function ErrorState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}
`,
    });

    files.push({
      relativePath: shared('StatusBadge.tsx'),
      writeMode: 'ifMissing',
      contents: `export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "danger" }) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-700",
    success: "bg-emerald-50 text-emerald-800",
    danger: "bg-red-50 text-red-700",
  };
  return <span className={\`inline-flex rounded px-2 py-0.5 text-xs font-medium \${tones[tone]}\`}>{label}</span>;
}
`,
    });

    files.push({
      relativePath: paths.client('navigation', 'generated-dashboard-widgets.ts'),
      writeMode: 'ifMissing',
      contents: `${AUTO_HEADER_TS}

export type DashboardWidget = {
  id: string;
  title: string;
  group: "Overview" | "Content" | "Management" | "System";
  href?: string;
};

export const generatedDashboardWidgets: DashboardWidget[] = [];
`,
    });

    files.push({
      relativePath: paths.client('app', 'pages', 'DashboardOverviewPage.tsx'),
      writeMode: 'ifMissing',
      contents: `"use client";

import { generatedDashboardWidgets } from "@/navigation/generated-dashboard-widgets";
import { PageHeader } from "@/shared/components/dashboard/PageHeader";
import { EmptyState } from "@/shared/components/dashboard/EmptyState";

export default function DashboardOverviewPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        title="Overview"
        description="Register widgets from enabled modules. No fabricated metrics are shown."
      />
      {generatedDashboardWidgets.length === 0 ? (
        <EmptyState message="No dashboard widgets registered yet." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {generatedDashboardWidgets.map((widget) => (
            <li key={widget.id} className="rounded-md border border-zinc-200 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{widget.group}</p>
              <p className="mt-1 font-medium text-zinc-900">{widget.title}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
`,
    });

    registryUpdates.push({
      relativePath: paths.client('navigation', 'generated-dashboard-nav.ts'),
      update: reactDashboardNavUpdate({
        navKey: 'overview',
        label: 'Overview',
        href: '/dashboard',
      }),
    });
  }

  if (isAngular(config)) {
    files.push({
      relativePath: paths.client(
        'app',
        'shared',
        'components',
        'dashboard',
        'page-header.component.ts',
      ),
      writeMode: 'ifMissing',
      contents: `import { Component, Input } from "@angular/core";

@Component({
  selector: "app-page-header",
  standalone: true,
  template: \`
    <header class="mb-6">
      <h1 class="text-2xl font-semibold text-zinc-900">{{ title }}</h1>
      @if (description) {
        <p class="mt-1 text-sm text-zinc-600">{{ description }}</p>
      }
    </header>
  \`,
})
export class PageHeaderComponent {
  @Input({ required: true }) title = "";
  @Input() description = "";
}
`,
    });
  }

  return finalizePlan({
    id: 'dashboard',
    requires: [],
    files,
    registryUpdates,
    registrations: [],
    packages: {},
    notes: ['Dashboard widgets registry starts empty — no fake numbers.'],
  });
}
