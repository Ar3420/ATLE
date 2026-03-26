import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { recalculateWeaknessClusters } from "@/lib/workflows/clusters";

export async function POST() {
  const user = await requireUser();
  const clusters = await recalculateWeaknessClusters(user.id);
  return NextResponse.json({ clusters });
}
