import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { questionSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: { sourceFileId: string } },
) {
  const user = await requireUser();
  const body = await request.json();
  const questions = questionSchema.array().parse(body.questions ?? []);
  const subjectId = String(body.subject_id);
  const supabase = createServerSupabaseClient();

  const insertedQuestionIds: string[] = [];

  for (const question of questions) {
    const { data: inserted, error } = await supabase
      .from("questions")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        source_file_id: params.sourceFileId,
        question_text: question.question_text,
        type: question.type,
        topic: question.topic,
        subtopic: question.subtopic,
        difficulty: question.difficulty,
        answer: question.answer,
        explanation: question.explanation ?? null,
        rubric_json: question.rubric_json ?? null,
        metadata_json: question.metadata_json ?? {},
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    insertedQuestionIds.push(inserted.id);

    if (question.type === "multiple_choice" && question.choices.length) {
      const { error: choicesError } = await supabase.from("choices").insert(
        question.choices.map((choice) => ({
          question_id: inserted.id,
          text: choice.text,
          is_correct: choice.is_correct,
        })),
      );

      if (choicesError) {
        return NextResponse.json({ error: choicesError.message }, { status: 400 });
      }
    }
  }

  await supabase
    .from("pending_questions")
    .delete()
    .eq("user_id", user.id)
    .eq("source_file_id", params.sourceFileId);

  await supabase
    .from("source_files")
    .update({ processing_status: "review_ready" })
    .eq("id", params.sourceFileId)
    .eq("user_id", user.id);

  return NextResponse.json({ insertedQuestionIds });
}
