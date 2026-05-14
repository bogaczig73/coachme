import { and, desc, eq, or, inArray } from "drizzle-orm";
import { db } from "@betri/db/client";
import {
  conversations,
  messages,
  messageReactions,
  conversationReads,
  users,
  activities,
  type Conversation,
} from "@betri/db/schema";

export async function getOrCreateConversation(
  coachUserId: string,
  athleteUserId: string,
): Promise<Conversation> {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.coachUserId, coachUserId),
        eq(conversations.athleteUserId, athleteUserId),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({ coachUserId, athleteUserId })
    .returning();

  return created!;
}

export async function listConversationsForUser(userId: string) {
  const rows = await db
    .select({
      conversation: conversations,
      coach: { id: users.id, name: users.name, email: users.email, image: users.image },
    })
    .from(conversations)
    .innerJoin(users, eq(users.id, conversations.coachUserId))
    .where(
      or(
        eq(conversations.coachUserId, userId),
        eq(conversations.athleteUserId, userId),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt));

  const ids = rows.map((r) => r.conversation.athleteUserId);
  const athletes = ids.length
    ? await db
        .select({ id: users.id, name: users.name, email: users.email, image: users.image })
        .from(users)
        .where(inArray(users.id, ids))
    : [];

  const byId = new Map(athletes.map((a) => [a.id, a]));

  return rows.map((r) => ({
    conversation: r.conversation,
    coach: r.coach,
    athlete: byId.get(r.conversation.athleteUserId) ?? null,
    otherUser:
      r.conversation.coachUserId === userId
        ? byId.get(r.conversation.athleteUserId) ?? null
        : r.coach,
  }));
}

export interface MessageWithExtras {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string | null;
  replyToMessageId: string | null;
  activityId: string | null;
  createdAt: Date;
  reactions: { emoji: string; userId: string }[];
  activity: {
    id: string;
    name: string | null;
    sport: string | null;
    startedAt: Date | null;
    durationSec: number | null;
    distanceM: number | null;
    tss: number | null;
  } | null;
  replyTo: {
    id: string;
    senderUserId: string;
    body: string | null;
    activityName: string | null;
  } | null;
}

export async function getConversationMessages(
  conversationId: string,
  limit = 200,
): Promise<MessageWithExtras[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(limit);

  if (rows.length === 0) return [];

  const messageIds = rows.map((r) => r.id);
  const reactionRows = await db
    .select()
    .from(messageReactions)
    .where(inArray(messageReactions.messageId, messageIds));

  const reactionsByMessage = new Map<string, { emoji: string; userId: string }[]>();
  for (const r of reactionRows) {
    const list = reactionsByMessage.get(r.messageId) ?? [];
    list.push({ emoji: r.emoji, userId: r.userId });
    reactionsByMessage.set(r.messageId, list);
  }

  const activityIds = rows
    .map((r) => r.activityId)
    .filter((id): id is string => !!id);
  const activityRows = activityIds.length
    ? await db
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
        .where(inArray(activities.id, activityIds))
    : [];
  const activityById = new Map(activityRows.map((a) => [a.id, a]));

  const replyIds = rows
    .map((r) => r.replyToMessageId)
    .filter((id): id is string => !!id);
  const replyRows = replyIds.length
    ? await db
        .select({
          id: messages.id,
          senderUserId: messages.senderUserId,
          body: messages.body,
          activityId: messages.activityId,
        })
        .from(messages)
        .where(inArray(messages.id, replyIds))
    : [];
  const replyById = new Map(
    replyRows.map((r) => [
      r.id,
      {
        id: r.id,
        senderUserId: r.senderUserId,
        body: r.body,
        activityName: r.activityId ? activityById.get(r.activityId)?.name ?? "Workout" : null,
      },
    ]),
  );

  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversationId,
    senderUserId: r.senderUserId,
    body: r.body,
    replyToMessageId: r.replyToMessageId,
    activityId: r.activityId,
    createdAt: r.createdAt,
    reactions: reactionsByMessage.get(r.id) ?? [],
    activity: r.activityId ? activityById.get(r.activityId) ?? null : null,
    replyTo: r.replyToMessageId ? replyById.get(r.replyToMessageId) ?? null : null,
  }));
}

export async function assertConversationMember(
  conversationId: string,
  userId: string,
): Promise<Conversation> {
  const [c] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!c) throw new Error("Conversation not found");
  if (c.coachUserId !== userId && c.athleteUserId !== userId) {
    throw new Error("Not a participant");
  }
  return c;
}

export async function getReadState(conversationId: string) {
  return db
    .select()
    .from(conversationReads)
    .where(eq(conversationReads.conversationId, conversationId));
}
