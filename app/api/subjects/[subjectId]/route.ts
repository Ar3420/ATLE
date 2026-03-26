import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { subjectSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: { subjectId: string } },
) {
  const user = await requireUser();
  const body = subjectSchema.partial().parse(await request.json());
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("subjects")
    .update(body)
    .eq("id", params.subjectId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ subject: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { subjectId: string } },
) {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", params.subjectId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
