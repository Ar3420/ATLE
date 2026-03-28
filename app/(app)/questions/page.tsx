import Link from "next/link";

import { QuestionBankClient } from "@/components/features/question-bank-client";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getAllPendingQuestionGroups, getQuestions, getSubjects } from "@/lib/server-data";
import { cn } from "@/lib/utils";

export default async function QuestionsPage() {
  const user = await requireUser();
  const [subjects, questions, { totalPendingQuestions }] = await Promise.all([
    getSubjects(user.id),
    getQuestions(user.id),
    getAllPendingQuestionGroups(user.id),
  ]);

  return (
    <PageShell
      title="Questions"
      description="Manual entry, filters, full-table editing, and review-safe bank management."
      actions={
        <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/questions/review">
          Pending Review {totalPendingQuestions ? `(${totalPendingQuestions})` : ""}
        </Link>
      }
    >
      <QuestionBankClient subjects={subjects} initialQuestions={questions} />
    </PageShell>
  );
}
