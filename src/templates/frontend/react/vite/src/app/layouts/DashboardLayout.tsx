import type { ReactElement } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { DashboardShell } from "@/shared/components/navigation/DashboardShell";
import { generatedDashboardNav } from "@/navigation/generated-dashboard-nav";
import type { AppLinkProps } from "@/shared/navigation/app-link";

function AppLink({ href, className, children, onClick }: AppLinkProps): ReactElement {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function DashboardLayout() {
  const location = useLocation();

  return (
    <DashboardShell
      productName="__DISPLAY_NAME__"
      pathname={location.pathname}
      navItems={generatedDashboardNav}
      Link={AppLink}
    >
      <Outlet />
    </DashboardShell>
  );
}
