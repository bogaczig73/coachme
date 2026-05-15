import { notFound, redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, activityStreams, plannedWorkouts } from "@betri/db/schema";
import { ActivityDetailView } from "@/components/activity/activity-detail-view";

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [activity] = await db
    .select()
    .from(activities)
    .where(and(eq(activities.id, id), eq(activities.userId, session.user.id)))
    .limit(1);
  if (!activity) notFound();

  const [streamRow] = await db
    .select()
    .from(activityStreams)
    .where(eq(activityStreams.activityId, id))
    .limit(1);

  const activityDate = activity.startedAt ? toYMD(activity.startedAt) : null;
  const sameDayWorkouts = activityDate
    ? await db
        .select()
        .from(plannedWorkouts)
        .where(
          and(
            eq(plannedWorkouts.athleteUserId, session.user.id),
            eq(plannedWorkouts.scheduledDate, activityDate),
          ),
        )
    : [];

  const linkedWorkout = sameDayWorkouts.find((pw) => pw.completedActivityId === id) ?? null;

  return (
    <ActivityDetailView
      activity={activity}
      linkedWorkout={linkedWorkout}
      sameDayWorkouts={sameDayWorkouts}
      readOnly={false}
      canEditName={true}
      backHref="/athlete/activities"
      backLabel="All activities"
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
