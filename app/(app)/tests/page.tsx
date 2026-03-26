import { TestsClient } from "@/components/features/tests-client";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth";
import { getTests } from "@/lib/server-data";

export default async function TestsPage() {
  const user = await requireUser();
  const tests = await getTests(user.id);

  return (
    <PageShell
      title="Tests"
      description="Browse generated tests, open PDFs, inspect results, and log completed attempts."
    >
      <TestsClient tests={tests} />
    </PageShell>
  );
}
