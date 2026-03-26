import { GenerateClient } from "@/components/features/generate-client";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth";
import { getQuestionGenerationContext, getTopicsForSubject } from "@/lib/server-data";

export default async function GeneratePage() {
  const user = await requireUser();
  const [{ subjects }, { topics, subtopics }] = await Promise.all([
    getQuestionGenerationContext(user.id),
    getTopicsForSubject(user.id),
  ]);

  return (
    <PageShell
      title="Generate"
      description="Build standard or targeted tests using rule-based selection and weakness-aware scoring."
    >
      <GenerateClient subjects={subjects} topics={topics} subtopics={subtopics} />
    </PageShell>
  );
}
