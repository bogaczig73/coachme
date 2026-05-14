import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { db } from "@betri/db/client";
import { coachInvitations, users } from "@betri/db/schema";
import { AcceptForm } from "./accept-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  const [invite] = await db
    .select({
      invite: coachInvitations,
      coach: { id: users.id, name: users.name, email: users.email, image: users.image },
    })
    .from(coachInvitations)
    .innerJoin(users, eq(users.id, coachInvitations.coachUserId))
    .where(eq(coachInvitations.token, token))
    .limit(1);

  if (!invite) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-stretch justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold">Invite not found</h1>
        <p className="text-sm text-muted-foreground">
          This invite link is invalid or has been removed.
        </p>
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
      </main>
    );
  }

  const expired =
    invite.invite.expiresAt && invite.invite.expiresAt < new Date();
  const used = invite.invite.status !== "pending";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-stretch justify-center gap-6 px-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Coaching invite</p>
        <h1 className="mt-1 text-2xl font-semibold">
          {invite.coach.name ?? invite.coach.email} wants to be your coach
        </h1>
      </div>

      {used ? (
        <div className="rounded-md border border-border bg-muted p-4 text-sm">
          This invite was already used. If that wasn&apos;t you, ask your coach to
          send a new link.
        </div>
      ) : expired ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800">
          This invite has expired. Ask your coach to send a new one.
        </div>
      ) : !session?.user ? (
        <Button asChild>
          <Link href={`/login?invite=${encodeURIComponent(token)}`}>
            Sign in to accept
          </Link>
        </Button>
      ) : session.user.role === "coach" ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800">
          You&apos;re signed in as a coach. Sign out and accept this invite with an
          athlete account.
        </div>
      ) : (
        <AcceptForm token={token} />
      )}
    </main>
  );
}
