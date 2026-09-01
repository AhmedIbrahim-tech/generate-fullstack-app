"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/shared/components/navigation/DashboardShell";
import { generatedDashboardNav } from "@/navigation/generated-dashboard-nav";
import { AppLink } from "@/app/navigation/app-link";

export default function DashboardGroupLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <DashboardShell
      productName="__DISPLAY_NAME__"
      pathname={pathname}
      navItems={generatedDashboardNav}
      Link={AppLink}
    >
      {children}
    </DashboardShell>
  );
}
