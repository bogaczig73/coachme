"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, updateSession } from "@/auth";
import { db } from "@betri/db/client";
import { users, athleteProfiles, coachProfiles } from "@betri/db/schema";

export async function selectRole(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = formData.get("role");
  if (role !== "athlete" && role !== "coach") {
    throw new Error("Invalid role");
  }

  await db.update(users).set({ role }).where(eq(users.id, session.user.id));

  if (role === "athlete") {
    await db
      .insert(athleteProfiles)
      .values({ userId: session.user.id })
      .onConflictDoNothing();
  } else {
    await db
      .insert(coachProfiles)
      .values({ userId: session.user.id })
      .onConflictDoNothing();
  }

  await updateSession({
    user: { ...session.user, role },
  });

  const invite = formData.get("invite");
  if (typeof invite === "string" && invite.length > 0) {
    redirect(`/invite/${invite}`);
  }

  redirect(`/${role}`);
}
