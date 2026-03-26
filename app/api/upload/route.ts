import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { STORAGE_BUCKET } from "@/lib/constants";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uploadSchema } from "@/lib/validation";
import { runExtractionWorkflow } from "@/lib/workflows/extraction";

function inferFileType(file: File): "pdf" | "image" | "text" {
  if (file.type.includes("pdf")) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  return "text";
}

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const parsed = uploadSchema.parse({
    subject_id: formData.get("subject_id"),
    label: formData.get("label"),
  });

  const supabase = createServerSupabaseClient();
  const sourceFileId = crypto.randomUUID();
  const filePath = `${user.id}/${sourceFileId}-${file.name.replace(/\s+/g, "-")}`;
  const fileType = inferFileType(file);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
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

  if (sourceFileError) {
    return NextResponse.json({ error: sourceFileError.message }, { status: 400 });
  }

  const extraction = await runExtractionWorkflow({
    userId: user.id,
    sourceFileId,
    filePath,
    label: parsed.label,
    subjectId: parsed.subject_id,
    fileType,
  });

  return NextResponse.json({
    source_file: sourceFile,
    extraction,
    review_url: `/questions/review/${sourceFileId}`,
  });
}
