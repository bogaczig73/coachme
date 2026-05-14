import { and, eq } from "drizzle-orm";
import { db } from "@betri/db/client";
import { coachAthletes } from "@betri/db/schema";

export async function assertCoaches(
  coachUserId: string,
  athleteUserId: string,
): Promise<void> {
  const [row] = await db
    .select()
    .from(coachAthletes)
    .where(
      and(
        eq(coachAthletes.coachUserId, coachUserId),
        eq(coachAthletes.athleteUserId, athleteUserId),
        eq(coachAthletes.status, "active"),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Not connected to this athlete");
}
