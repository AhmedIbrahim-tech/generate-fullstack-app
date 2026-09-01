import type { ReactNode } from "react";

export type AppLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};
