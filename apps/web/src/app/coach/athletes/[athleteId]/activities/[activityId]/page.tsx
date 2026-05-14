import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, activityStreams, users } from "@betri/db/schema";
import { assertCoaches } from "@/lib/access";
import { SummaryCard } from "@/components/activity/summary-card";
import { StreamChart } from "@/components/activity/stream-chart";
import { RouteMap } from "@/components/activity/route-map-loader";

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

  const [streams] = await db
    .select()
    .from(activityStreams)
    .where(eq(activityStreams.activityId, activityId))
    .limit(1);

  const [athlete] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, athleteId))
    .limit(1);

  const sport = activity.sport ?? "Activity";
  const startedAt = activity.startedAt
    ? new Date(activity.startedAt)
    : new Date(activity.createdAt);

  return (
    <div className="space-y-6">
      <Link
        href={`/coach/athletes/${athleteId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {athlete?.name ?? athlete?.email ?? "Athlete"}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">
          {activity.name ?? sport.charAt(0).toUpperCase() + sport.slice(1)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sport.charAt(0).toUpperCase() + sport.slice(1)} ·{" "}
          {startedAt.toLocaleString(undefined, {
            dateStyle: "full",
            timeStyle: "short",
          })}
        </p>
      </header>

      <SummaryCard activity={activity} />

      {streams && streams.timestampSec && streams.timestampSec.length > 0 && (
        <>
          <StreamChart
            timestampSec={streams.timestampSec}
            powerW={streams.powerW}
            hrBpm={streams.hrBpm}
            cadenceRpm={streams.cadenceRpm}
            speedMps={streams.speedMps}
            altitudeM={streams.altitudeM}
          />
          {streams.lat && streams.lon && streams.lat.some((v) => v != null) && (
            <RouteMap lat={streams.lat} lon={streams.lon} />
          )}
        </>
      )}
    </div>
  );
}
