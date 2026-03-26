import { GenerateClient } from "@/components/features/generate-client";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth";
import { getQuestionGenerationContext, getQuestions, getTopicsForSubject } from "@/lib/server-data";

export default async function GeneratePage() {
  const user = await requireUser();
  const [{ subjects }, { topics, subtopics }, questions] = await Promise.all([
    getQuestionGenerationContext(user.id),
    getTopicsForSubject(user.id),
    getQuestions(user.id),
  ]);

  const subjectsWithCounts = subjects.map((subject) => ({
    ...subject,
    question_count: questions.filter((question) => question.subject_id === subject.id).length,
  }));

  return (
    <PageShell
      title="Generate"
      description="Build standard or targeted tests using rule-based selection and weakness-aware scoring."
    >
      <GenerateClient subjects={subjectsWithCounts} topics={topics} subtopics={subtopics} />
    </PageShell>
  );
}
