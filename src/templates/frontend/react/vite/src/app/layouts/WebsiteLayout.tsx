import type { ReactElement } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "@/shared/components/navigation/SiteHeader";
import { SiteFooter } from "@/shared/components/navigation/SiteFooter";
import type { AppLinkProps } from "@/shared/navigation/app-link";

function AppLink({ href, className, children, onClick }: AppLinkProps): ReactElement {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function WebsiteLayout() {
  const { pathname } = useLocation();

  return (
    <div className="ui-site">
      <SiteHeader productName="__DISPLAY_NAME__" Link={AppLink} pathname={pathname} />
      <main className="ui-site-main">
        <Outlet />
      </main>
      <SiteFooter productName="__DISPLAY_NAME__" Link={AppLink} />
    </div>
  );
}
