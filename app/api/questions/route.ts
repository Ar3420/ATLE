import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { questionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();
  const subjectId = body.subject_id as string;
  const parsed = questionSchema.parse(body);
  const supabase = createServerSupabaseClient();

  const { data: question, error } = await supabase
    .from("questions")
    .insert({
      user_id: user.id,
      subject_id: subjectId,
      source_file_id: body.source_file_id ?? null,
      question_text: parsed.question_text,
      type: parsed.type,
      topic: parsed.topic,
      subtopic: parsed.subtopic,
      difficulty: parsed.difficulty,
      answer: parsed.answer,
      explanation: parsed.explanation ?? null,
      rubric_json: parsed.rubric_json ?? null,
      metadata_json: parsed.metadata_json ?? {},
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (parsed.type === "multiple_choice" && parsed.choices.length) {
    const { error: choicesError } = await supabase.from("choices").insert(
      parsed.choices.map((choice) => ({
        question_id: question.id,
        text: choice.text,
        is_correct: choice.is_correct,
      })),
    );

    if (choicesError) {
      return NextResponse.json({ error: choicesError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ question });
}
