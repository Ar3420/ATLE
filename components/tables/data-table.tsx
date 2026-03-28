"use client";

import * as React from "react";
import {
  ColumnDef,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  type Row,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage = "No rows found.",
  renderExpandedRow,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage?: string;
  renderExpandedRow?: (row: Row<TData>) => React.ReactNode;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowCanExpand: () => Boolean(renderExpandedRow),
    state: {
      expanded,
      sorting,
    },
  });

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[#e5dcc8] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#ebe3d0]">
            <thead className="bg-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-[#b08426]"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-[#f0e8d8] bg-white">
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr
                      className={`align-top ${renderExpandedRow ? "cursor-pointer transition hover:bg-[#fcfaf4]" : ""}`}
                      onClick={() => {
                        if (renderExpandedRow) {
                          row.toggleExpanded();
                        }
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-4 text-sm text-[#5f6880]">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {renderExpandedRow && row.getIsExpanded() ? (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="border-t border-[#f0e8d8] bg-[#fffdfa] px-4 py-4"
                        >
                          {renderExpandedRow(row)}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-10 text-center text-sm text-[#9f947c]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#9f947c]">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
