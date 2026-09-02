"use client";

import { useState, type ReactElement } from "react";
import { Menu, X } from "lucide-react";
import type { AppLinkProps } from "@/shared/navigation/app-link";

type SiteHeaderProps = {
  productName: string;
  Link: (props: AppLinkProps) => ReactElement;
  pathname?: string;
};

export function SiteHeader({ productName, Link, pathname = "/" }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Product" },
    { href: "/categories", label: "Categories" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <header className="ui-nav">
      <div className="ui-nav-inner">
        <Link href="/" className="ui-brand">
          <span className="ui-brand-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" />
              <rect x="8" y="1" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.55" />
              <rect x="1" y="8" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.55" />
              <rect x="8" y="8" width="5" height="5" rx="1.2" fill="currentColor" />
            </svg>
          </span>
          {productName}
        </Link>

        <nav className="ui-nav-links" aria-label="Primary">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`ui-nav-link${pathname === item.href ? " is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ui-nav-actions">
          <Link href="/login" className="ui-btn ui-btn-ghost">
            Sign in
          </Link>
          <Link href="/register" className="ui-btn ui-btn-primary">
            Create account
          </Link>
        </div>

        <button
          type="button"
          className="ui-menu-btn"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div className={`ui-mobile-panel${open ? " is-open" : ""}`}>
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="ui-nav-link"
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <Link href="/login" className="ui-btn ui-btn-ghost" onClick={() => setOpen(false)}>
          Sign in
        </Link>
        <Link href="/register" className="ui-btn ui-btn-primary" onClick={() => setOpen(false)}>
          Create account
        </Link>
      </div>
    </header>
  );
}
