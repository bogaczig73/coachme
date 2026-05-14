import { signIn, auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role ? `/${session.user.role}` : "/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-stretch justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use Google to continue.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/onboarding" });
        }}
      >
        <Button type="submit" className="w-full">
          Continue with Google
        </Button>
      </form>
    </main>
  );
}
