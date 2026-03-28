import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { questionSchema } from "@/lib/validation";
import { approvePendingQuestionGroups } from "@/lib/workflows/review-approval";

export async function POST() {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const [{ data: pendingQuestions, error: pendingError }, { data: sourceFiles, error: sourceFilesError }] =
    await Promise.all([
      supabase
        .from("pending_questions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase.from("source_files").select("*").eq("user_id", user.id),
    ]);

  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 400 });
  }

  if (sourceFilesError) {
    return NextResponse.json({ error: sourceFilesError.message }, { status: 400 });
  }

  const sourceFileMap = new Map((sourceFiles ?? []).map((sourceFile) => [sourceFile.id, sourceFile]));
  const groupedQuestions = new Map<string, Array<ReturnType<typeof questionSchema.parse>>>();

  for (const item of pendingQuestions ?? []) {
    const sourceFile = sourceFileMap.get(item.source_file_id);
    if (!sourceFile) {
      continue;
    }

    const parsedQuestion = questionSchema.parse({
      question_text: item.question_text,
      type: item.type,
      topic: item.topic ?? "General",
      subtopic: item.subtopic ?? "Core Concepts",
      difficulty: item.difficulty,
      answer: item.answer,
      explanation: item.explanation,
      rubric_json: item.rubric_json,
      metadata_json: item.metadata_json ?? {},
      choices: Array.isArray(item.choices_json) ? item.choices_json : [],
    });

    groupedQuestions.set(item.source_file_id, [
      ...(groupedQuestions.get(item.source_file_id) ?? []),
      parsedQuestion,
    ]);
  }

  if (!groupedQuestions.size) {
    return NextResponse.json({ error: "No pending questions found." }, { status: 400 });
  }

  try {
    const insertedQuestionIds = await approvePendingQuestionGroups(
      user.id,
      Array.from(groupedQuestions.entries()).map(([sourceFileId, questions]) => ({
        sourceFileId,
        subjectId: sourceFileMap.get(sourceFileId)!.subject_id,
        questions,
      })),
    );

    return NextResponse.json({ insertedQuestionIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve pending questions." },
      { status: 400 },
    );
  }
}
