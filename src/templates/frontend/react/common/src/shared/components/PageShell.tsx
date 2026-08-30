import type { PlaceholderProps } from "@/shared/types";

export function PageShell({ children }: PlaceholderProps) {
  return <div className="min-h-screen">{children}</div>;
}
