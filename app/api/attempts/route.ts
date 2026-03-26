import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { attemptSchema } from "@/lib/validation";
import { recalculateWeaknessClusters } from "@/lib/workflows/clusters";

export async function POST(request: Request) {
  const user = await requireUser();
  const input = attemptSchema.parse(await request.json());
  const supabase = createServerSupabaseClient();

  const mcResults = input.results.filter((result) => result.type === "multiple_choice");
  const lrResults = input.results.filter((result) => result.type === "long_response");
  const totalScore = input.results.reduce((sum, result) => {
    if (result.type === "long_response") {
      return sum + (result.score ?? (result.is_correct ? 1 : 0));
    }
    return sum + (result.is_correct ? 1 : 0);
  }, 0);

  const percentage = input.results.length ? (totalScore / input.results.length) * 100 : 0;
  const mcAccuracy = mcResults.length
    ? (mcResults.filter((result) => result.is_correct).length / mcResults.length) * 100
    : 0;
  const lrAccuracy = lrResults.length
    ? (lrResults.reduce((sum, result) => sum + (result.score ?? (result.is_correct ? 1 : 0)), 0) /
        lrResults.length) *
      100
    : 0;

  const { data: attempt, error } = await supabase
    .from("attempts")
    .insert({
      test_id: input.test_id,
      user_id: user.id,
      score: Math.round(totalScore),
      percentage,
      mc_accuracy: mcAccuracy,
      lr_accuracy: lrAccuracy,
      time_taken: input.time_taken,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: resultsError } = await supabase.from("attempt_question_results").insert(
    input.results.map((result) => ({
      attempt_id: attempt.id,
      question_id: result.question_id,
      is_correct: result.type === "long_response" ? (result.score ?? 0) >= 1 : result.is_correct,
      error_type: result.error_type ?? null,
      user_answer:
        result.type === "long_response"
          ? JSON.stringify({
              response: result.user_answer ?? "",
              score: result.score ?? 0,
            })
          : result.user_answer ?? null,
    })),
  );

  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 400 });
  }

  await recalculateWeaknessClusters(user.id);

  return NextResponse.json({ attempt });
}
