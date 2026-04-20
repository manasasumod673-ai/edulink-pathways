import { Navbar } from "./Navbar";
import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}