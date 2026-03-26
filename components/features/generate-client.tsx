"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { TableRow } from "@/lib/types/database";

export function GenerateClient({
  subjects,
  topics,
  subtopics,
}: {
  subjects: (TableRow<"subjects"> & { question_count: number })[];
  topics: string[];
  subtopics: string[];
}) {
  const [mode, setMode] = useState<"standard" | "targeted">("standard");
  const [standard, setStandard] = useState({
    type: "daily",
    subject_ids: subjects.map((subject) => subject.id),
    mc_count: 8,
    lr_count: 2,
    weakness_weight: true,
    difficulty_distribution: { "1": 10, "2": 20, "3": 40, "4": 20, "5": 10 },
  });
  const [targeted, setTargeted] = useState({
    type: "custom",
    subject_id: subjects[0]?.id ?? "",
    topic: "",
    subtopic: "",
    question_type: "mixed",
    total_count: 10,
    weakness_weight: true,
    difficulty_distribution: { "1": 10, "2": 20, "3": 40, "4": 20, "5": 10 },
  });

  const preview = useMemo(() => {
    const difficultySource =
      mode === "standard" ? standard.difficulty_distribution : targeted.difficulty_distribution;
    const totalQuestions =
      mode === "standard" ? standard.mc_count + standard.lr_count : targeted.total_count;

    return {
      totalQuestions,
      estimatedDifficulty:
        Object.entries(difficultySource).reduce(
          (sum, [difficulty, weight]) => sum + Number(difficulty) * weight,
          0,
        ) /
        Object.values(difficultySource).reduce((sum, weight) => sum + weight, 0),
      subjectBreakdown:
        mode === "standard"
          ? subjects
              .filter((subject) => standard.subject_ids.includes(subject.id))
              .map((subject) => subject.name)
          : subjects
              .filter((subject) => subject.id === targeted.subject_id)
              .map((subject) => subject.name),
    };
  }, [mode, standard, targeted, subjects]);

  async function generateTest() {
    const payload = mode === "standard" ? { mode, ...standard } : { mode, ...targeted };
    const response = await fetch("/api/tests/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error ?? "Failed to generate test.");
      return;
    }

    toast.success("Test generated.");
    window.location.href = `/tests/${data.test.id}`;
  }

  function difficultyControls(
    values: Record<string, number>,
    onChange: (difficulty: string, value: number) => void,
  ) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div key={level} className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-[#6c654f]">Tier {level}</span>
              <span className="text-sm text-[#a18953]">{values[String(level)]}%</span>
            </div>
            <Slider
              value={values[String(level)]}
              onChange={(value) => onChange(String(level), value)}
              min={0}
              max={100}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generation Mode</CardTitle>
            <CardDescription>Switch between a standard balanced test and a targeted focused drill.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button variant={mode === "standard" ? "primary" : "secondary"} onClick={() => setMode("standard")}>
              Standard Test
            </Button>
            <Button variant={mode === "targeted" ? "primary" : "secondary"} onClick={() => setMode("targeted")}>
              Targeted Test
            </Button>
          </CardContent>
        </Card>

        {mode === "standard" ? (
          <Card>
            <CardHeader>
              <CardTitle>Standard Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label>Type</Label>
                <Select
                  value={standard.type}
                  onChange={(event) => setStandard((current) => ({ ...current, type: event.target.value }))}
                  options={[
                    { label: "daily", value: "daily" },
                    { label: "weekly", value: "weekly" },
                  ]}
                />
              </div>
              <div className="space-y-3">
                <Label>Subject Mix</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {subjects.map((subject) => (
                    <label key={subject.id} className="flex items-center gap-3 rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
                      <Checkbox
                        checked={standard.subject_ids.includes(subject.id)}
                        onChange={(event) =>
                          setStandard((current) => ({
                            ...current,
                            subject_ids: event.target.checked
                              ? [...current.subject_ids, subject.id]
                              : current.subject_ids.filter((id) => id !== subject.id),
                          }))
                        }
                      />
                      <span className="text-sm text-[#5f6880]">
                        {subject.name} ({subject.question_count})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>MC Count: {standard.mc_count}</Label>
                  <Slider value={standard.mc_count} onChange={(value) => setStandard((current) => ({ ...current, mc_count: value }))} min={0} max={30} />
                </div>
                <div>
                  <Label>LR Count: {standard.lr_count}</Label>
                  <Slider value={standard.lr_count} onChange={(value) => setStandard((current) => ({ ...current, lr_count: value }))} min={0} max={20} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
                <div>
                  <p className="font-medium text-[#55627e]">Weakness weighting</p>
                  <p className="text-sm text-[#9f947c]">Bias the selection score toward recurring misses.</p>
                </div>
                <Switch checked={standard.weakness_weight} onCheckedChange={(checked) => setStandard((current) => ({ ...current, weakness_weight: checked }))} />
              </div>
              {difficultyControls(standard.difficulty_distribution, (difficulty, value) =>
                setStandard((current) => ({
                  ...current,
                  difficulty_distribution: { ...current.difficulty_distribution, [difficulty]: value },
                })),
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Targeted Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Subject</Label>
                  <Select
                    value={targeted.subject_id}
                    onChange={(event) => setTargeted((current) => ({ ...current, subject_id: event.target.value }))}
                    options={subjects.map((subject) => ({
                      label: `${subject.name} (${subject.question_count})`,
                      value: subject.id,
                    }))}
                  />
                </div>
                <div>
                  <Label>Test Type</Label>
                  <Select
                    value={targeted.type}
                    onChange={(event) => setTargeted((current) => ({ ...current, type: event.target.value }))}
                    options={[
                      { label: "custom", value: "custom" },
                      { label: "daily", value: "daily" },
                      { label: "weekly", value: "weekly" },
                    ]}
                  />
                </div>
                <div>
                  <Label>Topic</Label>
                  <Select
                    value={targeted.topic}
                    onChange={(event) => setTargeted((current) => ({ ...current, topic: event.target.value }))}
                    options={topics.map((topic) => ({ label: topic, value: topic }))}
                    placeholder="Any topic"
                  />
                </div>
                <div>
                  <Label>Subtopic</Label>
                  <Select
                    value={targeted.subtopic}
                    onChange={(event) => setTargeted((current) => ({ ...current, subtopic: event.target.value }))}
                    options={subtopics.map((subtopic) => ({ label: subtopic, value: subtopic }))}
                    placeholder="Any subtopic"
                  />
                </div>
                <div>
                  <Label>Question Type</Label>
                  <Select
                    value={targeted.question_type}
                    onChange={(event) => setTargeted((current) => ({ ...current, question_type: event.target.value }))}
                    options={[
                      { label: "mixed", value: "mixed" },
                      { label: "MC only", value: "multiple_choice" },
                      { label: "LR only", value: "long_response" },
                    ]}
                  />
                </div>
                <div>
                  <Label>Total Count: {targeted.total_count}</Label>
                  <Slider value={targeted.total_count} onChange={(value) => setTargeted((current) => ({ ...current, total_count: value }))} min={1} max={30} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
                <div>
                  <p className="font-medium text-[#55627e]">Weakness weighting</p>
                  <p className="text-sm text-[#9f947c]">Pull clusters harder into targeted drills.</p>
                </div>
                <Switch checked={targeted.weakness_weight} onCheckedChange={(checked) => setTargeted((current) => ({ ...current, weakness_weight: checked }))} />
              </div>
              {difficultyControls(targeted.difficulty_distribution, (difficulty, value) =>
                setTargeted((current) => ({
                  ...current,
                  difficulty_distribution: { ...current.difficulty_distribution, [difficulty]: value },
                })),
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Selected question count, subject breakdown, and estimated difficulty.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
            <p className="text-sm text-[#9f947c]">Selected question count</p>
            <p className="mt-1 text-3xl font-semibold text-[#55627e]">{preview.totalQuestions}</p>
          </div>
          <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
            <p className="text-sm text-[#9f947c]">Estimated difficulty</p>
            <p className="mt-1 text-3xl font-semibold text-[#55627e]">
              {preview.estimatedDifficulty.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
            <p className="text-sm text-[#9f947c]">Subjects</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {preview.subjectBreakdown.map((subject) => (
                <span key={subject} className="rounded-full border border-[#eadab4] bg-[#fff6e3] px-3 py-1 text-sm text-[#8c6f36]">
                  {subject}
                </span>
              ))}
            </div>
          </div>
          <Button className="w-full" onClick={generateTest}>
            Generate Test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
