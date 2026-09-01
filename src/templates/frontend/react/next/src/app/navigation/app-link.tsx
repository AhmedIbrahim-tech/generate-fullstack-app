"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import type { AppLinkProps } from "@/shared/navigation/app-link";

export function AppLink({ href, className, children, onClick }: AppLinkProps): ReactElement {
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
