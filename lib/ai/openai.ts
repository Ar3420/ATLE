import OpenAI from "openai";

import { env } from "@/lib/env";
import {
  clusterItemSchema,
  extractedQuestionSchema,
  type ExtractedQuestion,
} from "@/lib/validation";

function extractJsonPayload(rawText: string) {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function normalizeExtractedQuestions(questions: unknown) {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.map((question) => {
    if (!question || typeof question !== "object") {
      return question;
    }

    const record = question as Record<string, unknown>;
    const normalizedChoices = Array.isArray(record.choices)
      ? record.choices.map((choice) => {
          if (choice && typeof choice === "object") {
            const choiceRecord = choice as Record<string, unknown>;
            return {
              text: String(choiceRecord.text ?? ""),
              is_correct: Boolean(choiceRecord.is_correct),
            };
          }

          return {
            text: String(choice ?? ""),
            is_correct: String(choice ?? "").trim() === String(record.answer ?? "").trim(),
          };
        })
      : [];

    return {
      ...record,
      choices: normalizedChoices,
      explanation:
        typeof record.explanation === "string" && record.explanation.trim().length
          ? record.explanation
          : null,
    };
  });
}

function getClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}

async function createJsonResponse(input: OpenAI.Chat.ChatCompletionCreateParams) {
  const client = getClient();
  const response = await client.chat.completions.create({
    ...input,
    stream: false,
  });
  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}

async function createPdfJsonResponse(input: {
  pdfBase64: string;
  pdfFilename: string;
  instructions: string;
}) {
  const client = getClient();
  const response = await client.responses.create({
    model: "gpt-4o",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: input.instructions,
          },
          {
            type: "input_file",
            filename: input.pdfFilename,
            file_data: `data:application/pdf;base64,${input.pdfBase64}`,
          },
        ],
      },
    ],
  });

  const outputText =
    "output_text" in response && typeof response.output_text === "string"
      ? response.output_text
      : "";

  if (!outputText) {
    throw new Error("OpenAI returned an empty PDF extraction response.");
  }

  return outputText;
}

export async function extractQuestionsWithOpenAI(input: {
  documentText?: string;
  imageBase64?: string;
  imageMediaType?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  label: string;
}) {
  const instructions =
    'You are extracting exam questions from an academic document. Extract every question. For each return: question_text, type: multiple_choice or long_response, choices (array of { text, is_correct }) if MC, answer (text), topic (infer from content), subtopic (infer from content), difficulty (1-5, estimate based on complexity), explanation (optional, brief), uncertain (boolean). Return strict JSON in the shape {"questions":[...]}. No markdown or extra text.';

  if (input.pdfBase64) {
    const rawText = await createPdfJsonResponse({
      pdfBase64: input.pdfBase64,
      pdfFilename: input.pdfFilename ?? "source-document.pdf",
      instructions: `${instructions} Label: ${input.label}.`,
    });

    const parsed = JSON.parse(extractJsonPayload(rawText)) as { questions?: unknown };
    return extractedQuestionSchema
      .array()
      .parse(normalizeExtractedQuestions(parsed.questions)) as ExtractedQuestion[];
  }

  const content: OpenAI.Chat.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: instructions,
    },
  ];

  if (input.imageBase64 && input.imageMediaType) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${input.imageMediaType};base64,${input.imageBase64}`,
      },
    });
  } else if (input.documentText) {
    content.push({
      type: "text",
      text: `Label: ${input.label}\n\nDocument:\n${input.documentText}`,
    });
  }

  const rawText = await createJsonResponse({
    model: "gpt-4o",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content }],
  });

  const parsed = JSON.parse(extractJsonPayload(rawText)) as { questions?: unknown };
  return extractedQuestionSchema
    .array()
    .parse(normalizeExtractedQuestions(parsed.questions)) as ExtractedQuestion[];
}

export async function clusterWeaknessesWithOpenAI(
  items: Array<{
    topic: string;
    subtopic: string;
    error_type: string | null;
  }>,
) {
  const rawText = await createJsonResponse({
    model: "gpt-4o",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              'Given this list of wrong answers with their topics, subtopics, and error types, identify the top recurring weakness clusters. Group related errors into named clusters. Return strict JSON in the shape {"clusters":[{ "cluster_name": string, "topic": string, "subtopic": string, "error_count": number }]}. No other text.',
          },
          {
            type: "text",
            text: JSON.stringify(items),
          },
        ],
      },
    ],
  });

  const parsed = JSON.parse(extractJsonPayload(rawText)) as { clusters?: unknown };
  return clusterItemSchema.array().parse(parsed.clusters ?? []);
}
