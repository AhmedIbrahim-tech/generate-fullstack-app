"use client";

import { AuthFrame } from "@/shared/components/auth/AuthFrame";
import { AuthSignInForm } from "@/shared/components/auth/AuthSignInForm";
import { AppLink } from "@/app/navigation/app-link";

export default function LoginPage() {
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
