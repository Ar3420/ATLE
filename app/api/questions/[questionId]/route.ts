import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { questionSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: { questionId: string } },
) {
  const user = await requireUser();
  const body = questionSchema.partial().parse(await request.json());
  const supabase = createServerSupabaseClient();

  const updatePayload = {
    question_text: body.question_text,
    type: body.type,
    topic: body.topic,
    subtopic: body.subtopic,
    difficulty: body.difficulty,
    answer: body.answer,
    explanation: body.explanation,
    rubric_json: body.rubric_json,
    metadata_json: body.metadata_json,
  };

  const { data, error } = await supabase
    .from("questions")
    .update(updatePayload)
    .eq("id", params.questionId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (body.choices) {
    await supabase.from("choices").delete().eq("question_id", params.questionId);
    if (body.choices.length) {
      await supabase.from("choices").insert(
        body.choices.map((choice) => ({
          question_id: params.questionId,
          text: choice.text,
          is_correct: choice.is_correct,
        })),
      );
    }
  }

  return NextResponse.json({ question: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { questionId: string } },
) {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", params.questionId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
