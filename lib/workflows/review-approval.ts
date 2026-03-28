import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { QuestionInput } from "@/lib/validation";

type ApprovalGroup = {
  sourceFileId: string;
  subjectId: string;
  questions: QuestionInput[];
};

export async function approvePendingQuestionGroups(
  userId: string,
  groups: ApprovalGroup[],
) {
  const supabase = createServerSupabaseClient();
  const insertedQuestionIds: string[] = [];

  for (const group of groups) {
    for (const question of group.questions) {
      const { data: inserted, error } = await supabase
        .from("questions")
        .insert({
          user_id: userId,
          subject_id: group.subjectId,
          source_file_id: group.sourceFileId,
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
        throw new Error(error.message);
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
          throw new Error(choicesError.message);
        }
      }
    }

    await supabase
      .from("pending_questions")
      .delete()
      .eq("user_id", userId)
      .eq("source_file_id", group.sourceFileId);

    await supabase
      .from("source_files")
      .update({ processing_status: "review_ready" })
      .eq("id", group.sourceFileId)
      .eq("user_id", userId);
  }

  return insertedQuestionIds;
}
