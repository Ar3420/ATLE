import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { MOCK_QUESTION_SEEDS, MOCK_SUBJECT } from "@/lib/mock-data/questions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const body = await request.json().catch(() => ({}));
  const forceMockSubject = body.force_mock_subject !== false;

  let subjectId =
    !forceMockSubject && typeof body.subject_id === "string" ? body.subject_id : "";

  if (!subjectId) {
    const { data: existingSubject } = await supabase
      .from("subjects")
      .select("*")
      .eq("user_id", user.id)
      .ilike("name", MOCK_SUBJECT.name)
      .maybeSingle();

    if (existingSubject) {
      subjectId = existingSubject.id;
    } else {
      const { data: createdSubject, error: subjectError } = await supabase
        .from("subjects")
        .insert({
          user_id: user.id,
          name: MOCK_SUBJECT.name,
          color: MOCK_SUBJECT.color,
          icon: MOCK_SUBJECT.icon,
          is_active: true,
        })
        .select("*")
        .single();

      if (subjectError || !createdSubject) {
        return NextResponse.json(
          { error: subjectError?.message ?? "Failed to create mock subject." },
          { status: 400 },
        );
      }

      subjectId = createdSubject.id;
    }
  }

  const { data: existingQuestions } = await supabase
    .from("questions")
    .select("id")
    .eq("user_id", user.id)
    .eq("subject_id", subjectId)
    .contains("metadata_json", { mock: true });

  if ((existingQuestions ?? []).length > 0) {
    return NextResponse.json({
      inserted: 0,
      subject_id: subjectId,
      message: "Mock questions already exist for this subject.",
    });
  }

  let insertedCount = 0;

  for (const seed of MOCK_QUESTION_SEEDS) {
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .insert({
        ...seed.question,
        user_id: user.id,
        subject_id: subjectId,
      })
      .select("*")
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: questionError?.message ?? "Failed to insert mock question." },
        { status: 400 },
      );
    }

    if (seed.choices?.length) {
      const { error: choicesError } = await supabase.from("choices").insert(
        seed.choices.map((choice) => ({
          ...choice,
          question_id: question.id,
        })),
      );

      if (choicesError) {
        return NextResponse.json(
          { error: choicesError.message },
          { status: 400 },
        );
      }
    }

    insertedCount += 1;
  }

  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", subjectId)
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    inserted: insertedCount,
    subject_id: subjectId,
    subject_name: subject?.name ?? MOCK_SUBJECT.name,
  });
}
