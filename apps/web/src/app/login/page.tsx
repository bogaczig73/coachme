import { signIn, auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();

  const inviteRedirect = sp.invite ? `/invite/${sp.invite}` : null;
  const postAuthPath =
    inviteRedirect ??
    (session?.user
      ? session.user.role
        ? `/${session.user.role}`
        : "/onboarding"
      : "/onboarding");

  if (session?.user) {
    redirect(postAuthPath);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-stretch justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {inviteRedirect
            ? "Sign in to accept your coach's invite."
            : "Use Google to continue."}
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: postAuthPath });
        }}
      >
        <Button type="submit" className="w-full">
          Continue with Google
        </Button>
      </form>
    </main>
  );
}
