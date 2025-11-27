"use client";

import { SessionProvider } from "next-auth/react";
import { UIProvider } from "./ui/UIProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UIProvider>{children}</UIProvider>
    </SessionProvider>
  );
}
