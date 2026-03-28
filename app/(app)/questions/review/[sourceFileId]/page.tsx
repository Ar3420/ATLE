import Link from "next/link";

import { ReviewClient } from "@/components/features/review-client";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getPendingQuestions } from "@/lib/server-data";
import { cn } from "@/lib/utils";

export default async function ReviewPage({
  params,
}: {
  params: { sourceFileId: string };
}) {
  const user = await requireUser();
  const { sourceFile, pendingQuestions } = await getPendingQuestions(user.id, params.sourceFileId);

  return (
    <PageShell
      title="Extraction Review"
      description="AI output stays pending until you explicitly approve and save each reviewed question."
      actions={
        <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/questions/review">
          Back
        </Link>
      }
    >
      <ReviewClient
        sourceFileId={params.sourceFileId}
        subjectId={sourceFile.subject_id}
        initialQuestions={pendingQuestions}
      />
    </PageShell>
  );
}
