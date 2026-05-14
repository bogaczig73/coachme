"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities } from "@betri/db/schema";

export async function renameActivity(activityId: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const trimmed = name.trim().slice(0, 200);
  if (!trimmed) return;

  await db
    .update(activities)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(
      and(eq(activities.id, activityId), eq(activities.userId, session.user.id)),
    );

  revalidatePath(`/athlete/activities/${activityId}`);
  revalidatePath("/athlete/activities");
}
