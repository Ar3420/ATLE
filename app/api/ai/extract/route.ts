import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { runExtractionWorkflow } from "@/lib/workflows/extraction";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json();

  const result = await runExtractionWorkflow({
    userId: user.id,
    sourceFileId: body.source_file_id,
    filePath: body.file_path,
    label: body.label,
    subjectId: body.subject_id,
    fileType: body.file_type,
  });

  return NextResponse.json(result, { status: result.error ? 207 : 200 });
}
