import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { StoreProvider } from "@/store/provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      {children}
      <Toaster richColors closeButton position="top-right" />
    </StoreProvider>
  );
}
