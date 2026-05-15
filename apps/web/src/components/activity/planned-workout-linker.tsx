"use client";

import { useState, useTransition } from "react";
import { Link2, Unlink, ChevronDown } from "lucide-react";
import type { PlannedWorkout } from "@betri/db/schema";
import { getSportTheme } from "@/lib/sport";
import { fmtDuration, fmtDistance } from "@/lib/format";

interface Props {
  activityId: string;
  linkedWorkout: PlannedWorkout | null;
  candidates: PlannedWorkout[];
  onLinked?: (workout: PlannedWorkout | null) => void;
}

const STEP_TYPE_LABELS: Record<string, string> = {
  warmup: "Warm Up",
  active: "Active",
  cooldown: "Cool Down",
  rest: "Rest",
};

function WorkoutDetail({ workout }: { workout: PlannedWorkout }) {
  const theme = getSportTheme(workout.sport);
  const meta: string[] = [];
  if (workout.targetDistanceM) meta.push(fmtDistance(workout.targetDistanceM));
  if (workout.targetDurationSec) meta.push(fmtDuration(workout.targetDurationSec));
  if (workout.targetTss) meta.push(`${workout.targetTss} TSS`);
  if (workout.targetIntensityFactor) meta.push(`IF ${workout.targetIntensityFactor.toFixed(2)}`);
  if (workout.targetAvgPowerW) meta.push(`~${workout.targetAvgPowerW} W`);
  if (workout.targetAvgHrBpm) meta.push(`~${workout.targetAvgHrBpm} bpm`);
  if (workout.targetCaloriesKcal) meta.push(`${workout.targetCaloriesKcal} kcal`);
  if (workout.targetElevationGainM) meta.push(`↑${workout.targetElevationGainM} m`);

  return (
    <div className="space-y-3">
      <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: theme.bg }}>
        <p className="text-sm font-semibold" style={{ color: theme.color }}>
          {workout.name}
        </p>
        {meta.length > 0 && (
          <p className="mt-1 text-xs" style={{ color: theme.color, opacity: 0.75 }}>
            {meta.join(" · ")}
          </p>
        )}
      </div>

      {workout.workoutSteps && workout.workoutSteps.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Workout Structure
          </p>
          <ol className="space-y-1.5">
            {workout.workoutSteps.map((step, i) => {
              const powerParts: string[] = [];
              if (step.powerMinW && step.powerMaxW)
                powerParts.push(`${step.powerMinW}–${step.powerMaxW} W`);
              else if (step.powerMinW) powerParts.push(`${step.powerMinW}+ W`);
              if (step.cadenceMinRpm && step.cadenceMaxRpm)
                powerParts.push(`${step.cadenceMinRpm}–${step.cadenceMaxRpm} rpm`);
              if (step.zone) powerParts.push(step.zone);

              return (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-medium">
                      {step.name || STEP_TYPE_LABELS[step.type] || step.type}
                    </span>
                    <span className="ml-1.5 text-muted-foreground">
                      {step.durationMin} min
                      {powerParts.length > 0 && ` @ ${powerParts.join(", ")}`}
                    </span>
                    {step.notes && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{step.notes}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {workout.preActivityComments && (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Motivation
          </p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {workout.preActivityComments}
          </p>
        </div>
      )}

      {workout.description && (
        <div>
          <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Coach notes
          </p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{workout.description}</p>
        </div>
      )}
    </div>
  );
}

export function PlannedWorkoutLinker({
  activityId,
  linkedWorkout,
  candidates,
  onLinked,
}: Props) {
  const [linked, setLinked] = useState<PlannedWorkout | null>(linkedWorkout);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function link(pw: PlannedWorkout) {
    startTransition(async () => {
      await fetch(`/api/planned-workouts/${pw.id}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId }),
      });
      setLinked(pw);
      setOpen(false);
      onLinked?.(pw);
    });
  }

  function unlink() {
    if (!linked) return;
    startTransition(async () => {
      await fetch(`/api/planned-workouts/${linked.id}/link`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: null }),
      });
      setLinked(null);
      onLinked?.(null);
    });
  }

  if (linked) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Planned workout</h2>
          <button
            type="button"
            onClick={unlink}
            disabled={pending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Unlink className="h-3.5 w-3.5" />
            Unlink
          </button>
        </div>
        <WorkoutDetail workout={linked} />
      </div>
    );
  }

  if (candidates.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Planned workout</h2>
        <span className="text-xs text-muted-foreground">Not linked</span>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={pending}
          className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            Link to a planned workout
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            {candidates.map((pw) => {
              const theme = getSportTheme(pw.sport);
              const meta: string[] = [];
              if (pw.targetDistanceM) meta.push(fmtDistance(pw.targetDistanceM));
              if (pw.targetDurationSec) meta.push(fmtDuration(pw.targetDurationSec));
              if (pw.targetTss) meta.push(`${pw.targetTss} TSS`);
              return (
                <button
                  key={pw.id}
                  type="button"
                  onClick={() => link(pw)}
                  className="flex w-full flex-col items-start px-3 py-2.5 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                >
                  <span className="text-sm font-medium" style={{ color: theme.color }}>
                    {pw.name}
                  </span>
                  {meta.length > 0 && (
                    <span className="text-xs text-muted-foreground">{meta.join(" · ")}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
