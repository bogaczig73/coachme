"use server";

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import {
  coachInvitations,
  coachAthletes,
  conversations,
  conversationReads,
  messages,
  messageReactions,
  users,
} from "@betri/db/schema";
import {
  assertConversationMember,
  getOrCreateConversation,
} from "./queries";
import { publishMessage } from "./pusher-server";

function originFromHeaders(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function createInvitation(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "coach") {
    throw new Error("Only coaches can invite athletes");
  }

  const rawEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!rawEmail || !rawEmail.includes("@")) {
    throw new Error("Enter a valid email");
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // 14 days

  await db.insert(coachInvitations).values({
    coachUserId: session.user.id,
    athleteEmail: rawEmail,
    token,
    expiresAt,
  });

  revalidatePath("/coach/athletes");
  return { url: `${originFromHeaders()}/invite/${token}` };
}

export async function acceptInvitation(token: string) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?invite=${encodeURIComponent(token)}`);
  }

  const [invite] = await db
    .select()
    .from(coachInvitations)
    .where(eq(coachInvitations.token, token))
    .limit(1);

  if (!invite) throw new Error("Invitation not found");
  if (invite.status !== "pending") throw new Error("Invitation already used");
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new Error("Invitation expired");
  }

  // Enforce that the athlete role is set; force onboarding if not.
  if (!session.user.role) {
    redirect(`/onboarding?invite=${encodeURIComponent(token)}`);
  }

  if (session.user.role !== "athlete") {
    throw new Error("Only athlete accounts can accept this invite");
  }

  if (invite.coachUserId === session.user.id) {
    throw new Error("You can't connect to yourself");
  }

  await db
    .insert(coachAthletes)
    .values({
      coachUserId: invite.coachUserId,
      athleteUserId: session.user.id,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [coachAthletes.coachUserId, coachAthletes.athleteUserId],
      set: { status: "active" },
    });

  await db
    .update(coachInvitations)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(coachInvitations.token, token));

  const conv = await getOrCreateConversation(invite.coachUserId, session.user.id);

  revalidatePath("/athlete");
  revalidatePath("/coach/athletes");
  revalidatePath("/chat");

  redirect(`/chat/${conv.id}`);
}

export async function sendMessage(input: {
  conversationId: string;
  body?: string;
  replyToMessageId?: string;
  activityId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const conv = await assertConversationMember(input.conversationId, session.user.id);

  const body = input.body?.trim() || null;
  if (!body && !input.activityId) {
    throw new Error("Message is empty");
  }

  const [inserted] = await db
    .insert(messages)
    .values({
      conversationId: conv.id,
      senderUserId: session.user.id,
      body,
      replyToMessageId: input.replyToMessageId ?? null,
      activityId: input.activityId ?? null,
    })
    .returning();

  if (!inserted) throw new Error("Insert failed");

  const now = new Date();
  await db
    .update(conversations)
    .set({ lastMessageAt: now })
    .where(eq(conversations.id, conv.id));

  await db
    .insert(conversationReads)
    .values({ conversationId: conv.id, userId: session.user.id, lastReadAt: now })
    .onConflictDoUpdate({
      target: [conversationReads.conversationId, conversationReads.userId],
      set: { lastReadAt: now },
    });

  await publishMessage(conv.id, "message:new", {
    id: inserted.id,
    senderUserId: inserted.senderUserId,
  });

  revalidatePath("/chat");
  return {
    id: inserted.id,
    createdAt:
      inserted.createdAt instanceof Date
        ? inserted.createdAt.toISOString()
        : String(inserted.createdAt),
  };
}

export async function toggleReaction(messageId: string, emoji: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [msg] = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!msg) throw new Error("Message not found");

  await assertConversationMember(msg.conversationId, session.user.id);

  const [existing] = await db
    .select()
    .from(messageReactions)
    .where(
      and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, session.user.id),
        eq(messageReactions.emoji, emoji),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, session.user.id),
          eq(messageReactions.emoji, emoji),
        ),
      );
  } else {
    await db.insert(messageReactions).values({
      messageId,
      userId: session.user.id,
      emoji,
    });
  }

  await publishMessage(msg.conversationId, "reaction:changed", {
    messageId,
  });

  revalidatePath(`/chat/${msg.conversationId}`);
}

export async function markRead(conversationId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await assertConversationMember(conversationId, session.user.id);

  await db
    .insert(conversationReads)
    .values({
      conversationId,
      userId: session.user.id,
      lastReadAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [conversationReads.conversationId, conversationReads.userId],
      set: { lastReadAt: new Date() },
    });
}

export async function fetchMessagesSince(
  conversationId: string,
  sinceIso: string | null,
) {
  const session = await auth();
  if (!session?.user?.id) return [];

  await assertConversationMember(conversationId, session.user.id);

  const { getConversationMessages } = await import("./queries");
  const all = await getConversationMessages(conversationId, 500);
  if (!sinceIso) return all;
  const since = new Date(sinceIso);
  return all.filter((m) => m.createdAt > since);
}

void users;
