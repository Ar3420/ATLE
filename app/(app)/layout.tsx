import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
