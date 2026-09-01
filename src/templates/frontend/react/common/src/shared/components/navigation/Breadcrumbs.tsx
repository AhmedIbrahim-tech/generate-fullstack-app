import type { ReactElement } from "react";
import type { AppLinkProps } from "@/shared/navigation/app-link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  Link?: (props: AppLinkProps) => ReactElement;
};

export function Breadcrumbs({ items, Link }: BreadcrumbsProps) {
  return (
    <nav className="ui-crumbs" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            {item.href && Link && !last ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span style={{ color: last ? "var(--ui-ink)" : undefined, fontWeight: last ? 600 : 400 }}>
                {item.label}
              </span>
            )}
            {last ? null : <span aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
