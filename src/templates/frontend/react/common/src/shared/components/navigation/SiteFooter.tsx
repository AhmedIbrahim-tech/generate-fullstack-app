"use client";

import type { ReactElement } from "react";
import type { AppLinkProps } from "@/shared/navigation/app-link";

type SiteFooterProps = {
  productName: string;
  Link: (props: AppLinkProps) => ReactElement;
};

export function SiteFooter({ productName, Link }: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="ui-footer">
      <div className="ui-footer-inner">
        <div>
          <p className="ui-brand" style={{ marginBottom: "0.55rem" }}>
            <span className="ui-brand-mark" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" />
                <rect x="8" y="8" width="5" height="5" rx="1.2" fill="currentColor" />
              </svg>
            </span>
            {productName}
          </p>
          <p className="ui-footer-meta">
            Production-ready full-stack foundation. Generate features as your domain grows.
          </p>
        </div>
        <div>
          <ul className="ui-footer-links">
            <li>
              <Link href="/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link href="/examples">Documentation</Link>
            </li>
            <li>
              <Link href="/login">Sign in</Link>
            </li>
            <li>
              <a href="https://github.com" rel="noreferrer" target="_blank">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginInlineEnd: 6, verticalAlign: "-2px" }}>
                  <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.4 1.2a11.7 11.7 0 0 1 6.2 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 3 .1 3.3.8.9 1.2 2 1.2 3.3 0 4.7-2.8 5.7-5.5 6 .4.3.8 1 .8 2.1v3.1c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
                </svg>
                Source
              </a>
            </li>
          </ul>
          <p className="ui-footer-meta" style={{ marginTop: "1rem" }}>
            © {year} {productName}
          </p>
        </div>
      </div>
    </footer>
  );
}
