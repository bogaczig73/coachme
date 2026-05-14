import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc, or, inArray, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import {
  conversations,
  conversationReads,
  messages,
  users,
} from "@betri/db/schema";

export default async function ChatInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const convs = await db
    .select()
    .from(conversations)
    .where(
      or(
        eq(conversations.coachUserId, userId),
        eq(conversations.athleteUserId, userId),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));

  if (convs.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <div className="rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          No conversations yet.
          {session.user.role === "coach" ? (
            <>
              <br />
              <Link
                href="/coach/athletes"
                className="mt-2 inline-block font-medium text-foreground hover:underline"
              >
                Invite an athlete →
              </Link>
            </>
          ) : (
            " Ask your coach to send you an invite link."
          )}
        </div>
      </div>
    );
  }

  const otherIds = convs.map((c) =>
    c.coachUserId === userId ? c.athleteUserId : c.coachUserId,
  );
  const otherUsers = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(inArray(users.id, otherIds));
  const userById = new Map(otherUsers.map((u) => [u.id, u]));

  const reads = await db
    .select()
    .from(conversationReads)
    .where(
      and(
        eq(conversationReads.userId, userId),
        inArray(
          conversationReads.conversationId,
          convs.map((c) => c.id),
        ),
      ),
    );
  const readByConv = new Map(reads.map((r) => [r.conversationId, r.lastReadAt]));

  const lastMsgs = await db
    .select()
    .from(messages)
    .where(
      inArray(
        messages.conversationId,
        convs.map((c) => c.id),
      ),
    )
    .orderBy(desc(messages.createdAt));
  const lastByConv = new Map<string, (typeof lastMsgs)[number]>();
  for (const m of lastMsgs) {
    if (!lastByConv.has(m.conversationId)) lastByConv.set(m.conversationId, m);
  }

  // Unread = messages newer than my lastReadAt, sent by the other user.
  const unreadCounts = new Map<string, number>();
  for (const c of convs) {
    const since = readByConv.get(c.id);
    const all = lastMsgs.filter(
      (m) => m.conversationId === c.id && m.senderUserId !== userId,
    );
    unreadCounts.set(
      c.id,
      since ? all.filter((m) => m.createdAt > since).length : all.length,
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Chat</h1>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {convs.map((c) => {
          const otherId =
            c.coachUserId === userId ? c.athleteUserId : c.coachUserId;
          const other = userById.get(otherId);
          const last = lastByConv.get(c.id);
          const unread = unreadCounts.get(c.id) ?? 0;
          return (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
              >
                {other?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={other.image}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium">
                      {other?.name ?? other?.email ?? "Unknown"}
                    </p>
                    {last && (
                      <p className="shrink-0 text-xs text-muted-foreground">
                        {timeAgo(last.createdAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                      {last?.body ?? (last?.activityId ? "🏃 Shared a workout" : "—")}
                    </p>
                    {unread > 0 && (
                      <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-xs font-medium text-background">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function timeAgo(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}
