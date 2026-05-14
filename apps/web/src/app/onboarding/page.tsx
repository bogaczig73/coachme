import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { selectRole } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role) {
    const target = sp.invite ? `/invite/${sp.invite}` : `/${session.user.role}`;
    redirect(target);
  }

  const inviteFromInvitation = sp.invite ?? "";

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-stretch justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Welcome to Betri CoachMe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {inviteFromInvitation
            ? "Pick your role to accept your coach's invite."
            : "How are you using the app?"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form action={selectRole}>
          <input type="hidden" name="role" value="athlete" />
          {inviteFromInvitation && (
            <input type="hidden" name="invite" value={inviteFromInvitation} />
          )}
          <Button type="submit" variant="outline" className="h-32 w-full flex-col">
            <span className="text-lg font-semibold">I&apos;m an athlete</span>
            <span className="text-xs text-muted-foreground">
              Train, upload activities, get coached
            </span>
          </Button>
        </form>

        <form action={selectRole}>
          <input type="hidden" name="role" value="coach" />
          <Button
            type="submit"
            variant="outline"
            className="h-32 w-full flex-col"
            disabled={!!inviteFromInvitation}
          >
            <span className="text-lg font-semibold">I&apos;m a coach</span>
            <span className="text-xs text-muted-foreground">
              {inviteFromInvitation
                ? "An invite link requires the athlete role"
                : "Manage athletes, prescribe workouts"}
            </span>
          </Button>
        </form>
      </div>
    </main>
  );
}
