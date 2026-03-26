import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getTestDetail } from "@/lib/server-data";
import { cn } from "@/lib/utils";

export default async function TestDetailPage({
  params,
}: {
  params: { testId: string };
}) {
  const user = await requireUser();
  const { test, questions, latestAttempt, latestResults } = await getTestDetail(
    user.id,
    params.testId,
  );
  const resultMap = new Map(latestResults.map((result) => [result.question_id, result]));

  return (
    <PageShell
      title={test.title}
      description="Full test detail, PDFs, and the most recent logged attempt."
      actions={
        <>
          <Link className={cn(buttonVariants())} href={`/api/tests/${test.id}/pdf?version=student`} target="_blank">
            Download PDF
          </Link>
          <Link className={cn(buttonVariants({ variant: "secondary" }))} href={`/api/tests/${test.id}/pdf?version=key`} target="_blank">
            Answer Key
          </Link>
          <Link className={cn(buttonVariants({ variant: "secondary" }))} href={`/attempts/log/${test.id}`}>
            Log Attempt
          </Link>
        </>
      }
    >
      {latestAttempt ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest Attempt</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
              <p className="text-sm text-[#9f947c]">Percentage</p>
              <p className="text-2xl font-semibold">{latestAttempt.percentage.toFixed(1)}%</p>
            </div>
            <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
              <p className="text-sm text-[#9f947c]">MC Accuracy</p>
              <p className="text-2xl font-semibold">{latestAttempt.mc_accuracy.toFixed(1)}%</p>
            </div>
            <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
              <p className="text-sm text-[#9f947c]">LR Accuracy</p>
              <p className="text-2xl font-semibold">{latestAttempt.lr_accuracy.toFixed(1)}%</p>
            </div>
            <div className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-3">
              <p className="text-sm text-[#9f947c]">Time Taken</p>
              <p className="text-2xl font-semibold">{latestAttempt.time_taken}s</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="rounded-2xl border border-[#e4d7ba] bg-[#fffaf1] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[#55627e]">
                  {index + 1}. {question.question_text}
                </p>
                {resultMap.get(question.id) ? (
                  <span className="text-sm text-[#b9892f]">
                    {resultMap.get(question.id)?.is_correct ? "Correct" : "Incorrect"}
                  </span>
                ) : null}
              </div>
              {question.choices?.length ? (
                <div className="mt-3 space-y-1 text-sm text-[#7f7560]">
                  {question.choices.map((choice: { id: string; text: string }) => (
                    <p key={choice.id}>{choice.text}</p>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-sm text-[#9f947c]">Answer: {question.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
