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
    const theme = getSportTheme(linked.sport);
    const meta: string[] = [];
    if (linked.targetDistanceM) meta.push(fmtDistance(linked.targetDistanceM));
    if (linked.targetDurationSec) meta.push(fmtDuration(linked.targetDurationSec));
    if (linked.targetTss) meta.push(`${linked.targetTss} TSS`);

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
        <div
          className="rounded-lg px-3 py-2.5"
          style={{ backgroundColor: theme.bg }}
        >
          <p className="text-sm font-semibold" style={{ color: theme.color }}>
            {linked.name}
          </p>
          {linked.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {linked.description}
            </p>
          )}
          {meta.length > 0 && (
            <p className="mt-1 text-xs" style={{ color: theme.color, opacity: 0.75 }}>
              {meta.join(" · ")}
            </p>
          )}
        </div>
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
