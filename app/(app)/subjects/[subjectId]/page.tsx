import Link from "next/link";

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
  const { subject, questions, sourceFiles, stats } = await getSubjectDetail(user.id, params.subjectId);

  return (
    <PageShell
      title={subject.name}
      description="Subject-level question inventory, source files, and rolling accuracy."
    >
      <div className="grid gap-4 md:grid-cols-3">
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
        <Card>
          <CardHeader>
            <CardTitle>Source Files</CardTitle>
          </CardHeader>
          <CardContent className="text-4xl font-semibold">{stats.sourceFileCount}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sourceFiles.length ? (
            sourceFiles.map((sourceFile) => (
              <div key={sourceFile.id} className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#55627e]">{sourceFile.file_path.split("/").pop()}</p>
                    <p className="mt-1 text-sm text-[#847962]">
                      {sourceFile.label} • {sourceFile.file_type} • {new Date(sourceFile.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm capitalize text-[#b9892f]">
                      {sourceFile.processing_status.replace("_", " ")}
                    </span>
                    <Link
                      href={`/questions/review/${sourceFile.id}`}
                      className="text-sm font-medium text-[#8c6f36] transition hover:text-[#5a4720]"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#9f947c]">No source files linked to this subject yet.</p>
          )}
        </CardContent>
      </Card>

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
