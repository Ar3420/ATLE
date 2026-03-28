"use client";

import Link from "next/link";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { STORAGE_BUCKET, SOURCE_FILE_LABELS } from "@/lib/constants";
import type { TableRow } from "@/lib/types/database";

type UploadResult = {
  file_name: string;
  review_url?: string;
  source_file?: TableRow<"source_files">;
  extraction?: {
    error?: string | null;
    questions?: unknown[];
  };
  error?: string | null;
};

export function UploadClient({
  subjects,
  sourceFiles,
}: {
  subjects: TableRow<"subjects">[];
  sourceFiles: TableRow<"source_files">[];
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [label, setLabel] = useState<(typeof SOURCE_FILE_LABELS)[number]>("test");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject.name]));

  function mergeFiles(incomingFiles: File[]) {
    setFiles((current) => {
      const existingKeys = new Set(
        current.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );
      const nextFiles = [...current];

      for (const file of incomingFiles) {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          nextFiles.push(file);
        }
      }

      return nextFiles;
    });
  }

  function removeQueuedFile(targetFile: File) {
    setFiles((current) =>
      current.filter(
        (file) =>
          !(
            file.name === targetFile.name &&
            file.size === targetFile.size &&
            file.lastModified === targetFile.lastModified
          ),
      ),
    );
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length) {
      mergeFiles(droppedFiles);
    }
  }

  async function handleUpload() {
    if (!files.length || !subjectId) {
      toast.error("Select a subject and at least one file first.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("subject_id", subjectId);
    formData.append("label", label);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    setIsUploading(false);

    if (!response.ok && response.status !== 207) {
      toast.error(data.error ?? "Upload failed.");
      return;
    }

    const uploads: UploadResult[] = Array.isArray(data.uploads) ? data.uploads : [];
    const successfulUploads = uploads.filter(
      (upload) => typeof upload.review_url === "string",
    );
    const failedUploads = uploads.filter(
      (upload) => typeof upload.error === "string" && !upload.source_file,
    );
    const uploadsNeedingReview = successfulUploads.filter((upload) => upload.extraction?.error);
    const successfulReviewableUploads = successfulUploads.filter(
      (upload) => Array.isArray(upload.extraction?.questions) && upload.extraction.questions.length > 0,
    );

    if (successfulUploads.length) {
      toast.success(
        successfulUploads.length === 1
          ? "Upload complete and extraction queued."
          : `${successfulUploads.length} files uploaded.`,
      );
    }

    if (uploadsNeedingReview.length) {
      toast.error(
        uploadsNeedingReview[0]?.extraction?.error ?? "One or more files need manual review.",
      );
    }

    if (failedUploads.length) {
      toast.error(
        failedUploads.length === 1
          ? failedUploads[0].error ?? "Upload failed."
          : `${failedUploads.length} files failed to upload.`,
      );
    }

    if (successfulUploads.length === 1 && !failedUploads.length) {
      const [upload] = successfulUploads;

      if (!upload.extraction?.error || successfulReviewableUploads.length === 1) {
        window.location.href = upload.review_url!;
        return;
      }
    }

    if (!successfulUploads.length && !failedUploads.length) {
      return;
    }

    setFiles([]);
    window.location.reload();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>Upload Source Material</CardTitle>
          <CardDescription>
            PDFs, images, and text files are stored in Supabase Storage and routed into OpenAI extraction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!isDragging) {
                setIsDragging(true);
              }
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                return;
              }
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-3xl border border-dashed p-8 text-center transition ${
              isDragging
                ? "border-[#d4b36c] bg-[#fff2cf] shadow-[0_0_0_3px_rgba(212,179,108,0.15)]"
                : "border-[#dbcaa3] bg-[#fffaf1] hover:border-[#d4b36c] hover:bg-[#fff8ea]"
            }`}
          >
            <p className="text-lg font-medium text-[#55627e]">
              {files.length
                ? files.length === 1
                  ? files[0].name
                  : `${files.length} files selected`
                : "Drag files here or click to browse"}
            </p>
            <p className="mt-2 text-sm text-[#9f947c]">
              {isDragging
                ? "Drop files to add them to the extraction queue."
                : "Supported: PDF, image, plain text. Multiple files are allowed."}
            </p>
            {files.length ? (
              <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[#b9892f]">
                Files stay queued until you press upload
              </p>
            ) : null}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              mergeFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />

          {files.length ? (
            <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#55627e]">Extraction Queue</p>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setFiles([])}
                >
                  Clear Queue
                </Button>
              </div>
              <div className="mt-3 space-y-2 text-sm text-[#7f7560]">
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.lastModified}-${file.size}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#eadfca] bg-[#fffcf6] px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-[#55627e]">{file.name}</p>
                      <p className="text-xs text-[#9f947c]">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => removeQueuedFile(file)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
            {isUploading
              ? "Processing..."
              : files.length > 1
                ? "Upload and Extract Files"
                : "Upload and Extract"}
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
                      {subjectMap.get(sourceFile.subject_id) ?? "Unknown subject"} • {sourceFile.label} • {sourceFile.file_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm capitalize text-[#b9892f]">
                      {sourceFile.processing_status.replace("_", " ")}
                    </p>
                    <Link
                      href={`/questions/review/${sourceFile.id}`}
                      className="text-sm font-medium text-[#8c6f36] transition hover:text-[#5a4720]"
                    >
                      Review
                    </Link>
                  </div>
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
