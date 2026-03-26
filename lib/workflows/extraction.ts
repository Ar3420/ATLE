import { extractQuestionsWithOpenAI } from "@/lib/ai/openai";
import { downloadSourceFile, parseSourceFile } from "@/lib/ai/extract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { extractedQuestionSchema } from "@/lib/validation";

export async function runExtractionWorkflow(input: {
  userId: string;
  sourceFileId: string;
  filePath: string;
  label: string;
  subjectId: string;
  fileType: "pdf" | "image" | "text";
}) {
  const supabase = createServerSupabaseClient();

  await supabase
    .from("source_files")
    .update({ processing_status: "extracting" })
    .eq("id", input.sourceFileId)
    .eq("user_id", input.userId);

  try {
    const blob = await downloadSourceFile(input.filePath);
    const parsedFile = await parseSourceFile(blob, input.fileType);

    const extractedQuestions = await extractQuestionsWithOpenAI({
      ...parsedFile,
      label: input.label,
    });

    const safeQuestions = [] as ReturnType<typeof extractedQuestionSchema.parse>[];
    const validationErrors: string[] = [];

    extractedQuestions.forEach((question, index) => {
      const parsedQuestion = extractedQuestionSchema.safeParse(question);

      if (parsedQuestion.success) {
        safeQuestions.push(parsedQuestion.data);
        return;
      }

      const firstIssue = parsedQuestion.error.issues[0];
      validationErrors.push(
        `Question ${index + 1}: ${firstIssue?.path.join(".") || "unknown field"} ${firstIssue?.message ?? "is invalid"}.`,
      );
    });

    await supabase
      .from("pending_questions")
      .delete()
      .eq("user_id", input.userId)
      .eq("source_file_id", input.sourceFileId);

    if (!safeQuestions.length) {
      const detail = validationErrors[0] ?? "The model returned no valid questions.";
      throw new Error(`Extraction returned no reviewable questions. ${detail}`);
    }

    if (safeQuestions.length) {
      const { error: insertError } = await supabase.from("pending_questions").insert(
        safeQuestions.map((question) => ({
          user_id: input.userId,
          source_file_id: input.sourceFileId,
          question_text: question.question_text,
          type: question.type,
          topic: question.topic,
          subtopic: question.subtopic,
          difficulty: question.difficulty,
          answer: question.answer,
          explanation: question.explanation ?? null,
          rubric_json: question.rubric_json ?? null,
          metadata_json: question.metadata_json ?? {},
          choices_json: question.choices,
          uncertain: question.uncertain ?? false,
        })),
      );

      if (insertError) {
        throw insertError;
      }
    }

    await supabase
      .from("source_files")
      .update({ processing_status: "review_ready" })
      .eq("id", input.sourceFileId)
      .eq("user_id", input.userId);

    return {
      questions: safeQuestions,
      error:
        validationErrors.length > 0
          ? `${validationErrors.length} extracted question(s) were skipped. ${validationErrors[0]}`
          : null,
    };
  } catch (error) {
    await supabase
      .from("source_files")
      .update({ processing_status: "failed" })
      .eq("id", input.sourceFileId)
      .eq("user_id", input.userId);

    return {
      questions: [],
      error: error instanceof Error ? error.message : "Extraction failed.",
    };
  }
}
