import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, activityStreams } from "@betri/db/schema";
import { SummaryCard } from "@/components/activity/summary-card";
import { StreamChart } from "@/components/activity/stream-chart";
import { RouteMap } from "@/components/activity/route-map-loader";
import { NameEditor } from "@/components/activity/name-editor";

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

  const [streams] = await db
    .select()
    .from(activityStreams)
    .where(eq(activityStreams.activityId, id))
    .limit(1);

  const sport = activity.sport ?? "Activity";
  const startedAt = activity.startedAt
    ? new Date(activity.startedAt)
    : new Date(activity.createdAt);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/athlete/activities"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All activities
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <NameEditor
            activityId={activity.id}
            initialName={activity.name ?? sport.charAt(0).toUpperCase() + sport.slice(1)}
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {sport.charAt(0).toUpperCase() + sport.slice(1)} ·{" "}
            {startedAt.toLocaleString(undefined, {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
        </div>
        {activity.status !== "ready" && (
          <span
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              activity.status === "failed"
                ? "bg-red-500/15 text-red-700"
                : "bg-yellow-500/15 text-yellow-700"
            }`}
          >
            {activity.status}
            {activity.status === "failed" && activity.errorMessage
              ? `: ${activity.errorMessage}`
              : ""}
          </span>
        )}
      </header>

      <SummaryCard activity={activity} />

      {streams && streams.timestampSec && streams.timestampSec.length > 0 ? (
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
      ) : activity.status === "ready" ? (
        <div className="rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          No stream data was recorded for this activity.
        </div>
      ) : (
        <div className="rounded-lg border border-border p-12 text-center text-sm text-muted-foreground">
          Waiting for the worker to parse this activity…
        </div>
      )}

      <div className="rounded-lg border border-border p-6">
        <h2 className="font-semibold">Coach comments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-workout chat with your coach lands here in Phase 3.
        </p>
      </div>
    </div>
  );
}
