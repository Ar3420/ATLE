import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth";
import { getSubjectDetail } from "@/lib/server-data";

export default async function SubjectDetailPage({
  params,
}: {
  params: { subjectId: string };
}) {
  const user = await requireUser();
  const { subject, questions, stats } = await getSubjectDetail(user.id, params.subjectId);

  return (
    <PageShell
      title={subject.name}
      description="Subject-level question inventory and rolling accuracy."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Question Count</CardTitle>
          </CardHeader>
          <CardContent className="text-4xl font-semibold">{stats.questionCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="text-4xl font-semibold">{stats.accuracy.toFixed(1)}%</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.map((question) => (
            <div key={question.id} className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
              <p className="font-medium text-[#55627e]">{question.question_text}</p>
              <p className="mt-1 text-sm text-[#847962]">
                {question.topic} • {question.subtopic} • Difficulty {question.difficulty}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
