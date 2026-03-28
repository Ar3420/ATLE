import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { buildTestPdfBuffer } from "@/lib/pdf/test-document";
import { getSubjects, getTestDetail } from "@/lib/server-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toDownloadFilename(value: string) {
  const ascii = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return ascii || "test";
}

export async function GET(
  request: Request,
  { params }: { params: { testId: string } },
) {
  try {
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

    const pdfBuffer = await buildTestPdfBuffer({
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

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${toDownloadFilename(test.title)}-${pdfVersion}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate PDF for this test.",
      },
      { status: 500 },
    );
  }
}
