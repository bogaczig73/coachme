import { and, eq, gte, lte, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, plannedWorkouts } from "@betri/db/schema";
import { CalendarGrid } from "@/components/calendar/calendar-grid";

/** Returns the Monday of the week containing `date`. */
function weekMonday(date: Date): Date {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AthleteCalendarPage() {
  const session = await auth();
  const userId = session!.user.id;

  const today = new Date();
  const todayStr = toYMD(today);

  // Rolling window: Monday 4 weeks back → Sunday 8 weeks forward
  const windowStart = weekMonday(today);
  windowStart.setDate(windowStart.getDate() - 4 * 7);

  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowStart.getDate() + 13 * 7 - 1); // 13 full weeks
  windowEnd.setHours(23, 59, 59, 999);

  const startDate = toYMD(windowStart);
  const endDate = toYMD(windowEnd);

  const [planned, done] = await Promise.all([
    db
      .select()
      .from(plannedWorkouts)
      .where(
        and(
          eq(plannedWorkouts.athleteUserId, userId),
          gte(plannedWorkouts.scheduledDate, startDate),
          lte(plannedWorkouts.scheduledDate, endDate),
        ),
      )
      .orderBy(plannedWorkouts.scheduledDate),
    db
      .select({
        id: activities.id,
        name: activities.name,
        sport: activities.sport,
        startedAt: activities.startedAt,
        durationSec: activities.durationSec,
        distanceM: activities.distanceM,
        avgPowerW: activities.avgPowerW,
        normalizedPowerW: activities.normalizedPowerW,
        avgHrBpm: activities.avgHrBpm,
        avgSpeedMps: activities.avgSpeedMps,
        tss: activities.tss,
      })
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          eq(activities.status, "ready"),
          gte(activities.startedAt, windowStart),
          lte(activities.startedAt, windowEnd),
        ),
      )
      .orderBy(desc(activities.startedAt)),
  ]);

  const calendarActivities = done.map((a) => ({
    ...a,
    startedAt: a.startedAt ? a.startedAt.toISOString() : null,
    detailHref: `/athlete/activities/${a.id}`,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Training Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Plan your workouts and track completions
        </p>
      </div>

      <CalendarGrid
        startDate={startDate}
        endDate={endDate}
        todayStr={todayStr}
        plannedWorkouts={planned}
        activities={calendarActivities}
        athleteUserId={userId}
        canCreate
        icsHref={`/api/calendar/ics?athleteId=${userId}&startDate=${startDate}&endDate=${endDate}`}
      />
    </div>
  );
}
