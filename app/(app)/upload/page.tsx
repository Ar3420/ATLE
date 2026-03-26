import { UploadClient } from "@/components/features/upload-client";
import { PageShell } from "@/components/layout/page-shell";
import { requireUser } from "@/lib/auth";
import { getSourceFiles, getSubjects } from "@/lib/server-data";

export default async function UploadPage() {
  const user = await requireUser();
  const [subjects, sourceFiles] = await Promise.all([
    getSubjects(user.id),
    getSourceFiles(user.id),
  ]);

  return (
    <PageShell
      title="Upload"
      description="Store source materials, track extraction status, and route uncertain output into manual review."
    >
      <UploadClient subjects={subjects} sourceFiles={sourceFiles} />
    </PageShell>
  );
}
