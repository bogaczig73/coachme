"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Waves, Bike, Footprints, Dumbbell, Zap, Activity as ActivityIcon,
} from "lucide-react";
import { getSportTheme, type SportKey } from "@/lib/sport";
import { fmtDuration, fmtDistance, fmtPace, fmtSpeed } from "@/lib/format";
import type { Activity, PlannedWorkout } from "@betri/db/schema";
import { WorkoutFeedback } from "./workout-feedback";
import { PlannedWorkoutLinker } from "./planned-workout-linker";
import { NameEditor } from "./name-editor";
import { StreamChart } from "./stream-chart";
import { RouteMap } from "./route-map-loader";

const PACE_SPORTS = new Set([
  "running", "run", "walking", "walk", "hiking", "trail_running", "treadmill_running",
]);
const CYCLING_SPORTS = new Set([
  "bike", "cycling", "biking", "road_biking", "mountain_biking",
  "indoor_cycling", "gravel_cycling", "virtual_ride",
]);

const SPORT_ICONS: Record<SportKey, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  swim: Waves, bike: Bike, run: Footprints, strength: Dumbbell, brick: Zap, other: ActivityIcon,
};

export interface StreamData {
  timestampSec: number[] | null;
  powerW: (number | null)[] | null;
  hrBpm: (number | null)[] | null;
  cadenceRpm: (number | null)[] | null;
  speedMps: (number | null)[] | null;
  altitudeM: (number | null)[] | null;
  lat: (number | null)[] | null;
  lon: (number | null)[] | null;
}

export interface ActivityDetailViewProps {
  activity: Activity;
  /** Planned workout already linked to this activity, if any */
  linkedWorkout: PlannedWorkout | null;
  /** Same-day planned workouts for the link dropdown; pass [] for coach view */
  sameDayWorkouts: PlannedWorkout[];
  readOnly: boolean;
  canEditName: boolean;
  backHref: string;
  backLabel: string;
  streams: StreamData | null;
}

