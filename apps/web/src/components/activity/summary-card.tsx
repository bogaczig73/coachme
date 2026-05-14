import { fmtDuration, fmtDistance, fmtSpeed, fmtPace } from "@/lib/format";
import type { Activity } from "@betri/db/schema";

const PACE_SPORTS = new Set(["running", "run", "walking", "walk", "hiking"]);

interface Stat {
  label: string;
  value: string;
  hint?: string;
}

export function SummaryCard({ activity }: { activity: Activity }) {
  const isPaceSport = activity.sport
    ? PACE_SPORTS.has(activity.sport.toLowerCase())
    : false;

  const stats: Stat[] = [
    { label: "Duration", value: fmtDuration(activity.durationSec) },
    { label: "Distance", value: fmtDistance(activity.distanceM) },
    {
      label: isPaceSport ? "Avg pace" : "Avg speed",
      value: isPaceSport
        ? fmtPace(activity.avgSpeedMps)
        : fmtSpeed(activity.avgSpeedMps),
    },
    {
      label: "Elevation",
      value: activity.elevationGainM != null ? `${activity.elevationGainM} m` : "—",
    },
    {
      label: "Avg HR",
      value: activity.avgHrBpm != null ? `${activity.avgHrBpm} bpm` : "—",
      hint: activity.maxHrBpm != null ? `max ${activity.maxHrBpm}` : undefined,
    },
    {
      label: "Avg power",
      value: activity.avgPowerW != null ? `${activity.avgPowerW} W` : "—",
      hint: activity.maxPowerW != null ? `max ${activity.maxPowerW}` : undefined,
    },
    {
      label: "NP",
      value:
        activity.normalizedPowerW != null ? `${activity.normalizedPowerW} W` : "—",
    },
    {
      label: "IF",
      value:
        activity.intensityFactor != null
          ? activity.intensityFactor.toFixed(2)
          : "—",
    },
    {
      label: "TSS",
      value: activity.tss != null ? String(activity.tss) : "—",
    },
    {
      label: "Calories",
      value: activity.caloriesKcal != null ? `${activity.caloriesKcal} kcal` : "—",
    },
  ];

  return (
    <div className="rounded-lg border border-border">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{s.value}</p>
            {s.hint && (
              <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
