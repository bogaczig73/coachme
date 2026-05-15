"use client";

import { useEffect, useRef, useState } from "react";
import {
  Waves,
  Bike,
  Footprints,
  Dumbbell,
  Zap,
  Activity as ActivityIcon,
  Download,
  Check,
} from "lucide-react";
import { getSportTheme, type SportKey } from "@/lib/sport";
import { fmtDuration, fmtDistance, fmtPace } from "@/lib/format";
import { WorkoutFormModal } from "./workout-form-modal";
import type { PlannedWorkout } from "@betri/db/schema";

export interface CalendarActivity {
  id: string;
  name: string | null;
  sport: string | null;
  startedAt: string | null;
  durationSec: number | null;
  distanceM: number | null;
  avgPowerW: number | null;
  normalizedPowerW: number | null;
  avgHrBpm: number | null;
  avgSpeedMps: number | null;
  tss: number | null;
  detailHref: string;
}

interface Props {
  /** YYYY-MM-DD — Monday of the first week to render */
  startDate: string;
  /** YYYY-MM-DD — Sunday of the last week to render */
  endDate: string;
  /** YYYY-MM-DD — passed from server so client doesn't have to re-derive */
  todayStr: string;
  plannedWorkouts: PlannedWorkout[];
  activities: CalendarActivity[];
  athleteUserId: string;
  canCreate: boolean;
  icsHref: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const SPORT_ICONS: Record<SportKey, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
  strength: Dumbbell,
  brick: Zap,
  other: ActivityIcon,
};

