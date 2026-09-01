import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { DashboardHome } from "@/shared/components/marketing/DashboardHome";
import type { AppLinkProps } from "@/shared/navigation/app-link";

function AppLink({ href, className, children, onClick }: AppLinkProps): ReactElement {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function DashboardPage() {
  return <DashboardHome productName="__DISPLAY_NAME__" Link={AppLink} />;
}
