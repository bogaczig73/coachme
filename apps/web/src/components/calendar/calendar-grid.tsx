"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSportTheme } from "@/lib/sport";
import { fmtDuration, fmtDistance } from "@/lib/format";
import { WorkoutFormModal } from "./workout-form-modal";
import type { PlannedWorkout } from "@betri/db/schema";

interface CalendarActivity {
  id: string;
  name: string | null;
  sport: string | null;
  startedAt: string | null; // ISO string
  durationSec: number | null;
  distanceM: number | null;
  tss: number | null;
  detailHref: string;
}

interface Props {
  year: number;
  month: number; // 1-based
  plannedWorkouts: PlannedWorkout[];
  activities: CalendarActivity[];
  athleteUserId: string;
  canCreate: boolean;
  calendarBaseHref: string; // e.g. "/athlete/calendar" or "/coach/athletes/x/calendar"
  icsHref: string; // e.g. "/api/calendar/ics?athleteId=x"
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function CalendarGrid({
  year,
  month,
  plannedWorkouts,
  activities,
  athleteUserId,
  canCreate,
  calendarBaseHref,
  icsHref,
}: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<
    | { type: "create"; date: string }
    | { type: "edit"; workout: PlannedWorkout }
    | null
  >(null);

  // Build day grid: 1st day of month, padded to Monday
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // 0=Mon … 6=Sun

  const days: (number | null)[] = [
    ...Array<null>(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (days.length % 7 !== 0) days.push(null);

  // Index data by date string
  const plannedByDate = new Map<string, PlannedWorkout[]>();
  for (const pw of plannedWorkouts) {
    const list = plannedByDate.get(pw.scheduledDate) ?? [];
    list.push(pw);
    plannedByDate.set(pw.scheduledDate, list);
  }

  const activitiesByDate = new Map<string, CalendarActivity[]>();
  for (const act of activities) {
    if (!act.startedAt) continue;
    const d = toYMD(new Date(act.startedAt));
    const list = activitiesByDate.get(d) ?? [];
    list.push(act);
    activitiesByDate.set(d, list);
  }

  const todayYMD = toYMD(new Date());

  function prevMonth() {
    const d = new Date(year, month - 2, 1);
    router.push(`${calendarBaseHref}?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
  }
  function nextMonth() {
    const d = new Date(year, month, 1);
    router.push(`${calendarBaseHref}?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[160px] text-center text-lg font-semibold">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <a
          href={icsHref}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          title="Export calendar (.ics)"
        >
          <Download className="h-3.5 w-3.5" />
          Export .ics
        </a>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px rounded-t-lg border border-border bg-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="bg-muted/60 px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-px rounded-b-lg border border-border bg-border">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="min-h-[100px] bg-muted/20" />;
          }

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isToday = dateStr === todayYMD;
          const planned = plannedByDate.get(dateStr) ?? [];
          const done = activitiesByDate.get(dateStr) ?? [];

          return (
            <div
              key={dateStr}
              className="group min-h-[100px] bg-background p-1.5 transition-colors hover:bg-muted/30"
              onClick={() => canCreate && setModal({ type: "create", date: dateStr })}
              style={{ cursor: canCreate ? "pointer" : "default" }}
            >
              {/* Day number */}
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {day}
              </div>

              {/* Planned workouts */}
              {planned.map((pw) => {
                const theme = getSportTheme(pw.sport);
                return (
                  <button
                    key={pw.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setModal({ type: "edit", workout: pw });
                    }}
                    className="mb-0.5 flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs hover:opacity-80"
                    style={{ backgroundColor: theme.bg, color: theme.color }}
                    title={pw.name}
                  >
                    <span className="truncate font-medium">{pw.name}</span>
                    {pw.targetDurationSec && (
                      <span className="ml-auto shrink-0 opacity-70">
                        {fmtDuration(pw.targetDurationSec)}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Completed activities */}
              {done.map((act) => {
                const theme = getSportTheme(act.sport);
                return (
                  <a
                    key={act.id}
                    href={act.detailHref}
                    onClick={(e) => e.stopPropagation()}
                    className="mb-0.5 flex w-full items-center gap-1 rounded border px-1 py-0.5 text-xs hover:opacity-80"
                    style={{ borderColor: theme.color, color: theme.color }}
                    title={act.name ?? undefined}
                  >
                    <span className="truncate">
                      ✓ {act.name ?? theme.label}
                    </span>
                    {act.tss != null && (
                      <span className="ml-auto shrink-0 opacity-70">{act.tss} TSS</span>
                    )}
                  </a>
                );
              })}

              {/* "Add" hint on hover (only when canCreate and cell is empty) */}
              {canCreate && planned.length === 0 && done.length === 0 && (
                <div className="mt-1 hidden text-center text-xs text-muted-foreground/40 group-hover:block">
                  + add
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary/20 ring-1 ring-primary/40" />
          Planned
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-current opacity-60" />
          Completed
        </span>
        {canCreate && <span>Click any day to plan a workout</span>}
      </div>

      {/* Modals */}
      {modal?.type === "create" && (
        <WorkoutFormModal
          athleteUserId={athleteUserId}
          defaultDate={modal.date}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "edit" && (
        <WorkoutFormModal
          athleteUserId={athleteUserId}
          defaultDate={modal.workout.scheduledDate}
          existing={modal.workout}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