export function ActivityDetailView({
  activity,
  linkedWorkout: initialLinked,
  sameDayWorkouts,
  readOnly,
  canEditName,
  backHref,
  backLabel,
  streams,
}: ActivityDetailViewProps) {
  const [linked, setLinked] = useState<PlannedWorkout | null>(initialLinked);

  const theme = getSportTheme(activity.sport);
  const Icon = SPORT_ICONS[theme.key];
  const sportLabel = activity.sport
    ? activity.sport.charAt(0).toUpperCase() + activity.sport.slice(1).replace(/_/g, " ")
    : "Activity";
  const startedAt = activity.startedAt
    ? new Date(activity.startedAt)
    : new Date(activity.createdAt);

  const hasStreams = !!(streams?.timestampSec && streams.timestampSec.length > 0);
  const hasRoute = !!(streams?.lat && streams.lat.some((v) => v != null));

  const linkCandidates = sameDayWorkouts.filter(
    (pw) => pw.completedActivityId === null || pw.completedActivityId === activity.id,
  );

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
        ← {backLabel}
      </Link>

      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {canEditName ? (
            <NameEditor
              activityId={activity.id}
              initialName={activity.name ?? sportLabel}
            />
          ) : (
            <h1 className="text-2xl font-semibold">{activity.name ?? sportLabel}</h1>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: theme.bg, color: theme.color }}
            >
              <Icon className="h-3 w-3" />
              {theme.label}
            </span>
            <span className="text-sm text-muted-foreground">
              {startedAt.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
            </span>
          </div>
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

      {/* Two-column main content */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Left — Stats (3/5) */}
        <div className="lg:col-span-3">
          <StatsPanel activity={activity} linked={linked} />
        </div>

        {/* Right — Description + Feedback (2/5) */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Planned workout description */}
          {linked && (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div
                className="border-b border-border px-4 py-2.5"
                style={{ background: theme.bg }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: theme.color }}
                >
                  {linked.name}
                </p>
              </div>
              <div className="px-4 py-4 space-y-3">
                {linked.description ? (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {linked.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No description provided.</p>
                )}
                {/* Planned targets summary */}
                {(linked.targetDurationSec || linked.targetDistanceM || linked.targetTss) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-border text-xs text-muted-foreground">
                    {linked.targetDurationSec && (
                      <span>Target duration: <strong className="text-foreground">{fmtDuration(linked.targetDurationSec)}</strong></span>
                    )}
                    {linked.targetDistanceM && (
                      <span>Target distance: <strong className="text-foreground">{fmtDistance(linked.targetDistanceM)}</strong></span>
                    )}
                    {linked.targetTss && (
                      <span>Target TSS: <strong className="text-foreground">{linked.targetTss}</strong></span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feedback */}
          <WorkoutFeedback
            activityId={activity.id}
            initialRpe={activity.rpe}
            initialFeeling={activity.feeling}
            initialNotes={activity.athleteNotes}
            readOnly={readOnly}
          />

          {/* Link to planned workout (athlete only) */}
          {!readOnly && linkCandidates.length > 0 && (
            <PlannedWorkoutLinker
              activityId={activity.id}
              linkedWorkout={linked}
              candidates={linkCandidates}
              onLinked={setLinked}
            />
          )}
        </div>
      </div>

      {/* Streams — full width */}
      {hasStreams ? (
        <>
          <StreamChart
            timestampSec={streams!.timestampSec!}
            powerW={streams!.powerW}
            hrBpm={streams!.hrBpm}
            cadenceRpm={streams!.cadenceRpm}
            speedMps={streams!.speedMps}
            altitudeM={streams!.altitudeM}
          />
          {hasRoute && <RouteMap lat={streams!.lat!} lon={streams!.lon!} />}
        </>
      ) : activity.status === "ready" ? (
        <div className="rounded-lg border border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No stream data was recorded for this activity.
        </div>
      ) : (
        <div className="rounded-lg border border-border px-6 py-10 text-center text-sm text-muted-foreground">
          Waiting for the worker to parse this activity…
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats panel — planned/actual table when linked, stat grid otherwise
// ---------------------------------------------------------------------------

interface StatRow {
  label: string;
  planned?: string | null;
  actual: string;
  unit?: string;
  onlyActual?: boolean; // no planned equivalent for this metric
}

function StatsPanel({
  activity,
  linked,
}: {
  activity: Activity;
  linked: PlannedWorkout | null;
}) {
  const theme = getSportTheme(activity.sport);
  const Icon = SPORT_ICONS[theme.key];
  const cycling = CYCLING_SPORTS.has(activity.sport?.toLowerCase() ?? "");
  const pace = PACE_SPORTS.has(activity.sport?.toLowerCase() ?? "");

  const hasPlannedTargets =
    linked != null &&
    (linked.targetDurationSec != null ||
      linked.targetDistanceM != null ||
      linked.targetTss != null);

  const rows: StatRow[] = [];

  // Duration
  if (activity.durationSec != null || linked?.targetDurationSec != null) {
    rows.push({
      label: "Duration",
      planned: linked?.targetDurationSec != null ? fmtDuration(linked.targetDurationSec) : null,
      actual: fmtDuration(activity.durationSec),
    });
  }

  // Distance
  if (activity.distanceM != null || linked?.targetDistanceM != null) {
    rows.push({
      label: "Distance",
      planned: linked?.targetDistanceM != null ? fmtDistance(linked.targetDistanceM) : null,
      actual: fmtDistance(activity.distanceM),
    });
  }

  // Speed / Pace
  if (activity.avgSpeedMps != null) {
    if (pace) {
      rows.push({ label: "Avg Pace", actual: fmtPace(activity.avgSpeedMps), onlyActual: true });
    } else {
      rows.push({ label: "Avg Speed", actual: fmtSpeed(activity.avgSpeedMps), onlyActual: true });
    }
  }

  // Power (cycling)
  if (cycling) {
    if (activity.normalizedPowerW != null) {
      rows.push({ label: "Normalized Power", actual: `${activity.normalizedPowerW} W`, onlyActual: true });
    }
    if (activity.avgPowerW != null) {
      rows.push({ label: "Avg Power", actual: `${activity.avgPowerW} W`, onlyActual: true });
    }
    if (activity.maxPowerW != null) {
      rows.push({ label: "Max Power", actual: `${activity.maxPowerW} W`, onlyActual: true });
    }
    if (activity.intensityFactor != null) {
      rows.push({ label: "IF", actual: activity.intensityFactor.toFixed(2), onlyActual: true });
    }
  }

  // TSS
  if (activity.tss != null || linked?.targetTss != null) {
    rows.push({
      label: "TSS",
      planned: linked?.targetTss != null ? String(linked.targetTss) : null,
      actual: activity.tss != null ? String(activity.tss) : "—",
    });
  }

  // Heart Rate
  if (activity.avgHrBpm != null) {
    const maxPart = activity.maxHrBpm != null ? ` / ${activity.maxHrBpm} max` : "";
    rows.push({ label: "Heart Rate", actual: `${activity.avgHrBpm} avg${maxPart} bpm`, onlyActual: true });
  }

  // Cadence
  if (activity.avgCadenceRpm != null) {
    rows.push({ label: "Cadence", actual: `${activity.avgCadenceRpm} rpm`, onlyActual: true });
  }

  // Elevation
  if (activity.elevationGainM != null) {
    rows.push({ label: "Elevation Gain", actual: `${activity.elevationGainM} m`, onlyActual: true });
  }

  // Calories
  if (activity.caloriesKcal != null) {
    rows.push({ label: "Calories", actual: `${activity.caloriesKcal} kcal`, onlyActual: true });
  }

  if (rows.length === 0) return null;

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      style={{ borderLeft: `4px solid ${theme.color}` }}
    >
      {/* Sport header */}
      <div
        className="flex items-center gap-2 border-b border-border px-4 py-2.5"
        style={{ background: theme.bg }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: theme.color }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme.color }}>
          {theme.label}
        </span>
        {hasPlannedTargets && linked && (
          <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-wider">
            vs {linked.name}
          </span>
        )}
      </div>

      {hasPlannedTargets ? (
        /* Planned vs Actual table */
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" />
              <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Planned
              </th>
              <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actual
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const deviation = getDeviation(row);
              return (
                <tr key={row.label} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-sm text-muted-foreground/60">
                    {row.onlyActual ? "" : (row.planned ?? "—")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={`text-sm font-semibold ${deviation}`}>{row.actual}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        /* Stat grid */
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="bg-card p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {row.label}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums leading-tight">{row.actual}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getDeviation(row: StatRow): string {
  if (row.onlyActual || !row.planned || row.planned === "—" || row.actual === "—") return "";
  return "";
}
