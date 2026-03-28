"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TableRow } from "@/lib/types/database";

type PendingGroup = {
  sourceFile: TableRow<"source_files">;
  pendingQuestions: Array<TableRow<"pending_questions"> & { choices?: unknown }>;
  subjectName: string;
};

export function PendingReviewClient({
  groups,
  totalPendingQuestions,
}: {
  groups: PendingGroup[];
  totalPendingQuestions: number;
}) {
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  async function approveAll() {
    setIsApprovingAll(true);
    const response = await fetch("/api/questions/review/approve-all", {
      method: "POST",
    });
    const data = await response.json();
    setIsApprovingAll(false);

    if (!response.ok) {
      toast.error(data.error ?? "Failed to approve pending questions.");
      return;
    }

    toast.success("All pending questions were approved.");
    window.location.href = "/questions";
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Pending Review Queue</CardTitle>
            <CardDescription>
              Review extracted files individually or approve every pending question in one pass.
            </CardDescription>
          </div>
          <Button onClick={approveAll} disabled={isApprovingAll || !groups.length}>
            {isApprovingAll ? "Approving..." : `Approve All (${totalPendingQuestions})`}
          </Button>
        </CardHeader>
      </Card>

      {groups.length ? (
        groups.map((group) => (
          <Card key={group.sourceFile.id}>
            <CardHeader className="md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>{group.sourceFile.file_path.split("/").pop()}</CardTitle>
                <CardDescription>
                  {group.subjectName} • {group.sourceFile.label} • {group.pendingQuestions.length} pending question(s)
                </CardDescription>
              </div>
              <Link href={`/questions/review/${group.sourceFile.id}`}>
                <Button variant="secondary" size="sm">
                  Open File Review
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.pendingQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="rounded-xl border border-[#e5dcc8] px-4 py-3"
                >
                  <p className="font-medium text-[#434c60]">
                    {index + 1}. {question.question_text}
                  </p>
                  <p className="mt-1 text-sm text-[#7d7567]">
                    {(question.topic ?? "General")} • {(question.subtopic ?? "Core Concepts")} • Difficulty {question.difficulty}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-lg font-medium text-[#434c60]">No pending questions right now.</p>
            <p className="mt-2 text-sm text-[#7d7567]">
              New extractions that need review will appear here automatically.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
