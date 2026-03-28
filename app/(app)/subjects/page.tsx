import { PageShell } from "@/components/layout/page-shell";
import { SubjectsClient } from "@/components/features/subjects-client";
import { requireUser } from "@/lib/auth";
import { getQuestions, getSourceFiles, getSubjects } from "@/lib/server-data";

export default async function SubjectsPage() {
  const user = await requireUser();
  const [subjects, questions, sourceFiles] = await Promise.all([
    getSubjects(user.id),
    getQuestions(user.id),
    getSourceFiles(user.id),
  ]);

  const subjectsWithStats = subjects.map((subject) => {
    const subjectQuestions = questions.filter((question) => question.subject_id === subject.id);
    const subjectFiles = sourceFiles.filter((sourceFile) => sourceFile.subject_id === subject.id);
    return {
      ...subject,
      questionCount: subjectQuestions.length,
      fileCount: subjectFiles.length,
      averageScore: 0,
    };
  });

  return (
    <PageShell
      title="Subjects"
      description="Manage subject tracks, activation status, and the question banks attached to each area."
    >
      <SubjectsClient initialSubjects={subjectsWithStats} />
    </PageShell>
  );
}
