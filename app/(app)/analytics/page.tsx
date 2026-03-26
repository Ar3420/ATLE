import { AnalyticsDashboard } from "@/components/features/analytics-dashboard";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth";
import { getAnalyticsData, getSubjects } from "@/lib/server-data";

export default async function AnalyticsPage() {
  const user = await requireUser();
  const [data, subjects] = await Promise.all([
    getAnalyticsData(user.id),
    getSubjects(user.id),
  ]);

  return (
    <PageShell
      title="Analytics"
      description="Global performance dashboard across score trend, subject performance, error types, topics, and weakness clusters."
    >
      <AnalyticsDashboard
        data={data}
        subjects={subjects.map((subject) => ({ id: subject.id, name: subject.name }))}
      />
    </PageShell>
  );
}
