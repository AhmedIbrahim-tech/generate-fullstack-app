import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { AuthFrame } from "@/shared/components/auth/AuthFrame";
import { AuthSignInForm } from "@/shared/components/auth/AuthSignInForm";
import type { AppLinkProps } from "@/shared/navigation/app-link";

function AppLink({ href, className, children, onClick }: AppLinkProps): ReactElement {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function LoginPage() {
  return (
    <AuthFrame
      productName="__DISPLAY_NAME__"
      title="Sign in"
      description="Enter your credentials to continue."
      Link={AppLink}
    >
      <AuthSignInForm Link={AppLink} />
    </AuthFrame>
  );
}
