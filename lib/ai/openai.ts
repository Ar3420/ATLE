import OpenAI from "openai";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { QUESTION_TYPES } from "@/lib/constants";
import { env } from "@/lib/env";
import { clusterItemSchema } from "@/lib/validation";

const extractedChoiceOutputSchema = z.object({
  text: z.string(),
  is_correct: z.boolean(),
});

const extractedQuestionOutputSchema = z.object({
  question_text: z.string(),
  type: z.enum(QUESTION_TYPES),
  topic: z.string().optional().default("General"),
  subtopic: z.string().optional().default("Core Concepts"),
  difficulty: z.number().int().min(1).max(5),
  answer: z.string().optional().default(""),
  explanation: z.string().nullable().optional().default(null),
  uncertain: z.boolean().optional().default(false),
  choices: z.array(extractedChoiceOutputSchema).optional().default([]),
});

const extractedQuestionResponseSchema = z.object({
  questions: z.array(extractedQuestionOutputSchema).default([]),
});

const clusterResponseSchema = z.object({
  clusters: z.array(clusterItemSchema).default([]),
});

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
    const inferredAnswer =
      typeof record.answer === "string" && record.answer.trim().length
        ? record.answer
        : normalizedChoices.find((choice) => choice.is_correct)?.text ?? "";

    return {
      ...record,
      answer: inferredAnswer,
      choices: normalizedChoices,
      explanation:
        typeof record.explanation === "string" && record.explanation.trim().length
          ? record.explanation
          : null,
    };
  });
}

function summarizeOutputText(rawText: string) {
  return rawText.replace(/\s+/g, " ").trim().slice(0, 160);
}

function toStructuredOutputError(error: unknown, task: string) {
  const message = error instanceof Error ? error.message : "";

  if (
    message.includes("No object generated") ||
    message.includes("not valid JSON") ||
    message.includes("Unexpected token") ||
    message.includes("JSON.parse")
  ) {
    return new Error(
      `OpenAI did not return valid structured ${task} output for this file.`,
    );
  }

  return error instanceof Error ? error : new Error(`OpenAI ${task} failed.`);
}

function getClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
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

async function createStructuredPdfExtraction(input: {
  pdfBase64: string;
  pdfFilename: string;
  instructions: string;
}) {
  const client = getClient();

  try {
    const response = await client.responses.parse({
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
      text: {
        format: zodTextFormat(extractedQuestionResponseSchema, "extracted_questions"),
      },
    });

    if (!response.output_parsed) {
      throw new Error("OpenAI returned no structured PDF extraction content.");
    }

    return response.output_parsed;
  } catch (error) {
    let fallbackRawText = "";

    try {
      fallbackRawText = await createPdfJsonResponse(input);
      return extractedQuestionResponseSchema.parse(JSON.parse(extractJsonPayload(fallbackRawText)));
    } catch (fallbackError) {
      console.error("PDF extraction failed after structured-output fallback.", {
        primaryError: error instanceof Error ? error.message : error,
        fallbackError: fallbackError instanceof Error ? fallbackError.message : fallbackError,
        responsePreview: fallbackRawText ? summarizeOutputText(fallbackRawText) : null,
      });
      throw toStructuredOutputError(fallbackError, "question extraction");
    }
  }
}

async function createStructuredChatJsonResponse(input: {
  content: OpenAI.Chat.ChatCompletionContentPart[];
}) {
  const client = getClient();

  try {
    const response = await client.beta.chat.completions.parse({
      model: "gpt-4o",
      temperature: 0,
      messages: [{ role: "user", content: input.content }],
      response_format: zodResponseFormat(
        extractedQuestionResponseSchema,
        "extracted_questions",
      ),
    });

    const parsed = response.choices[0]?.message?.parsed;

    if (!parsed) {
      throw new Error("OpenAI returned no structured extraction content.");
    }

    return parsed;
  } catch (error) {
    throw toStructuredOutputError(error, "question extraction");
  }
}

async function createStructuredClusterResponse(input: {
  items: Array<{
    topic: string;
    subtopic: string;
    error_type: string | null;
  }>;
}) {
  const client = getClient();

  try {
    const response = await client.beta.chat.completions.parse({
      model: "gpt-4o",
      temperature: 0,
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
              text: JSON.stringify(input.items),
            },
          ],
        },
      ],
      response_format: zodResponseFormat(clusterResponseSchema, "weakness_clusters"),
    });

    const parsed = response.choices[0]?.message?.parsed;

    if (!parsed) {
      throw new Error("OpenAI returned no structured cluster content.");
    }

    return parsed;
  } catch (error) {
    throw toStructuredOutputError(error, "weakness clustering");
  }
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
    const parsed = await createStructuredPdfExtraction({
      pdfBase64: input.pdfBase64,
      pdfFilename: input.pdfFilename ?? "source-document.pdf",
      instructions: `${instructions} Label: ${input.label}.`,
    });
    return normalizeExtractedQuestions(parsed.questions);
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

  const parsed = await createStructuredChatJsonResponse({ content });
  return normalizeExtractedQuestions(parsed.questions);
}

export async function clusterWeaknessesWithOpenAI(
  items: Array<{
    topic: string;
    subtopic: string;
    error_type: string | null;
  }>,
) {
  const parsed = await createStructuredClusterResponse({ items });
  return clusterItemSchema.array().parse(parsed.clusters ?? []);
}
