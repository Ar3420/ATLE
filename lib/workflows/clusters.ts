import { clusterWeaknessesWithOpenAI } from "@/lib/ai/openai";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function recalculateWeaknessClusters(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data: results, error } = await supabase
    .from("attempt_question_results")
    .select("*");

  if (error) {
    throw error;
  }

  const { data: attempts } = await supabase
    .from("attempts")
    .select("*")
    .eq("user_id", userId);
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("user_id", userId);

  const attemptIds = new Set((attempts ?? []).map((attempt) => attempt.id));
  const questionMap = new Map((questions ?? []).map((question) => [question.id, question]));

  const wrongAnswers = (results ?? [])
    .filter((result) => attemptIds.has(result.attempt_id) && !result.is_correct)
    .map((result) => {
      const question = questionMap.get(result.question_id);
      return question
        ? {
            question_id: question.id,
            subject_id: question.subject_id,
            topic: question.topic,
            subtopic: question.subtopic,
            error_type: result.error_type,
          }
        : null;
    })
    .filter(Boolean) as Array<{
    question_id: string;
    subject_id: string;
    topic: string;
    subtopic: string;
    error_type: string | null;
  }>;

  if (!wrongAnswers.length) {
    await supabase.from("weakness_clusters").delete().eq("user_id", userId);
    return [];
  }

  const clusters = await clusterWeaknessesWithOpenAI(
    wrongAnswers.map((item) => ({
      topic: item.topic,
      subtopic: item.subtopic,
      error_type: item.error_type,
    })),
  );

  await supabase.from("weakness_clusters").delete().eq("user_id", userId);

  const inserts = clusters.map((cluster) => {
    const matchingQuestion = wrongAnswers.find(
      (item) => item.topic === cluster.topic && item.subtopic === cluster.subtopic,
    );

    return {
      user_id: userId,
      subject_id: matchingQuestion?.subject_id ?? wrongAnswers[0].subject_id,
      cluster_name: cluster.cluster_name,
      topic: cluster.topic,
      subtopic: cluster.subtopic,
      error_count: cluster.error_count,
    };
  });

  if (inserts.length) {
    await supabase.from("weakness_clusters").insert(inserts);
  }

  return inserts;
}
