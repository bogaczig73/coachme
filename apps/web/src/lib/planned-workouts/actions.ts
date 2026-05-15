"use server";

import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { plannedWorkouts, coachAthletes } from "@betri/db/schema";

// ── helpers ──────────────────────────────────────────────────────────────────

async function assertCanManage(
  actorId: string,
  athleteUserId: string,
): Promise<void> {
  // Actor is the athlete themselves — always allowed.
  if (actorId === athleteUserId) return;

  // Actor must be an active coach of that athlete.
  const [row] = await db
    .select()
    .from(coachAthletes)
    .where(
      and(
        eq(coachAthletes.coachUserId, actorId),
        eq(coachAthletes.athleteUserId, athleteUserId),
        eq(coachAthletes.status, "active"),
      ),
    )
    .limit(1);
  if (!row) throw new Error("Not authorised to manage this athlete's workouts");
}

// ── queries ───────────────────────────────────────────────────────────────────

export async function getPlannedWorkoutsForMonth(
  athleteUserId: string,
  year: number,
  month: number, // 1-based
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await assertCanManage(session.user.id, athleteUserId);

  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return db
    .select()
    .from(plannedWorkouts)
    .where(
      and(
        eq(plannedWorkouts.athleteUserId, athleteUserId),
        gte(plannedWorkouts.scheduledDate, from),
        lte(plannedWorkouts.scheduledDate, to),
      ),
    )
    .orderBy(plannedWorkouts.scheduledDate);
}

// ── mutations ─────────────────────────────────────────────────────────────────

export async function createPlannedWorkout(input: {
  athleteUserId: string;
  scheduledDate: string; // YYYY-MM-DD
  sport: string;
  name: string;
  description?: string;
  targetDurationSec?: number;
  targetDistanceM?: number;
  targetTss?: number;
  targetCaloriesKcal?: number;
  targetElevationGainM?: number;
  targetAvgPowerW?: number;
  targetAvgHrBpm?: number;
  targetIntensityFactor?: number;
  preActivityComments?: string;
  workoutSteps?: import("@betri/db/schema").WorkoutStep[];
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await assertCanManage(session.user.id, input.athleteUserId);

  const [inserted] = await db
    .insert(plannedWorkouts)
    .values({
      athleteUserId: input.athleteUserId,
      createdByUserId: session.user.id,
      scheduledDate: input.scheduledDate,
      sport: input.sport,
      name: input.name,
      description: input.description ?? null,
      targetDurationSec: input.targetDurationSec ?? null,
      targetDistanceM: input.targetDistanceM ?? null,
      targetTss: input.targetTss ?? null,
      targetCaloriesKcal: input.targetCaloriesKcal ?? null,
      targetElevationGainM: input.targetElevationGainM ?? null,
      targetAvgPowerW: input.targetAvgPowerW ?? null,
      targetAvgHrBpm: input.targetAvgHrBpm ?? null,
      targetIntensityFactor: input.targetIntensityFactor ?? null,
      preActivityComments: input.preActivityComments ?? null,
      workoutSteps: input.workoutSteps ?? null,
    })
    .returning();

  if (!inserted) throw new Error("Insert failed");

  revalidatePath("/athlete/calendar");
  revalidatePath(`/coach/athletes/${input.athleteUserId}/calendar`);

  return { id: inserted.id };
}

export async function updatePlannedWorkout(input: {
  id: string;
  scheduledDate?: string;
  sport?: string;
  name?: string;
  description?: string | null;
  targetDurationSec?: number | null;
  targetDistanceM?: number | null;
  targetTss?: number | null;
  targetCaloriesKcal?: number | null;
  targetElevationGainM?: number | null;
  targetAvgPowerW?: number | null;
  targetAvgHrBpm?: number | null;
  targetIntensityFactor?: number | null;
  preActivityComments?: string | null;
  workoutSteps?: import("@betri/db/schema").WorkoutStep[] | null;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [existing] = await db
    .select({ athleteUserId: plannedWorkouts.athleteUserId })
    .from(plannedWorkouts)
    .where(eq(plannedWorkouts.id, input.id))
    .limit(1);
  if (!existing) throw new Error("Planned workout not found");

  await assertCanManage(session.user.id, existing.athleteUserId);

  const { id, ...fields } = input;
  await db
    .update(plannedWorkouts)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(plannedWorkouts.id, id));

  revalidatePath("/athlete/calendar");
  revalidatePath(`/coach/athletes/${existing.athleteUserId}/calendar`);
}

export async function deletePlannedWorkout(id: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [existing] = await db
    .select({ athleteUserId: plannedWorkouts.athleteUserId })
    .from(plannedWorkouts)
    .where(eq(plannedWorkouts.id, id))
    .limit(1);
  if (!existing) throw new Error("Planned workout not found");

  await assertCanManage(session.user.id, existing.athleteUserId);

  await db.delete(plannedWorkouts).where(eq(plannedWorkouts.id, id));

  revalidatePath("/athlete/calendar");
  revalidatePath(`/coach/athletes/${existing.athleteUserId}/calendar`);
}