// Sports that show pace instead of power
const RUNNING_SPORTS = new Set([
  "run", "running", "treadmill_running", "trail_running", "walking", "walk", "hiking",
]);
// Sports that show power
const CYCLING_SPORTS = new Set([
  "bike", "cycling", "biking", "road_biking", "mountain_biking",
  "indoor_cycling", "gravel_cycling", "virtual_ride",
]);

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function buildWeeks(startDate: string, endDate: string): Date[][] {
  const start = parseYMD(startDate);
  const end = parseYMD(endDate);
  const weeks: Date[][] = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function primaryMetrics(act: CalendarActivity): string[] {
  const parts: string[] = [];
  if (act.distanceM) parts.push(fmtDistance(act.distanceM));
  if (act.durationSec) parts.push(fmtDuration(act.durationSec));
  return parts;
}

function secondaryMetrics(act: CalendarActivity): string[] {
  const sport = act.sport?.toLowerCase() ?? "";
  const parts: string[] = [];
  if (CYCLING_SPORTS.has(sport)) {
    const pwr = act.normalizedPowerW ?? act.avgPowerW;
    if (pwr) parts.push(`${pwr} W`);
  } else if (RUNNING_SPORTS.has(sport)) {
    if (act.avgSpeedMps) parts.push(fmtPace(act.avgSpeedMps));
  }
  if (act.avgHrBpm) parts.push(`${act.avgHrBpm} bpm`);
  if (act.tss) parts.push(`${act.tss} TSS`);
  return parts;
}

export function CalendarGrid({
  startDate,
  endDate,
  todayStr,
  plannedWorkouts,
  activities,
  athleteUserId,
  canCreate,
  icsHref,
}: Props) {
  const [modal, setModal] = useState<
    | { type: "create"; date: string }
    | { type: "edit"; workout: PlannedWorkout }
    | null
  >(null);
  const todayRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    todayRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const weeks = buildWeeks(startDate, endDate);

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

  return (
    <div className="flex flex-col gap-3">
      {/* ICS export */}
      <div className="flex justify-end">
        <a
          href={icsHref}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          title="Export calendar (.ics)"
        >
          <Download className="h-3.5 w-3.5" />
          Export .ics
        </a>
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Sticky weekday header */}
        <div className="sticky top-0 z-10 grid grid-cols-7 border-b border-border bg-muted/90 backdrop-blur-sm">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((week, wi) => {
          const containsToday = week.some((d) => toYMD(d) === todayStr);
          return (
            <div
              key={wi}
              ref={containsToday ? todayRowRef : undefined}
              className="grid grid-cols-7 border-b border-border last:border-b-0"
            >
              {week.map((date) => {
                const dateStr = toYMD(date);
                const isToday = dateStr === todayStr;
                const isPast = dateStr < todayStr;
                const planned = plannedByDate.get(dateStr) ?? [];
                const done = activitiesByDate.get(dateStr) ?? [];
                const isFirstOfMonth = date.getDate() === 1;

                return (
                  <div
                    key={dateStr}
                    className={`group min-h-[140px] border-r border-border last:border-r-0 p-2 transition-colors ${
                      isToday
                        ? "bg-primary/5"
                        : isPast
                        ? "bg-muted/10"
                        : "bg-background"
                    } ${canCreate ? "hover:bg-muted/20 cursor-pointer" : ""}`}
                    onClick={() => canCreate && setModal({ type: "create", date: dateStr })}
                  >
                    {/* Day number row */}
                    <div className="mb-2 flex items-center gap-1">
                      {isFirstOfMonth && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {MONTH_NAMES[date.getMonth()]}
                        </span>
                      )}
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Planned workouts */}
                    {planned.map((pw) => {
                      const theme = getSportTheme(pw.sport);
                      const Icon = SPORT_ICONS[theme.key];
                      return (
                        <button
                          key={pw.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ type: "edit", workout: pw });
                          }}
                          className="mb-1.5 w-full rounded-md px-2 py-1.5 text-left transition-opacity hover:opacity-85"
                          style={{ backgroundColor: theme.bg }}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <Icon className="h-3 w-3 shrink-0" style={{ color: theme.color }} />
                            <span
                              className="truncate text-xs font-semibold leading-tight"
                              style={{ color: theme.color }}
                            >
                              {pw.name}
                            </span>
                          </div>
                          {pw.description && (
                            <p className="mb-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                              {pw.description}
                            </p>
                          )}
                          <div
                            className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[10px]"
                            style={{ color: theme.color, opacity: 0.75 }}
                          >
                            {pw.targetDistanceM != null && (
                              <span>{fmtDistance(pw.targetDistanceM)}</span>
                            )}
                            {pw.targetDurationSec != null && (
                              <span>{fmtDuration(pw.targetDurationSec)}</span>
                            )}
                            {pw.targetTss != null && <span>{pw.targetTss} TSS</span>}
                          </div>
                        </button>
                      );
                    })}

                    {/* Completed activities */}
                    {done.map((act) => {
                      const theme = getSportTheme(act.sport);
                      const Icon = SPORT_ICONS[theme.key];
                      const primary = primaryMetrics(act);
                      const secondary = secondaryMetrics(act);
                      return (
                        <a
                          key={act.id}
                          href={act.detailHref}
                          onClick={(e) => e.stopPropagation()}
                          className="mb-1.5 block w-full rounded-md border px-2 py-1.5 transition-opacity hover:opacity-85"
                          style={{
                            borderColor: theme.color + "50",
                            backgroundColor: theme.bg + "80",
                          }}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <Check className="h-3 w-3 shrink-0 text-green-500" />
                            <Icon className="h-3 w-3 shrink-0" style={{ color: theme.color }} />
                            <span
                              className="truncate text-xs font-semibold leading-tight"
                              style={{ color: theme.color }}
                            >
                              {act.name ?? theme.label}
                            </span>
                          </div>
                          {primary.length > 0 && (
                            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
                              {primary.map((p, i) => (
                                <span key={i}>{p}</span>
                              ))}
                            </div>
                          )}
                          {secondary.length > 0 && (
                            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground/80">
                              {secondary.map((s, i) => (
                                <span key={i}>{s}</span>
                              ))}
                            </div>
                          )}
                        </a>
                      );
                    })}

                    {/* Add hint */}
                    {canCreate && planned.length === 0 && done.length === 0 && (
                      <div className="mt-1 hidden text-center text-xs text-muted-foreground/30 group-hover:block">
                        + add
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
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
