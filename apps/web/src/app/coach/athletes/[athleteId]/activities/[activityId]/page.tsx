import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, activityStreams, users, plannedWorkouts } from "@betri/db/schema";
import { assertCoaches } from "@/lib/access";
import { ActivityDetailView } from "@/components/activity/activity-detail-view";

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function CoachActivityDetailPage({
  params,
}: {
  params: Promise<{ athleteId: string; activityId: string }>;
}) {
  const { athleteId, activityId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  try {
    await assertCoaches(session.user.id, athleteId);
  } catch {
    notFound();
  }

  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.id, activityId), eq(activities.userId, athleteId)))
    .limit(1);
  if (!activity) notFound();

  const [streamRow] = await db
    .select()
    .from(activityStreams)
    .where(eq(activityStreams.activityId, activityId))
    .limit(1);

  const [athlete] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, athleteId))
    .limit(1);

  const activityDate = activity.startedAt ? toYMD(activity.startedAt) : null;
  const sameDayWorkouts = activityDate
    ? await db
        .select()
        .from(plannedWorkouts)
        .where(
          and(
            eq(plannedWorkouts.athleteUserId, athleteId),
            eq(plannedWorkouts.scheduledDate, activityDate),
          ),
        )
    : [];

  const linkedWorkout = sameDayWorkouts.find((pw) => pw.completedActivityId === activityId) ?? null;
  const athleteName = athlete?.name ?? athlete?.email ?? "Athlete";

  return (
    <ActivityDetailView
      activity={activity}
      linkedWorkout={linkedWorkout}
      sameDayWorkouts={[]}
      readOnly={true}
      canEditName={false}
      backHref={`/coach/athletes/${athleteId}/calendar`}
      backLabel={athleteName}
      streams={
        streamRow
          ? {
              timestampSec: streamRow.timestampSec ?? null,
              powerW: streamRow.powerW ?? null,
              hrBpm: streamRow.hrBpm ?? null,
              cadenceRpm: streamRow.cadenceRpm ?? null,
              speedMps: streamRow.speedMps ?? null,
              altitudeM: streamRow.altitudeM ?? null,
              lat: streamRow.lat ?? null,
              lon: streamRow.lon ?? null,
            }
          : null
      }
    />
  );
}
