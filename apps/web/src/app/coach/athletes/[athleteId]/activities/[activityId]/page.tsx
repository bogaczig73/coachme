import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, activityStreams, users, plannedWorkouts } from "@betri/db/schema";
import { assertCoaches } from "@/lib/access";
import { SummaryCard } from "@/components/activity/summary-card";
import { StreamChart } from "@/components/activity/stream-chart";
import { RouteMap } from "@/components/activity/route-map-loader";
import { WorkoutFeedback } from "@/components/activity/workout-feedback";
import { getSportTheme } from "@/lib/sport";
import { fmtDuration, fmtDistance } from "@/lib/format";

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

  // Find the planned workout linked to this activity
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

  const sport = activity.sport ?? "Activity";
  const startedAt = activity.startedAt
    ? new Date(activity.startedAt)
    : new Date(activity.createdAt);

  const athleteName = athlete?.name ?? athlete?.email ?? "Athlete";

  return (
    <div className="space-y-6">
      <Link
        href={`/coach/athletes/${athleteId}/calendar`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {athleteName}
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

      {/* Planned vs actual comparison */}
      {linkedWorkout && (
        <PlannedVsActual planned={linkedWorkout} actual={activity} />
      )}

      {/* Athlete feedback (read-only for coach) */}
      <WorkoutFeedback
        activityId={activity.id}
        initialRpe={activity.rpe}
        initialFeeling={activity.feeling}
        initialNotes={activity.athleteNotes}
        readOnly
      />

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

function PlannedVsActual({
  planned,
  actual,
}: {
  planned: typeof plannedWorkouts.$inferSelect;
  actual: typeof activities.$inferSelect;
}) {
  const theme = getSportTheme(planned.sport);

  const rows: { label: string; planned: string; actual: string }[] = [];

  if (planned.targetDurationSec != null || actual.durationSec != null) {
    rows.push({
      label: "Duration",
      planned: planned.targetDurationSec ? fmtDuration(planned.targetDurationSec) : "—",
      actual: actual.durationSec ? fmtDuration(actual.durationSec) : "—",
    });
  }
  if (planned.targetDistanceM != null || actual.distanceM != null) {
    rows.push({
      label: "Distance",
      planned: planned.targetDistanceM ? fmtDistance(planned.targetDistanceM) : "—",
      actual: actual.distanceM ? fmtDistance(actual.distanceM) : "—",
    });
  }
  if (planned.targetTss != null || actual.tss != null) {
    rows.push({
      label: "TSS",
      planned: planned.targetTss ? String(planned.targetTss) : "—",
      actual: actual.tss ? String(actual.tss) : "—",
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        className="flex items-center gap-2 border-b border-border px-4 py-2.5"
        style={{ background: theme.bg }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.color }}>
          {planned.name}
        </span>
      </div>
      {planned.description && (
        <div className="border-b border-border px-4 py-2.5">
          <p className="text-sm text-muted-foreground">{planned.description}</p>
        </div>
      )}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-xs">
          <div className="px-3 py-2 text-muted-foreground font-medium uppercase tracking-wider" />
          <div className="px-3 py-2 text-muted-foreground font-medium uppercase tracking-wider">Planned</div>
          <div className="px-3 py-2 text-muted-foreground font-medium uppercase tracking-wider">Actual</div>
          {rows.map((r) => (
            <>
              <div key={`${r.label}-label`} className="px-3 py-2 text-muted-foreground">{r.label}</div>
              <div key={`${r.label}-planned`} className="px-3 py-2 font-medium">{r.planned}</div>
              <div key={`${r.label}-actual`} className="px-3 py-2 font-medium">{r.actual}</div>
            </>
          ))}
        </div>
      )}
    </div>
  );
}
