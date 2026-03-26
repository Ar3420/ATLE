"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AttemptQuestion = {
  id: string;
  question_text: string;
  type: "multiple_choice" | "long_response";
};

export function AttemptLogClient({
  testId,
  questions,
}: {
  testId: string;
  questions: AttemptQuestion[];
}) {
  const [timeTaken, setTimeTaken] = useState(1800);
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState(
    questions.map((question) => ({
      question_id: question.id,
      type: question.type,
      is_correct: false,
      score: question.type === "long_response" ? 0 : undefined,
      error_type: null as string | null,
      user_answer: "",
    })),
  );

  async function submit() {
    const response = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        test_id: testId,
        time_taken: timeTaken,
        notes,
        results,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error ?? "Failed to save attempt.");
      return;
    }

    toast.success("Attempt saved.");
    window.location.href = `/tests/${testId}`;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attempt Meta</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Time Taken (seconds)</Label>
            <Input type="number" value={timeTaken} onChange={(event) => setTimeTaken(Number(event.target.value))} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle>
              {index + 1}. {question.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {question.type === "multiple_choice" ? (
              <div>
                <Label>Correctness</Label>
                <Select
                  value={String(results[index].is_correct)}
                  onChange={(event) =>
                    setResults((current) =>
                      current.map((result, resultIndex) =>
                        resultIndex === index
                          ? { ...result, is_correct: event.target.value === "true" }
                          : result,
                      ),
                    )
                  }
                  options={[
                    { label: "Incorrect", value: "false" },
                    { label: "Correct", value: "true" },
                  ]}
                />
              </div>
            ) : (
              <div>
                <Label>Score (0-1)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={results[index].score ?? 0}
                  onChange={(event) =>
                    setResults((current) =>
                      current.map((result, resultIndex) =>
                        resultIndex === index
                          ? {
                              ...result,
                              score: Number(event.target.value),
                              is_correct: Number(event.target.value) >= 1,
                            }
                          : result,
                      ),
                    )
                  }
                />
              </div>
            )}
            <div>
              <Label>Error Type</Label>
              <Select
                value={results[index].error_type ?? ""}
                onChange={(event) =>
                  setResults((current) =>
                    current.map((result, resultIndex) =>
                      resultIndex === index
                        ? { ...result, error_type: event.target.value || null }
                        : result,
                    ),
                  )
                }
                options={[
                  { label: "concept", value: "concept" },
                  { label: "pattern", value: "pattern" },
                  { label: "execution", value: "execution" },
                ]}
                placeholder="No error type"
              />
            </div>
            <div className="md:col-span-2">
              <Label>User Answer</Label>
              <Textarea
                value={results[index].user_answer}
                onChange={(event) =>
                  setResults((current) =>
                    current.map((result, resultIndex) =>
                      resultIndex === index
                        ? { ...result, user_answer: event.target.value }
                        : result,
                    ),
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button onClick={submit}>Save Attempt</Button>
    </div>
  );
}
