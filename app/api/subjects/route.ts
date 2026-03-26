import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { subjectSchema } from "@/lib/validation";

export async function GET() {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ subjects: data ?? [] });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = subjectSchema.parse(await request.json());
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      user_id: user.id,
      ...body,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ subject: data });
}
