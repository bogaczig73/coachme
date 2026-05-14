import Link from "next/link";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import {
  coachAthletes,
  coachInvitations,
  users,
  conversations,
} from "@betri/db/schema";
import { InviteForm } from "./invite-form";
import { CopyButton } from "./copy-button";

export default async function CoachAthletesPage() {
  const session = await auth();
  const coachId = session!.user.id;

  const athletes = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      conversationId: conversations.id,
    })
    .from(coachAthletes)
    .innerJoin(users, eq(users.id, coachAthletes.athleteUserId))
    .leftJoin(
      conversations,
      and(
        eq(conversations.coachUserId, coachId),
        eq(conversations.athleteUserId, users.id),
      ),
    )
    .where(
      and(eq(coachAthletes.coachUserId, coachId), eq(coachAthletes.status, "active")),
    );

  const pendingInvites = await db
    .select()
    .from(coachInvitations)
    .where(
      and(
        eq(coachInvitations.coachUserId, coachId),
        eq(coachInvitations.status, "pending"),
      ),
    )
    .orderBy(desc(coachInvitations.createdAt))
    .limit(20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Athletes</h1>
        <p className="text-sm text-muted-foreground">
          {athletes.length} active · {pendingInvites.length} pending invite
          {pendingInvites.length === 1 ? "" : "s"}
        </p>
      </div>

      <section className="rounded-lg border border-border p-6">
        <h2 className="font-semibold">Invite a new athlete</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a link, then send it however you like (email, Slack, SMS).
        </p>
        <div className="mt-4">
          <InviteForm />
        </div>
      </section>

      {athletes.length > 0 && (
        <section>
          <h2 className="font-semibold">Active</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {athletes.map((a) => (
              <li key={a.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {a.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.image}
                      alt=""
                      className="h-9 w-9 rounded-full"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-muted" />
                  )}
                  <div>
                    <p className="font-medium">{a.name ?? a.email}</p>
                    {a.name && a.email && (
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/coach/athletes/${a.id}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Activities
                  </Link>
                  {a.conversationId && (
                    <Link
                      href={`/chat/${a.conversationId}`}
                      className="rounded-md border border-border px-2.5 py-1 hover:bg-muted"
                    >
                      Message
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingInvites.length > 0 && (
        <section>
          <h2 className="font-semibold">Pending invites</h2>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {pendingInvites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">{inv.athleteEmail}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {new Date(inv.createdAt).toLocaleDateString()} · expires{" "}
                    {inv.expiresAt
                      ? new Date(inv.expiresAt).toLocaleDateString()
                      : "never"}
                  </p>
                </div>
                <CopyLink token={inv.token} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CopyLink({ token }: { token: string }) {
  return <CopyButton path={`/invite/${token}`} />;
}
