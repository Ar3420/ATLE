import pdfParse from "pdf-parse";

import { createServiceRoleClient } from "@/lib/supabase/server";

export async function downloadSourceFile(path: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage.from("source-materials").download(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to download source file.");
  }

  return data;
}

export async function parseSourceFile(blob: Blob, fileType: "pdf" | "image" | "text") {
  const buffer = Buffer.from(await blob.arrayBuffer());

  if (fileType === "pdf") {
    const parsed = await pdfParse(buffer);
    return {
      documentText: parsed.text,
    };
  }

  if (fileType === "text") {
    return {
      documentText: buffer.toString("utf-8"),
    };
  }

  return {
    imageBase64: buffer.toString("base64"),
    imageMediaType: blob.type || "image/png",
  };
}
