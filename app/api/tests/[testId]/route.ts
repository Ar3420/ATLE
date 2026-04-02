import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { testId: string } },
) {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();

  const { data: test, error: testError } = await supabase
    .from("tests")
    .select("id")
    .eq("id", params.testId)
    .eq("user_id", user.id)
    .single();

  if (testError || !test) {
    return NextResponse.json({ error: "Test not found." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("tests")
    .delete()
    .eq("id", params.testId)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
