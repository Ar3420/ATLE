import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { STORAGE_BUCKET } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uploadSchema } from "@/lib/validation";
import { runExtractionWorkflow } from "@/lib/workflows/extraction";

export const maxDuration = 60;

function inferFileType(file: File): "pdf" | "image" | "text" {
  if (file.type.includes("pdf")) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "text";
}

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const legacyFile = formData.get("file");
  const uploadFiles =
    files.length > 0
      ? files
      : legacyFile instanceof File
        ? [legacyFile]
        : [];

  if (!uploadFiles.length) {
    return NextResponse.json({ error: "At least one file is required." }, { status: 400 });
  }

  const parsed = uploadSchema.parse({
    subject_id: formData.get("subject_id"),
    label: formData.get("label"),
  });

  const supabase = createServerSupabaseClient();
  const uploads = [];

  for (const file of uploadFiles) {
    const sourceFileId = crypto.randomUUID();
    const filePath = `${user.id}/${sourceFileId}-${file.name.replace(/\s+/g, "-")}`;
    const fileType = inferFileType(file);

    try {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        uploads.push({
          file_name: file.name,
          error: uploadError.message,
        });
        continue;
      }

      const { data: sourceFile, error: sourceFileError } = await supabase
        .from("source_files")
        .insert({
          id: sourceFileId,
          user_id: user.id,
          subject_id: parsed.subject_id,
          file_path: filePath,
          file_type: fileType,
          label: parsed.label,
          processing_status: "pending",
        })
        .select("*")
        .single();

      if (sourceFileError || !sourceFile) {
        uploads.push({
          file_name: file.name,
          error: sourceFileError?.message ?? "Unable to create source file record.",
        });
        continue;
      }

      const extraction = await runExtractionWorkflow({
        userId: user.id,
        sourceFileId,
        filePath,
        label: parsed.label,
        subjectId: parsed.subject_id,
        fileType,
      });

      const { data: finalSourceFile, error: finalSourceFileError } = await supabase
        .from("source_files")
        .select("*")
        .eq("id", sourceFileId)
        .eq("user_id", user.id)
        .single();

      uploads.push({
        file_name: file.name,
        source_file: finalSourceFileError ? sourceFile : finalSourceFile,
        extraction,
        review_url: `/questions/review/${sourceFileId}`,
        error: null,
      });
    } catch (error) {
      uploads.push({
        file_name: file.name,
        error: error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  const successfulUploads = uploads.filter((item) => item.source_file);
  const failedUploads = uploads.filter((item) => item.error && !item.source_file);
  const firstReviewUrl = successfulUploads[0]?.review_url ?? null;

  return NextResponse.json({
    uploads,
    review_url: firstReviewUrl,
    uploaded_count: successfulUploads.length,
    failed_count: failedUploads.length,
  }, {
    status: failedUploads.length > 0 ? 207 : 200,
  });
}
