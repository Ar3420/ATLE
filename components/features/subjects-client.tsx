"use client";

import { useState } from "react";
import { Atom, Binary, BookOpen, FlaskConical, Globe2, Landmark, ScrollText, Sigma, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TableRow } from "@/lib/types/database";

const iconMap = {
  Sigma,
  FlaskConical,
  BookOpen,
  Landmark,
  Atom,
  Binary,
  Globe2,
  ScrollText,
} as const;

type SubjectCard = TableRow<"subjects"> & {
  questionCount: number;
  averageScore: number;
};

export function SubjectsClient({ initialSubjects }: { initialSubjects: SubjectCard[] }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [form, setForm] = useState({
    name: "",
    color: "#22c55e",
    icon: "BookOpen",
  });

  async function createSubject() {
    const response = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();

    if (!response.ok) {
      toast.error(data.error ?? "Failed to create subject.");
      return;
    }

    setSubjects((current) => [{ ...data.subject, questionCount: 0, averageScore: 0 }, ...current]);
    setForm({ name: "", color: "#22c55e", icon: "BookOpen" });
    toast.success("Subject created.");
  }

  async function toggleSubject(subjectId: string, checked: boolean) {
    const response = await fetch(`/api/subjects/${subjectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: checked }),
    });

    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Failed to update subject.");
      return;
    }

    setSubjects((current) =>
      current.map((subject) =>
        subject.id === subjectId ? { ...subject, is_active: checked } : subject,
      ),
    );
  }

  async function deleteSubject(subjectId: string) {
    const response = await fetch(`/api/subjects/${subjectId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      toast.error(data.error ?? "Failed to delete subject.");
      return;
    }
    setSubjects((current) => current.filter((subject) => subject.id !== subjectId));
    toast.success("Subject removed.");
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Subject</CardTitle>
          <CardDescription>Add a new track for uploads, question banks, and analytics.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label htmlFor="subject-name">Name</Label>
            <Input
              id="subject-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="e.g. AP Calculus"
            />
          </div>
          <div>
            <Label htmlFor="subject-color">Color</Label>
            <Input
              id="subject-color"
              value={form.color}
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="subject-icon">Icon</Label>
            <Select
              id="subject-icon"
              value={form.icon}
              onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
              options={Object.keys(iconMap).map((icon) => ({ label: icon, value: icon }))}
            />
          </div>
          <div className="md:col-span-4">
            <Button onClick={createSubject}>Create Subject</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => {
          const Icon = iconMap[subject.icon as keyof typeof iconMap] ?? BookOpen;
          return (
            <Card key={subject.id} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: subject.color }} />
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] p-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>{subject.name}</CardTitle>
                      <CardDescription>{subject.questionCount} questions</CardDescription>
                    </div>
                  </div>
                  <button onClick={() => deleteSubject(subject.id)} className="text-[#9f947c] transition hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
                    <p className="text-[#9f947c]">Avg score</p>
                    <p className="mt-1 text-lg font-medium text-[#55627e]">
                      {subject.averageScore.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
                    <p className="text-[#9f947c]">Status</p>
                    <div className="mt-2 flex items-center gap-3">
                      <Switch
                        checked={subject.is_active}
                        onCheckedChange={(checked) => toggleSubject(subject.id, checked)}
                      />
                      <span className="text-[#6c654f]">
                        {subject.is_active ? "Active" : "Paused"}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="secondary" className="w-full" onClick={() => (window.location.href = `/subjects/${subject.id}`)}>
                  Open Subject
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
