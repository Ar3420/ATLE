"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  loadPersistedQueue,
  loadPersistedSettings,
  savePersistedQueue,
  savePersistedSettings,
  type PersistedQueueItem,
} from "@/lib/client/upload-queue";
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

type QueueItem = {
  id: string;
  file: File;
  status: "queued" | "processing" | "complete" | "error";
  message?: string;
  reviewUrl?: string;
};

function toPersistedItem(item: QueueItem): PersistedQueueItem {
  return {
    id: item.id,
    name: item.file.name,
    type: item.file.type,
    size: item.file.size,
    lastModified: item.file.lastModified,
    status: item.status,
    message: item.message,
    reviewUrl: item.reviewUrl,
    file: item.file,
  };
}

function fromPersistedItem(item: PersistedQueueItem): QueueItem {
  const file =
    item.file instanceof File
      ? item.file
      : new File([item.file], item.name, {
          type: item.type,
          lastModified: item.lastModified,
        });

  return {
    id: item.id,
    file,
    status: item.status,
    message: item.message,
    reviewUrl: item.reviewUrl,
  };
}

export function UploadClient({
  subjects,
  sourceFiles,
}: {
  subjects: TableRow<"subjects">[];
  sourceFiles: TableRow<"source_files">[];
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [label, setLabel] = useState<(typeof SOURCE_FILE_LABELS)[number]>("test");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [recentFiles, setRecentFiles] = useState(sourceFiles);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasLoadedPersistence = useRef(false);
  const subjectMap = new Map(subjects.map((subject) => [subject.id, subject.name]));

  useEffect(() => {
    setRecentFiles(sourceFiles);
  }, [sourceFiles]);

  useEffect(() => {
    let cancelled = false;

    async function restoreQueueState() {
      try {
        const [persistedQueue, persistedSettings] = await Promise.all([
          loadPersistedQueue(),
          Promise.resolve(loadPersistedSettings()),
        ]);

        if (cancelled) {
          return;
        }

        setQueue(persistedQueue.map(fromPersistedItem));

        if (persistedSettings?.subjectId) {
          setSubjectId(persistedSettings.subjectId);
        }

        if (
          persistedSettings?.label &&
          SOURCE_FILE_LABELS.includes(persistedSettings.label as (typeof SOURCE_FILE_LABELS)[number])
        ) {
          setLabel(persistedSettings.label as (typeof SOURCE_FILE_LABELS)[number]);
        }
      } catch (error) {
        console.error("Unable to restore upload queue", error);
      } finally {
        hasLoadedPersistence.current = true;
      }
    }

    void restoreQueueState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistence.current) {
      return;
    }

    void savePersistedQueue(queue.map(toPersistedItem));
    savePersistedSettings({ subjectId, label });
  }, [queue, subjectId, label]);

  function mergeFiles(incomingFiles: File[]) {
    setQueue((current) => {
      const existingKeys = new Set(
        current.map((item) => `${item.file.name}-${item.file.size}-${item.file.lastModified}`),
      );
      const nextQueue = [...current];

      for (const file of incomingFiles) {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          nextQueue.push({
            id: key,
            file,
            status: "queued",
          });
        }
      }

      return nextQueue;
    });
  }

  function removeQueuedFile(itemId: string) {
    setQueue((current) => current.filter((item) => item.id !== itemId));
  }

  function updateQueueItem(itemId: string, updates: Partial<QueueItem>) {
    setQueue((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    );
  }

  function upsertRecentFile(sourceFile: TableRow<"source_files">) {
    setRecentFiles((current) => {
      const nextFiles = [sourceFile, ...current.filter((item) => item.id !== sourceFile.id)];
      return nextFiles.sort(
        (left, right) =>
          new Date(right.uploaded_at).getTime() - new Date(left.uploaded_at).getTime(),
      );
    });
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (droppedFiles.length) {
      mergeFiles(droppedFiles);
    }
  }

  async function processQueueItem(item: QueueItem) {
    updateQueueItem(item.id, {
      status: "processing",
      message: "Uploading and extracting...",
    });

    const formData = new FormData();
    formData.append("file", item.file);
    formData.append("subject_id", subjectId);
    formData.append("label", label);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok && response.status !== 207) {
      throw new Error(data.error ?? "Upload failed.");
    }

    const upload: UploadResult | undefined = Array.isArray(data.uploads)
      ? data.uploads[0]
      : undefined;

    if (!upload) {
      throw new Error("Upload finished without a result payload.");
    }

    if (upload.error && !upload.source_file) {
      throw new Error(upload.error);
    }

    const extractedQuestions = Array.isArray(upload.extraction?.questions)
      ? upload.extraction.questions
      : [];

    if (upload.extraction?.error && !extractedQuestions.length) {
      throw new Error(upload.extraction.error);
    }

    updateQueueItem(item.id, {
      status: "complete",
      message: upload.extraction?.error ?? "Ready for review.",
      reviewUrl: upload.review_url,
    });

    return upload;
  }

  async function handleUpload() {
    const queuedItems = queue.filter((item) => item.status !== "complete");

    if (!queuedItems.length || !subjectId) {
      toast.error("Select a subject and add at least one file to the queue first.");
      return;
    }

    setIsUploading(true);

    let completedCount = 0;
    let failedCount = 0;
    let firstReviewUrl: string | null = null;

    for (const item of queuedItems) {
      try {
        const upload = await processQueueItem(item);
        completedCount += 1;
        if (!firstReviewUrl && upload.review_url) {
          firstReviewUrl = upload.review_url;
        }
        if (upload.source_file) {
          upsertRecentFile(upload.source_file);
        }
        removeQueuedFile(item.id);
      } catch (error) {
        failedCount += 1;
        updateQueueItem(item.id, {
          status: "error",
          message: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }

    setIsUploading(false);
    router.refresh();

    if (completedCount) {
      toast.success(
        completedCount === 1 ? "1 file processed." : `${completedCount} files processed.`,
      );
    }

    if (failedCount) {
      toast.error(
        failedCount === 1
          ? "1 file failed. Check the queue message."
          : `${failedCount} files failed. Check the queue messages.`,
      );
    }

    if (completedCount === 1 && failedCount === 0 && firstReviewUrl) {
      window.location.href = firstReviewUrl;
    }
  }

  async function deleteRecentFile(sourceFileId: string) {
    setDeletingFileId(sourceFileId);

    const response = await fetch(`/api/source-files/${sourceFileId}`, {
      method: "DELETE",
    });
    const data = await response.json();

    setDeletingFileId(null);

    if (!response.ok) {
      toast.error(data.error ?? "Failed to delete file.");
      return;
    }

    setRecentFiles((current) => current.filter((file) => file.id !== sourceFileId));
    toast.success("File deleted.");
    router.refresh();
  }

  const queuedCount = queue.length;

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
              {queuedCount
                ? queuedCount === 1
                  ? queue[0].file.name
                  : `${queuedCount} files in queue`
                : "Drag files here or click to browse"}
            </p>
            <p className="mt-2 text-sm text-[#9f947c]">
              {isDragging
                ? "Drop files to add them to the extraction queue."
                : "Supported: PDF, image, plain text. Queue state persists across reloads."}
            </p>
            {queuedCount ? (
              <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[#b9892f]">
                Press upload to process the queue sequentially
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

          {queue.length ? (
            <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#55627e]">Extraction Queue</p>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  disabled={isUploading}
                  onClick={() => setQueue([])}
                >
                  Clear Queue
                </Button>
              </div>
              <div className="mt-3 space-y-2 text-sm text-[#7f7560]">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#eadfca] bg-[#fffcf6] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#55627e]">{item.file.name}</p>
                        <p className="text-xs text-[#9f947c]">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-[0.14em] text-[#b9892f]">
                          {item.status}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          disabled={isUploading && item.status === "processing"}
                          onClick={() => removeQueuedFile(item.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    {item.message ? (
                      <p className="mt-2 text-xs text-[#7f7560]">{item.message}</p>
                    ) : null}
                    {item.reviewUrl ? (
                      <Link
                        href={item.reviewUrl}
                        className="mt-2 inline-block text-xs font-medium text-[#8c6f36] transition hover:text-[#5a4720]"
                      >
                        Open review
                      </Link>
                    ) : null}
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

          <Button onClick={handleUpload} disabled={isUploading || !queue.length}>
            {isUploading ? "Processing Queue..." : "Upload and Extract Queue"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
          <CardDescription>Processing state for uploaded materials in {STORAGE_BUCKET}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentFiles.length ? (
            recentFiles.map((sourceFile) => (
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
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      disabled={deletingFileId === sourceFile.id}
                      onClick={() => deleteRecentFile(sourceFile.id)}
                    >
                      Delete
                    </Button>
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
