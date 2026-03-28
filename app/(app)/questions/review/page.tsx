import Link from "next/link";

import { PendingReviewClient } from "@/components/features/pending-review-client";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getAllPendingQuestionGroups, getSubjects } from "@/lib/server-data";
import { cn } from "@/lib/utils";

export default async function PendingReviewPage() {
  const user = await requireUser();
  const [{ groups, totalPendingQuestions }, subjects] = await Promise.all([
    getAllPendingQuestionGroups(user.id),
    getSubjects(user.id),
  ]);

  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const pendingGroups = groups.map((group) => ({
    ...group,
    subjectName: subjectMap.get(group.sourceFile.subject_id) ?? "Unknown subject",
  }));

  return (
    <PageShell
      title="Pending Review"
      description="See every extraction that still needs review and approve the full queue when appropriate."
      actions={
        <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/questions">
          Back
        </Link>
      }
    >
      <PendingReviewClient
        groups={pendingGroups}
        totalPendingQuestions={totalPendingQuestions}
      />
    </PageShell>
  );
}
