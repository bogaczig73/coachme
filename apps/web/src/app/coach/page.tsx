import Link from "next/link";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { db } from "@betri/db/client";
import { coachAthletes, users, conversations, messages } from "@betri/db/schema";

export default async function CoachHome() {
  const session = await auth();
  const userId = session!.user.id;

  const athleteRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(coachAthletes)
    .innerJoin(users, eq(users.id, coachAthletes.athleteUserId))
    .where(
      and(
        eq(coachAthletes.coachUserId, userId),
        eq(coachAthletes.status, "active"),
      ),
    )
    .limit(5);

  const latestMsgs = athleteRows.length
    ? await db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          body: messages.body,
          senderUserId: messages.senderUserId,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(
          conversations,
          eq(conversations.id, messages.conversationId),
        )
        .where(eq(conversations.coachUserId, userId))
        .orderBy(desc(messages.createdAt))
        .limit(3)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          Welcome, {session?.user?.name?.split(" ")[0] ?? "coach"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage athletes and discuss workouts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-6">
          <h2 className="font-semibold">Athletes ({athleteRows.length})</h2>
          {athleteRows.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Invite your first athlete to get started.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {athleteRows.map((a) => (
                <li key={a.id} className="text-muted-foreground">
                  {a.name ?? a.email}
                </li>
              ))}
            </ul>
          )}
          <Button asChild className="mt-4" variant={athleteRows.length ? "outline" : "default"}>
            <Link href="/coach/athletes">Manage athletes</Link>
          </Button>
        </div>

        <div className="rounded-lg border border-border p-6">
          <h2 className="font-semibold">Recent chat</h2>
          {latestMsgs.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              No messages yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {latestMsgs.map((m) => (
                <li key={m.id} className="truncate">
                  {m.body ?? "[attachment]"}
                </li>
              ))}
            </ul>
          )}
          <Button asChild className="mt-4" variant="outline">
            <Link href="/chat">Open inbox</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
