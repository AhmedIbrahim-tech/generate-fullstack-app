"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { AppLinkProps } from "@/shared/navigation/app-link";
import { Breadcrumbs } from "@/shared/components/navigation/Breadcrumbs";

export type DashboardNavEntry = {
  href: string;
  label: string;
  icon?: LucideIcon;
};

type DashboardShellProps = {
  productName: string;
  pathname: string;
  navItems: DashboardNavEntry[];
  Link: (props: AppLinkProps) => ReactElement;
  children: ReactNode;
};

export function DashboardShell({
  productName,
  pathname,
  navItems,
  Link,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const items: DashboardNavEntry[] = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    ...navItems,
  ];

  const crumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, all) => ({
      label: segment.replace(/-/g, " "),
      href: `/${all.slice(0, index + 1).join("/")}`,
    }));

  const nav = (
    <>
      <Link href="/dashboard" className="ui-sidebar-brand" onClick={() => setMobileOpen(false)}>
        <span className="ui-brand-mark" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" />
            <rect x="8" y="8" width="5" height="5" rx="1.2" fill="currentColor" />
          </svg>
        </span>
        <span>{productName}</span>
      </Link>
      <nav className="ui-side-nav" aria-label="Dashboard">
        {items.map((item) => {
          const Icon = item.icon ?? BookOpen;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`ui-side-link${active ? " is-active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              <span className="ui-side-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="ui-side-foot">
        <Link href="/" className="ui-side-link" onClick={() => setMobileOpen(false)}>
          <LogOut size={18} />
          <span className="ui-side-label">Back to site</span>
        </Link>
        <button
          type="button"
          className="ui-side-link"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft size={18} style={{ transform: collapsed ? "rotate(180deg)" : undefined }} />
          <span className="ui-side-label">Collapse</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="ui-dash">
      <aside className={`ui-sidebar${collapsed ? " is-collapsed" : ""}`}>{nav}</aside>

      {mobileOpen ? (
        <>
          <button type="button" className="ui-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />
          <aside className="ui-drawer">{nav}</aside>
        </>
      ) : null}

      <div className="ui-dash-main">
        <header className="ui-topbar">
          <button
            type="button"
            className="ui-icon-btn ui-top-mobile"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>
          <Breadcrumbs
            Link={Link}
            items={[{ label: "Workspace", href: "/dashboard" }, ...crumbs.slice(1)]}
          />
          <label className="ui-search">
            <Search size={16} />
            <input type="search" placeholder="Search workspace…" aria-label="Search workspace" />
          </label>
          <div className="ui-top-actions">
            <div className="ui-relative">
              <button
                type="button"
                className="ui-icon-btn"
                aria-label="Notifications"
                onClick={() => setNotifyOpen((value) => !value)}
              >
                <Bell size={16} />
              </button>
              {notifyOpen ? (
                <div className="ui-popover">
                  <strong>Notifications</strong>
                  <p className="ui-note" style={{ marginTop: "0.4rem" }}>
                    You are all caught up. Alerts from generated modules will appear here.
                  </p>
                </div>
              ) : null}
            </div>
            <Link href="/login" className="ui-btn ui-btn-ghost">
              Account
            </Link>
          </div>
        </header>
        <main className="ui-dash-content ui-page">{children}</main>
      </div>
    </div>
  );
}
