import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-8 px-6 relative">
      <div className="absolute right-6 top-6">
        <ThemeToggle />
      </div>
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">
          Betri CoachMe
        </h1>
        <p className="mt-2 text-muted-foreground">
          Endurance training and coaching — rebuilt for 2026.
        </p>
      </div>

      <div className="flex gap-3">
        {session?.user ? (
          <Button asChild>
            <Link
              href={
                session.user.role === "coach"
                  ? "/coach"
                  : session.user.role === "athlete"
                    ? "/athlete"
                    : "/onboarding"
              }
            >
              Go to dashboard
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="https://github.com/">Docs</Link>
        </Button>
      </div>
    </main>
  );
}
