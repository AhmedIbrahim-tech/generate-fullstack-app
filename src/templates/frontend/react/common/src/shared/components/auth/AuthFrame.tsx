"use client";

import type { ReactNode } from "react";
import type { ReactElement } from "react";
import type { AppLinkProps } from "@/shared/navigation/app-link";

type AuthFrameProps = {
  productName: string;
  title: string;
  description: string;
  children: ReactNode;
  Link: (props: AppLinkProps) => ReactElement;
};

export function AuthFrame({
  productName,
  title,
  description,
  children,
  Link,
}: AuthFrameProps) {
  return (
    <div className="ui-auth">
      <aside className="ui-auth-aside">
        <Link href="/" className="ui-brand">
          <span className="ui-brand-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" />
              <rect x="8" y="8" width="5" height="5" rx="1.2" fill="currentColor" />
            </svg>
          </span>
          {productName}
        </Link>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.8rem", letterSpacing: "-0.04em" }}>
            A quiet place to authenticate.
          </h2>
          <p>
            Sign-in lives outside the dashboard on purpose. Session handling stays isolated from the public site and workspace.
          </p>
        </div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "rgb(250 250 250 / 0.55)" }}>
          <Link href="/">
            Back to site
          </Link>
        </p>
      </aside>
      <section className="ui-auth-main">
        <div className="ui-auth-card">
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
