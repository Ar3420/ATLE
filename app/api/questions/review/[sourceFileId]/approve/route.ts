import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { questionSchema } from "@/lib/validation";
import { approvePendingQuestionGroups } from "@/lib/workflows/review-approval";

export async function POST(
  request: Request,
  { params }: { params: { sourceFileId: string } },
) {
  const user = await requireUser();
  const body = await request.json();
  const questions = questionSchema.array().parse(body.questions ?? []);
  const subjectId = String(body.subject_id);

  try {
    const insertedQuestionIds = await approvePendingQuestionGroups(user.id, [
      {
        sourceFileId: params.sourceFileId,
        subjectId,
        questions,
      },
    ]);

    return NextResponse.json({ insertedQuestionIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save questions." },
      { status: 400 },
    );
  }
}
