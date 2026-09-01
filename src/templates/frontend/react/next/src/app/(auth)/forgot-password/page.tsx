"use client";

import { AuthFrame } from "@/shared/components/auth/AuthFrame";
import { AuthForgotPasswordForm } from "@/shared/components/auth/AuthForgotPasswordForm";
import { AppLink } from "@/app/navigation/app-link";

export default function ForgotPasswordPage() {
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
