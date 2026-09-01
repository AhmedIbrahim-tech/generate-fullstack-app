"use client";

import { AuthFrame } from "@/shared/components/auth/AuthFrame";
import { AuthRegisterForm } from "@/shared/components/auth/AuthRegisterForm";
import { AppLink } from "@/app/navigation/app-link";

export default function RegisterPage() {
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
