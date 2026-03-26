"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_TYPES } from "@/lib/constants";
import type { TableRow } from "@/lib/types/database";

type QuestionRow = TableRow<"questions"> & {
  choices: TableRow<"choices">[];
};

function choicesToText(choices: TableRow<"choices">[]) {
  return choices.map((choice) => `${choice.text}|${choice.is_correct ? "true" : "false"}`).join("\n");
}

function textToChoices(value: string) {
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

export function QuestionBankClient({
  subjects,
  initialQuestions,
}: {
  subjects: TableRow<"subjects">[];
  initialQuestions: QuestionRow[];
}) {
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const [questions, setQuestions] = useState(
    initialQuestions.map((question) => ({
      ...question,
      choices_text: choicesToText(question.choices),
    })),
  );
  const [filters, setFilters] = useState({
    subjectId: "",
    topic: "",
    subtopic: "",
    type: "",
    difficulty: "",
    search: "",
  });
  const [draft, setDraft] = useState({
    subject_id: subjects[0]?.id ?? "",
    question_text: "",
    type: "multiple_choice",
    topic: "",
    subtopic: "",
    difficulty: 3,
    answer: "",
    explanation: "",
    choices_text: "",
  });
  const [isSeeding, setIsSeeding] = useState(false);

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      if (filters.subjectId && question.subject_id !== filters.subjectId) return false;
      if (filters.topic && !question.topic.toLowerCase().includes(filters.topic.toLowerCase())) return false;
      if (filters.subtopic && !question.subtopic.toLowerCase().includes(filters.subtopic.toLowerCase())) return false;
      if (filters.type && question.type !== filters.type) return false;
      if (filters.difficulty && question.difficulty !== Number(filters.difficulty)) return false;
      if (
        filters.search &&
        !question.question_text.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [filters, questions]);

  async function createQuestion() {
    const response = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...draft,
        difficulty: Number(draft.difficulty),
        choices: textToChoices(draft.choices_text),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error ?? "Failed to create question.");
      return;
    }

    setQuestions((current) => [
      {
        ...data.question,
        choices: textToChoices(draft.choices_text).map((choice, index) => ({
          id: `temp-${index}`,
          question_id: data.question.id,
          text: choice.text,
          is_correct: choice.is_correct,
        })),
        choices_text: draft.choices_text,
      },
      ...current,
    ]);
    setDraft({
      subject_id: subjects[0]?.id ?? "",
      question_text: "",
      type: "multiple_choice",
      topic: "",
      subtopic: "",
      difficulty: 3,
      answer: "",
      explanation: "",
      choices_text: "",
    });
    toast.success("Question added.");
  }

  async function seedMockQuestions() {
    setIsSeeding(true);
    const response = await fetch("/api/dev/seed-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        force_mock_subject: true,
      }),
    });
    const data = await response.json();
    setIsSeeding(false);

    if (!response.ok) {
      toast.error(data.error ?? "Failed to seed mock questions.");
      return;
    }

    toast.success(
      data.inserted
        ? `Inserted ${data.inserted} mock questions into ${data.subject_name}.`
        : data.message ?? "Mock questions already exist.",
    );
    window.location.reload();
  }

  async function saveQuestion(questionId: string) {
    const row = questions.find((question) => question.id === questionId);
    if (!row) return;

    const response = await fetch(`/api/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_text: row.question_text,
        type: row.type,
        topic: row.topic,
        subtopic: row.subtopic,
        difficulty: Number(row.difficulty),
        answer: row.answer,
        explanation: row.explanation,
        choices: textToChoices(row.choices_text),
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error ?? "Failed to save question.");
      return;
    }

    toast.success("Question updated.");
  }

  async function deleteQuestion(questionId: string) {
    const response = await fetch(`/api/questions/${questionId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Failed to delete question.");
      return;
    }

    setQuestions((current) => current.filter((question) => question.id !== questionId));
    toast.success("Question removed.");
  }

  const columns: ColumnDef<(typeof questions)[number]>[] = [
      {
        accessorKey: "question_text",
        header: "Question",
        cell: ({ row }) => (
          <Textarea
            value={row.original.question_text}
            onChange={(event) =>
              setQuestions((current) =>
                current.map((question) =>
                  question.id === row.original.id
                    ? { ...question, question_text: event.target.value }
                    : question,
                ),
              )
            }
            className="min-w-[280px]"
          />
        ),
      },
      {
        accessorKey: "subject_id",
        header: "Subject",
        cell: ({ row }) => (
          <span className="whitespace-nowrap rounded-full border border-[#eadab4] bg-[#fff6e3] px-3 py-1 text-xs font-medium text-[#8c6f36]">
            {subjectMap.get(row.original.subject_id) ?? "Unknown Subject"}
          </span>
        ),
      },
      {
        accessorKey: "topic",
        header: "Topic",
        cell: ({ row }) => (
          <Input
            value={row.original.topic}
            onChange={(event) =>
              setQuestions((current) =>
                current.map((question) =>
                  question.id === row.original.id ? { ...question, topic: event.target.value } : question,
                ),
              )
            }
          />
        ),
      },
      {
        accessorKey: "subtopic",
        header: "Subtopic",
        cell: ({ row }) => (
          <Input
            value={row.original.subtopic}
            onChange={(event) =>
              setQuestions((current) =>
                current.map((question) =>
                  question.id === row.original.id ? { ...question, subtopic: event.target.value } : question,
                ),
              )
            }
          />
        ),
      },
      {
        accessorKey: "difficulty",
        header: "Difficulty",
        cell: ({ row }) => (
          <Input
            type="number"
            min={1}
            max={5}
            value={row.original.difficulty}
            onChange={(event) =>
              setQuestions((current) =>
                current.map((question) =>
                  question.id === row.original.id
                    ? { ...question, difficulty: Number(event.target.value) }
                    : question,
                ),
              )
            }
            className="w-20"
          />
        ),
      },
      {
        accessorKey: "answer",
        header: "Answer / Choices",
        cell: ({ row }) => (
          <div className="space-y-2">
            <Textarea
              value={row.original.answer}
              onChange={(event) =>
                setQuestions((current) =>
                  current.map((question) =>
                    question.id === row.original.id ? { ...question, answer: event.target.value } : question,
                  ),
                )
              }
            />
            {row.original.type === "multiple_choice" ? (
              <Textarea
                value={row.original.choices_text}
                onChange={(event) =>
                  setQuestions((current) =>
                    current.map((question) =>
                      question.id === row.original.id
                        ? { ...question, choices_text: event.target.value }
                        : question,
                    ),
                  )
                }
                placeholder="Choice text|true"
              />
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveQuestion(row.original.id)}>
              Save
            </Button>
            <Button variant="danger" size="sm" onClick={() => deleteQuestion(row.original.id)}>
              Delete
            </Button>
          </div>
        ),
      },
    ];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Manual Entry</CardTitle>
          <CardDescription>The bank remains fully functional without any AI-generated questions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>Subject</Label>
            <Select
              value={draft.subject_id}
              onChange={(event) => setDraft((current) => ({ ...current, subject_id: event.target.value }))}
              options={subjects.map((subject) => ({ label: subject.name, value: subject.id }))}
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={draft.type}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
              options={QUESTION_TYPES.map((type) => ({ label: type, value: type }))}
            />
          </div>
          <div>
            <Label>Topic</Label>
            <Input
              value={draft.topic}
              onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))}
            />
          </div>
          <div>
            <Label>Subtopic</Label>
            <Input
              value={draft.subtopic}
              onChange={(event) => setDraft((current) => ({ ...current, subtopic: event.target.value }))}
            />
          </div>
          <div className="xl:col-span-2">
            <Label>Question Text</Label>
            <Textarea
              value={draft.question_text}
              onChange={(event) => setDraft((current) => ({ ...current, question_text: event.target.value }))}
            />
          </div>
          <div>
            <Label>Answer</Label>
            <Textarea
              value={draft.answer}
              onChange={(event) => setDraft((current) => ({ ...current, answer: event.target.value }))}
            />
          </div>
          <div>
            <Label>Explanation</Label>
            <Textarea
              value={draft.explanation}
              onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))}
            />
          </div>
          <div>
            <Label>Difficulty</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={draft.difficulty}
              onChange={(event) => setDraft((current) => ({ ...current, difficulty: Number(event.target.value) }))}
            />
          </div>
          <div className="xl:col-span-3">
            <Label>Choices (MC only)</Label>
            <Textarea
              value={draft.choices_text}
              onChange={(event) => setDraft((current) => ({ ...current, choices_text: event.target.value }))}
              placeholder={"Choice A|false\nChoice B|true"}
            />
          </div>
          <div className="xl:col-span-4 flex flex-wrap gap-3">
            <Button onClick={createQuestion}>Add Question</Button>
            <Button variant="secondary" onClick={seedMockQuestions} disabled={isSeeding}>
              {isSeeding ? "Seeding..." : "Seed Mock Questions"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Question Bank</CardTitle>
          <CardDescription>Filter, search, edit inline, inspect choices, and delete from the bank.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <Select
              value={filters.subjectId}
              onChange={(event) => setFilters((current) => ({ ...current, subjectId: event.target.value }))}
              options={subjects.map((subject) => ({ label: subject.name, value: subject.id }))}
              placeholder="All subjects"
            />
            <Input
              placeholder="Topic"
              value={filters.topic}
              onChange={(event) => setFilters((current) => ({ ...current, topic: event.target.value }))}
            />
            <Input
              placeholder="Subtopic"
              value={filters.subtopic}
              onChange={(event) => setFilters((current) => ({ ...current, subtopic: event.target.value }))}
            />
            <Select
              value={filters.type}
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
              options={QUESTION_TYPES.map((type) => ({ label: type, value: type }))}
              placeholder="All types"
            />
            <Input
              placeholder="Difficulty 1-5"
              value={filters.difficulty}
              onChange={(event) => setFilters((current) => ({ ...current, difficulty: event.target.value }))}
            />
            <Input
              placeholder="Search question text"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </div>
          <DataTable columns={columns} data={filteredQuestions} emptyMessage="No questions in bank yet." />
        </CardContent>
      </Card>
    </div>
  );
}
