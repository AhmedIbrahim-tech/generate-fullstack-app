"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/shared/components/navigation/SiteHeader";
import { SiteFooter } from "@/shared/components/navigation/SiteFooter";
import { AppLink } from "@/app/navigation/app-link";

export default function WebsiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="ui-site">
      <SiteHeader productName="__DISPLAY_NAME__" Link={AppLink} pathname={pathname} />
      <main className="ui-site-main">{children}</main>
      <SiteFooter productName="__DISPLAY_NAME__" Link={AppLink} />
    </div>
  );
}
