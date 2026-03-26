"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { STORAGE_BUCKET, SOURCE_FILE_LABELS } from "@/lib/constants";
import type { TableRow } from "@/lib/types/database";

export function UploadClient({
  subjects,
  sourceFiles,
}: {
  subjects: TableRow<"subjects">[];
  sourceFiles: TableRow<"source_files">[];
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [label, setLabel] = useState<(typeof SOURCE_FILE_LABELS)[number]>("test");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file || !subjectId) {
      toast.error("Select a subject and file first.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject_id", subjectId);
    formData.append("label", label);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setIsUploading(false);

    if (!response.ok) {
      toast.error(data.error ?? "Upload failed.");
      return;
    }

    if (data.extraction?.error && !data.extraction?.questions?.length) {
      toast.error(data.extraction.error);
      return;
    }

    if (data.extraction?.error) {
      toast.error(data.extraction.error);
    } else {
      toast.success("Upload complete and extraction ready.");
    }

    window.location.href = data.review_url;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>Upload Source Material</CardTitle>
          <CardDescription>PDFs, images, and text files are stored in Supabase Storage and routed into OpenAI extraction.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-3xl border border-dashed border-[#dbcaa3] bg-[#fffaf1] p-8 text-center transition hover:border-[#d4b36c] hover:bg-[#fff8ea]"
          >
            <p className="text-lg font-medium text-[#55627e]">
              {file ? file.name : "Drag a file here or click to browse"}
            </p>
            <p className="mt-2 text-sm text-[#9f947c]">
              Supported: PDF, image, plain text
            </p>
          </button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Select
                id="subject"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                options={subjects.map((subject) => ({
                  label: subject.name,
                  value: subject.id,
                }))}
              />
            </div>
            <div>
              <Label htmlFor="label">Label</Label>
              <Select
                id="label"
                value={label}
                onChange={(event) => setLabel(event.target.value as (typeof SOURCE_FILE_LABELS)[number])}
                options={SOURCE_FILE_LABELS.map((item) => ({
                  label: item.replace("_", " "),
                  value: item,
                }))}
              />
            </div>
          </div>

          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Processing..." : "Upload and Extract"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
          <CardDescription>Processing state for uploaded materials in {STORAGE_BUCKET}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sourceFiles.length ? (
            sourceFiles.map((sourceFile) => (
              <div
                key={sourceFile.id}
                className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#55627e]">{sourceFile.file_path.split("/").pop()}</p>
                    <p className="text-sm text-[#9f947c]">
                      {sourceFile.label} • {sourceFile.file_type}
                    </p>
                  </div>
                  <p className="text-sm capitalize text-[#b9892f]">
                    {sourceFile.processing_status.replace("_", " ")}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#9f947c]">No files uploaded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
