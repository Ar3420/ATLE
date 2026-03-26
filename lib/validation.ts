import { z } from "zod";

import { ERROR_TYPES, QUESTION_TYPES, SOURCE_FILE_LABELS, TEST_TYPES } from "@/lib/constants";

export const subjectSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  icon: z.string().min(1).max(40),
  is_active: z.boolean().optional().default(true),
});

export const choiceSchema = z.object({
  text: z.string().min(1),
  is_correct: z.boolean(),
});

export const questionSchema = z.object({
  id: z.string().uuid().optional(),
  question_text: z.string().min(1),
  type: z.enum(QUESTION_TYPES),
  topic: z.string().min(1),
  subtopic: z.string().min(1),
  difficulty: z.number().int().min(1).max(5),
  answer: z.string().min(1),
  explanation: z.string().optional().nullable(),
  rubric_json: z.record(z.any()).nullable().optional(),
  metadata_json: z.record(z.any()).optional().default({}),
  choices: z.array(choiceSchema).optional().default([]),
});

export const extractedQuestionSchema = questionSchema.extend({
  topic: z.string().min(1).optional().default("General"),
  subtopic: z.string().min(1).optional().default("Core Concepts"),
  explanation: z.string().nullable().optional(),
  uncertain: z.boolean().optional().default(false),
});

export const uploadSchema = z.object({
  subject_id: z.string().uuid(),
  label: z.enum(SOURCE_FILE_LABELS),
});

export const standardGenerateSchema = z.object({
  mode: z.literal("standard"),
  type: z.enum(TEST_TYPES),
  subject_ids: z.array(z.string().uuid()).min(1),
  mc_count: z.number().int().min(0),
  lr_count: z.number().int().min(0),
  difficulty_distribution: z.record(z.string(), z.number().min(0)),
  weakness_weight: z.boolean(),
});

export const targetedGenerateSchema = z.object({
  mode: z.literal("targeted"),
  type: z.enum(TEST_TYPES),
  subject_id: z.string().uuid(),
  topic: z.string().optional().nullable(),
  subtopic: z.string().optional().nullable(),
  question_type: z.enum(["multiple_choice", "long_response", "mixed"]).default("mixed"),
  total_count: z.number().int().min(1),
  difficulty_distribution: z.record(z.string(), z.number().min(0)),
  weakness_weight: z.boolean().default(true),
});

export const generateTestSchema = z.discriminatedUnion("mode", [
  standardGenerateSchema,
  targetedGenerateSchema,
]);

export const attemptQuestionSchema = z.object({
  question_id: z.string().uuid(),
  is_correct: z.boolean(),
  error_type: z.enum(ERROR_TYPES).nullable().optional(),
  user_answer: z.string().nullable().optional(),
  score: z.number().min(0).max(1).optional(),
  type: z.enum(QUESTION_TYPES),
});

export const attemptSchema = z.object({
  test_id: z.string().uuid(),
  time_taken: z.number().int().min(0),
  notes: z.string().nullable().optional(),
  results: z.array(attemptQuestionSchema).min(1),
});

export const clusterItemSchema = z.object({
  cluster_name: z.string().min(1),
  topic: z.string().min(1),
  subtopic: z.string().min(1),
  error_count: z.number().int().min(0),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;
export type GenerateTestInput = z.infer<typeof generateTestSchema>;
export type AttemptInput = z.infer<typeof attemptSchema>;
