import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, users } from "@betri/db/schema";
import {
  assertConversationMember,
  getConversationMessages,
} from "@/lib/chat/queries";
import { ChatThread, type ChatMessage } from "@/components/chat/chat-thread";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let conversation;
  try {
    conversation = await assertConversationMember(id, session.user.id);
  } catch {
    notFound();
  }

  const otherUserId =
    conversation.coachUserId === session.user.id
      ? conversation.athleteUserId
      : conversation.coachUserId;

  const [other] = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(eq(users.id, otherUserId))
    .limit(1);

  if (!other) notFound();

  // Activity picker shows the athlete's activities.
  const athleteUserId = conversation.athleteUserId;
  const pickerRows = await db
    .select({
      id: activities.id,
      name: activities.name,
      sport: activities.sport,
      startedAt: activities.startedAt,
      durationSec: activities.durationSec,
      distanceM: activities.distanceM,
      tss: activities.tss,
    })
    .from(activities)
    .where(eq(activities.userId, athleteUserId))
    .orderBy(desc(activities.startedAt), desc(activities.createdAt))
    .limit(50);

  const rawMessages = await getConversationMessages(id, 200);
  const initialMessages: ChatMessage[] = rawMessages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderUserId: m.senderUserId,
    body: m.body,
    replyToMessageId: m.replyToMessageId,
    activityId: m.activityId,
    createdAt: m.createdAt.toISOString(),
    reactions: m.reactions,
    activity: m.activity
      ? {
          id: m.activity.id,
          name: m.activity.name,
          sport: m.activity.sport,
          startedAt: m.activity.startedAt
            ? m.activity.startedAt.toISOString()
            : null,
          durationSec: m.activity.durationSec,
          distanceM: m.activity.distanceM,
          tss: m.activity.tss,
        }
      : null,
    replyTo: m.replyTo,
  }));

  const pickerActivities = pickerRows.map((a) => ({
    id: a.id,
    name: a.name,
    sport: a.sport,
    startedAt: a.startedAt ? a.startedAt.toISOString() : null,
    durationSec: a.durationSec,
    distanceM: a.distanceM,
    tss: a.tss,
  }));

  // Coach views athletes activities under /coach/athletes/{athleteId}/activities/{id}
  // Athlete views their own under /athlete/activities/{id}
  const isCoach = conversation.coachUserId === session.user.id;
  const detailHrefBase = isCoach
    ? `/coach/athletes/${athleteUserId}`
    : "/athlete";

  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY ?? null;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? null;
  const pusherEnabled = !!pusherKey && !!pusherCluster;

  return (
    <div className="space-y-4">
      <Link
        href="/chat"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← All conversations
      </Link>
      <ChatThread
        conversationId={id}
        currentUserId={session.user.id}
        otherUser={other}
        initialMessages={initialMessages}
        pickerActivities={pickerActivities}
        pickerAthleteId={athleteUserId}
        detailHrefBase={detailHrefBase}
        pusher={{
          enabled: pusherEnabled,
          key: pusherKey,
          cluster: pusherCluster,
        }}
      />
    </div>
  );
}
