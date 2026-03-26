"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_TYPES } from "@/lib/constants";
import type { TableRow } from "@/lib/types/database";

function fromChoicesJson(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) =>
          typeof item === "object" && item
            ? `${String((item as { text?: string }).text ?? "")}|${Boolean((item as { is_correct?: boolean }).is_correct)}`
            : "",
        )
        .filter(Boolean)
        .join("\n")
    : "";
}

function toChoices(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [text, flag] = line.split("|");
      return {
        text: text?.trim() ?? "",
        is_correct: flag?.trim().toLowerCase() === "true",
      };
    });
}

export function ReviewClient({
  sourceFileId,
  subjectId,
  initialQuestions,
}: {
  sourceFileId: string;
  subjectId: string;
  initialQuestions: Array<TableRow<"pending_questions"> & { choices?: unknown }>;
}) {
  const [questions, setQuestions] = useState(
    initialQuestions.map((question) => ({
      question_text: question.question_text,
      type: question.type,
      topic: question.topic ?? "General",
      subtopic: question.subtopic ?? "Core Concepts",
      difficulty: question.difficulty,
      answer: question.answer,
      explanation: question.explanation ?? "",
      rubric_json: question.rubric_json,
      metadata_json: question.metadata_json,
      choices_text: fromChoicesJson(question.choices_json ?? question.choices),
    })),
  );

  function updateQuestion(index: number, key: string, value: string | number) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [key]: value } : question,
      ),
    );
  }

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      {
        question_text: "",
        type: "multiple_choice",
        topic: "General",
        subtopic: "Core Concepts",
        difficulty: 3,
        answer: "",
        explanation: "",
        rubric_json: null,
        metadata_json: {},
        choices_text: "",
      },
    ]);
  }

  async function approve() {
    const response = await fetch(`/api/questions/review/${sourceFileId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_id: subjectId,
        questions: questions.map((question) => ({
          ...question,
          choices: toChoices(question.choices_text),
          explanation: question.explanation || null,
        })),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Failed to save reviewed questions.");
      return;
    }

    toast.success("Questions saved to bank.");
    window.location.href = "/questions";
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Questions</CardTitle>
          <CardDescription>Review, edit, delete, or add questions before anything reaches the bank.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((question, index) => (
            <div key={`${index}-${question.question_text.slice(0, 12)}`} className="rounded-3xl border border-[#e4d7ba] bg-[#fffaf1] p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.2em] text-[#a18953]">
                  Question {index + 1}
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setQuestions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  Delete
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Question Text</Label>
                  <Textarea value={question.question_text} onChange={(event) => updateQuestion(index, "question_text", event.target.value)} />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select
                    value={question.type}
                    onChange={(event) => updateQuestion(index, "type", event.target.value)}
                    options={QUESTION_TYPES.map((type) => ({ label: type, value: type }))}
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Input type="number" min={1} max={5} value={question.difficulty} onChange={(event) => updateQuestion(index, "difficulty", Number(event.target.value))} />
                </div>
                <div>
                  <Label>Topic</Label>
                  <Input value={question.topic} onChange={(event) => updateQuestion(index, "topic", event.target.value)} />
                </div>
                <div>
                  <Label>Subtopic</Label>
                  <Input value={question.subtopic} onChange={(event) => updateQuestion(index, "subtopic", event.target.value)} />
                </div>
                <div>
                  <Label>Answer</Label>
                  <Textarea value={question.answer} onChange={(event) => updateQuestion(index, "answer", event.target.value)} />
                </div>
                <div>
                  <Label>Explanation</Label>
                  <Textarea value={question.explanation} onChange={(event) => updateQuestion(index, "explanation", event.target.value)} />
                </div>
                {question.type === "multiple_choice" ? (
                  <div className="md:col-span-2">
                    <Label>Choices</Label>
                    <Textarea
                      value={question.choices_text}
                      onChange={(event) => updateQuestion(index, "choices_text", event.target.value)}
                      placeholder={"Choice A|false\nChoice B|true"}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={addQuestion}>
              Add Manual Question
            </Button>
            <Button onClick={approve}>Confirm & Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
