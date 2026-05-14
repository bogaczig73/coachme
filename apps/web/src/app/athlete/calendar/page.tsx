import { and, eq, gte, lte, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@betri/db/client";
import { activities, plannedWorkouts } from "@betri/db/schema";
import { CalendarGrid } from "@/components/calendar/calendar-grid";

interface Props {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function AthleteCalendarPage({ searchParams }: Props) {
  const session = await auth();
  const userId = session!.user.id;

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [planned, done] = await Promise.all([
    db
      .select()
      .from(plannedWorkouts)
      .where(
        and(
          eq(plannedWorkouts.athleteUserId, userId),
          gte(plannedWorkouts.scheduledDate, `${year}-${String(month).padStart(2, "0")}-01`),
          lte(
            plannedWorkouts.scheduledDate,
            `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`,
          ),
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
        tss: activities.tss,
      })
      .from(activities)
      .where(
        and(
          eq(activities.userId, userId),
          eq(activities.status, "ready"),
          gte(activities.startedAt, monthStart),
          lte(activities.startedAt, monthEnd),
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Training Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Plan your workouts and track completions
        </p>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        plannedWorkouts={planned}
        activities={calendarActivities}
        athleteUserId={userId}
        canCreate
        calendarBaseHref="/athlete/calendar"
        icsHref={`/api/calendar/ics?athleteId=${userId}&year=${year}&month=${month}`}
      />
    </div>
  );
}
