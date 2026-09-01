import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { AuthFrame } from "@/shared/components/auth/AuthFrame";
import { AuthRegisterForm } from "@/shared/components/auth/AuthRegisterForm";
import type { AppLinkProps } from "@/shared/navigation/app-link";

function AppLink({ href, className, children, onClick }: AppLinkProps): ReactElement {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function RegisterPage() {
  return (
    <AuthFrame
      productName="__DISPLAY_NAME__"
      title="Create account"
      description="Set up workspace access for this application."
      Link={AppLink}
    >
      <AuthRegisterForm Link={AppLink} />
    </AuthFrame>
  );
}
