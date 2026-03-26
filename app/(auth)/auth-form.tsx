import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({
  title,
  description,
  action,
  submitLabel,
  alternateHref,
  alternateLabel,
  error,
  message,
}: {
  title: string;
  description: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  error?: string;
  message?: string;
}) {
  return (
    <Card className="w-full max-w-md animate-fade-up">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-[#ead59e] bg-[#fff4d7] px-3 py-2 text-sm text-[#9d7428]">
              {message}
            </p>
          ) : null}
          <Button className="w-full">{submitLabel}</Button>
        </form>
        <p className="mt-4 text-sm text-[#847962]">
          <Link className="text-[#9d7428] underline decoration-[#d8bf84] underline-offset-4" href={alternateHref}>
            {alternateLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
