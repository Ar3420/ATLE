import { AttemptLogClient } from "@/components/features/attempt-log-client";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth";
import { getTestDetail } from "@/lib/server-data";

export default async function AttemptLogPage({
  params,
}: {
  params: { testId: string };
}) {
  const user = await requireUser();
  const { test, questions } = await getTestDetail(user.id, params.testId);

  return (
    <PageShell
      title={`Log Attempt • ${test.title}`}
      description="Record per-question performance, time taken, and error tags to feed the adaptive loop."
    >
      <AttemptLogClient
        testId={test.id}
        questions={questions.map((question) => ({
          id: question.id,
          question_text: question.question_text,
          type: question.type,
        }))}
      />
    </PageShell>
  );
}
