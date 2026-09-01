"use client";

import { Toaster } from "sonner";

export function Providers({ children }) {
  return (
    <>
      {children}
      <Toaster richColors closeButton position="top-right" />
    </>
  );
}
