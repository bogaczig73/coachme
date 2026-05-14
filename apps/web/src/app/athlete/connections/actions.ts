"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { garminConnections } from "@betri/db/schema";

export async function disconnectGarmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db
    .delete(garminConnections)
    .where(eq(garminConnections.userId, session.user.id));

  revalidatePath("/athlete/connections");
}
