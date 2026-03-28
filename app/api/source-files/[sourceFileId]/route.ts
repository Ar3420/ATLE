import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { STORAGE_BUCKET } from "@/lib/constants";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { sourceFileId: string } },
) {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const serviceRoleClient = createServiceRoleClient();

  const { data: sourceFile, error: sourceFileError } = await supabase
    .from("source_files")
    .select("*")
    .eq("id", params.sourceFileId)
    .eq("user_id", user.id)
    .single();

  if (sourceFileError || !sourceFile) {
    return NextResponse.json({ error: "Source file not found." }, { status: 404 });
  }

  const { error: storageError } = await serviceRoleClient.storage
    .from(STORAGE_BUCKET)
    .remove([sourceFile.file_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 400 });
  }

  const { error: deleteError } = await supabase
    .from("source_files")
    .delete()
    .eq("id", params.sourceFileId)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
