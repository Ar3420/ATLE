import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { buildTestPdfStream } from "@/lib/pdf/test-document";
import { getSubjects, getTestDetail } from "@/lib/server-data";

export async function GET(
  request: Request,
  { params }: { params: { testId: string } },
) {
  const user = await requireUser();
  const version = new URL(request.url).searchParams.get("version");
  const pdfVersion = version === "key" ? "key" : "student";
  const [{ test, questions }, subjects] = await Promise.all([
    getTestDetail(user.id, params.testId),
    getSubjects(user.id),
  ]);

  const subjectNames = Array.from(
    new Set(
      questions
        .map((question) => subjects.find((subject) => subject.id === question.subject_id)?.name)
        .filter(Boolean),
    ),
  ) as string[];

  const stream = await buildTestPdfStream({
    title: test.title,
    createdAt: test.created_at,
    subjects: subjectNames,
    version: pdfVersion,
    questions: questions.map((question) => ({
      id: question.id,
      type: question.type,
      question_text: question.question_text,
      answer: question.answer,
      explanation: question.explanation,
      rubric_json: question.rubric_json as Record<string, unknown> | null,
      choices: question.choices,
    })),
  });

  return new NextResponse(stream as never, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${test.title.replace(/\s+/g, "-").toLowerCase()}-${pdfVersion}.pdf"`,
    },
  });
}
