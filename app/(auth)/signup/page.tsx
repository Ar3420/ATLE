import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/app/(auth)/auth-form";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <AuthForm
        title="Create account"
        description="Start building an adaptive question bank around your uploaded materials."
        action={signup}
        submitLabel="Create account"
        alternateHref="/login"
        alternateLabel="Already have an account? Sign in"
        error={searchParams.error}
      />
    </main>
  );
}
