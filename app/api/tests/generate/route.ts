import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getGenerationCandidates, getSubjects } from "@/lib/server-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { selectQuestions } from "@/lib/tests/scoring";
import { generateTestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await requireUser();
  const input = generateTestSchema.parse(await request.json());
  const supabase = createServerSupabaseClient();
  const [subjectRows, generationContext] = await Promise.all([
    getSubjects(user.id),
    getGenerationCandidates(user.id, input),
  ]);

  const selectedQuestions = selectQuestions(
    generationContext.candidates,
    input,
    generationContext.recentQuestionIds,
  );

  if (!selectedQuestions.length) {
    return NextResponse.json(
      { error: "No questions matched the current generation rules." },
      { status: 400 },
    );
  }

  const relevantSubjects = subjectRows.filter((subject) =>
    new Set(selectedQuestions.map((question) => question.subject_id)).has(subject.id),
  );
  const title =
    input.mode === "standard"
      ? `${input.type[0].toUpperCase()}${input.type.slice(1)} Test • ${new Date().toLocaleDateString()}`
      : `Targeted ${relevantSubjects[0]?.name ?? "Custom"} Test • ${new Date().toLocaleDateString()}`;

  const { data: test, error } = await supabase
    .from("tests")
    .insert({
      user_id: user.id,
      title,
      type: input.type,
      scope_json:
        input.mode === "standard"
          ? { subject_ids: input.subject_ids }
          : {
              subject_id: input.subject_id,
              topic: input.topic ?? null,
              subtopic: input.subtopic ?? null,
              question_type: input.question_type,
            },
      config_json:
        input.mode === "standard"
          ? {
              mc_count: input.mc_count,
              lr_count: input.lr_count,
              difficulty_distribution: input.difficulty_distribution,
              weakness_weight: input.weakness_weight,
            }
          : {
              total_count: input.total_count,
              difficulty_distribution: input.difficulty_distribution,
              weakness_weight: input.weakness_weight,
            },
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("test_questions").insert(
    selectedQuestions.map((question, index) => ({
      test_id: test.id,
      question_id: question.id,
      order_index: index + 1,
    })),
  );

  for (const question of selectedQuestions) {
    await supabase
      .from("questions")
      .update({ times_used: question.times_used + 1 })
      .eq("id", question.id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({
    test,
    question_count: selectedQuestions.length,
    subject_breakdown: relevantSubjects.map((subject) => ({
      subject: subject.name,
      count: selectedQuestions.filter((question) => question.subject_id === subject.id).length,
    })),
  });
}
