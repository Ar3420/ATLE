import { ReviewClient } from "@/components/features/review-client";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth";
import { getPendingQuestions } from "@/lib/server-data";

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
    >
      <ReviewClient
        sourceFileId={params.sourceFileId}
        subjectId={sourceFile.subject_id}
        initialQuestions={pendingQuestions}
      />
    </PageShell>
  );
}
