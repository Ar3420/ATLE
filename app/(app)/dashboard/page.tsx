import Link from "next/link";

import { DashboardOverview } from "@/components/features/dashboard-overview";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getDashboardData } from "@/lib/server-data";

export default async function DashboardPage() {
  const user = await requireUser();
  const metrics = await getDashboardData(user.id);

  return (
    <PageShell
      title="Dashboard"
      description="Closed-loop overview of your bank size, recent performance, and active weakness clusters."
      actions={
        <>
          <Link className={cn(buttonVariants())} href="/generate">
            Generate Daily Test
          </Link>
          <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/questions">
            Add Questions
          </Link>
        </>
      }
    >
      <DashboardOverview metrics={metrics} />
    </PageShell>
  );
}
