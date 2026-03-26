import { login } from "@/app/actions/auth";
import { AuthForm } from "@/app/(auth)/auth-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <AuthForm
        title="Sign in"
        description="Access your subjects, question bank, tests, and analytics."
        action={login}
        submitLabel="Sign in"
        alternateHref="/signup"
        alternateLabel="Need an account? Create one"
        error={searchParams.error}
        message={searchParams.message}
      />
    </main>
  );
}
