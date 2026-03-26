import { QuestionBankClient } from "@/components/features/question-bank-client";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth";
import { getQuestions, getSubjects } from "@/lib/server-data";

export default async function QuestionsPage() {
  const user = await requireUser();
  const [subjects, questions] = await Promise.all([
    getSubjects(user.id),
    getQuestions(user.id),
  ]);

  return (
    <PageShell
      title="Questions"
      description="Manual entry, filters, full-table editing, and review-safe bank management."
    >
      <QuestionBankClient subjects={subjects} initialQuestions={questions} />
    </PageShell>
  );
}
