import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { AuthFrame } from "@/shared/components/auth/AuthFrame";
import { AuthForgotPasswordForm } from "@/shared/components/auth/AuthForgotPasswordForm";
import type { AppLinkProps } from "@/shared/navigation/app-link";

function AppLink({ href, className, children, onClick }: AppLinkProps): ReactElement {
  return (
    <Link to={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

export function ForgotPasswordPage() {
  return (
    <AuthFrame
      productName="__DISPLAY_NAME__"
      title="Reset password"
      description="We will email a reset link when the auth module is enabled."
      Link={AppLink}
    >
      <AuthForgotPasswordForm Link={AppLink} />
    </AuthFrame>
  );
}
