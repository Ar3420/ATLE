"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/tables/data-table";
import { buttonVariants } from "@/components/ui/button";
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
              PDF
            </Link>
            <Link
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              href={`/attempts/log/${row.original.id}`}
            >
              Log Attempt
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={tests} emptyMessage="No generated tests yet." />;
}
