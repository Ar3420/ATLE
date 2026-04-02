"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { DataTable } from "@/components/tables/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TestRow = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  question_count: number;
  latest_attempt: { percentage: number } | null;
};

export function TestsClient({ tests }: { tests: TestRow[] }) {
  const router = useRouter();
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null);

  const deleteTest = useCallback(async (testId: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"? This also removes linked attempts.`);
    if (!confirmed) {
      return;
    }

    setDeletingTestId(testId);

    const response = await fetch(`/api/tests/${testId}`, {
      method: "DELETE",
    });
    const data = await response.json();

    setDeletingTestId(null);

    if (!response.ok) {
      toast.error(data.error ?? "Failed to delete test.");
      return;
    }

    toast.success("Test deleted.");
    router.refresh();
  }, [router]);

  const columns = useMemo<ColumnDef<TestRow>[]>(
    () => [
      { accessorKey: "title", header: "Title" },
      { accessorKey: "type", header: "Type" },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
      },
      { accessorKey: "question_count", header: "Questions" },
      {
        accessorKey: "score",
        header: "Score",
        cell: ({ row }) =>
          row.original.latest_attempt ? `${row.original.latest_attempt.percentage.toFixed(1)}%` : "--",
      },
      {
        accessorKey: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Link className={cn(buttonVariants({ size: "sm" }))} href={`/tests/${row.original.id}`}>
              Open
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              href={`/api/tests/${row.original.id}/pdf?version=student`}
              target="_blank"
            >
              Student PDF
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              href={`/api/tests/${row.original.id}/pdf?version=key`}
              target="_blank"
            >
              Answer Key
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              href={`/attempts/log/${row.original.id}`}
            >
              Log Attempt
            </Link>
            <Button
              variant="danger"
              size="sm"
              type="button"
              disabled={deletingTestId === row.original.id}
              onClick={() => deleteTest(row.original.id, row.original.title)}
            >
              {deletingTestId === row.original.id ? "Deleting..." : "Delete"}
            </Button>
          </div>
        ),
      },
    ],
    [deleteTest, deletingTestId],
  );

  return <DataTable columns={columns} data={tests} emptyMessage="No generated tests yet." />;
}
