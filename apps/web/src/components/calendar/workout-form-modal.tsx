"use client";

import { useRef, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import { SPORT_THEMES } from "@/lib/sport";
import { createPlannedWorkout, updatePlannedWorkout, deletePlannedWorkout } from "@/lib/planned-workouts/actions";
import type { PlannedWorkout } from "@betri/db/schema";

interface Props {
  athleteUserId: string;
  defaultDate: string; // YYYY-MM-DD
  existing?: PlannedWorkout;
  onClose: () => void;
}

const SPORTS = Object.values(SPORT_THEMES).map((t) => ({ value: t.key, label: t.label }));

export function WorkoutFormModal({ athleteUserId, defaultDate, existing, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const durationRaw = data.get("durationMin") as string;
    const distanceRaw = data.get("distanceKm") as string;
    const tssRaw = data.get("targetTss") as string;

    startTransition(async () => {
      if (existing) {
        await updatePlannedWorkout({
          id: existing.id,
          scheduledDate: data.get("scheduledDate") as string,
          sport: data.get("sport") as string,
          name: data.get("name") as string,
          description: (data.get("description") as string) || null,
          targetDurationSec: durationRaw ? Math.round(parseFloat(durationRaw) * 60) : null,
          targetDistanceM: distanceRaw ? Math.round(parseFloat(distanceRaw) * 1000) : null,
          targetTss: tssRaw ? parseInt(tssRaw, 10) : null,
        });
      } else {
        await createPlannedWorkout({
          athleteUserId,
          scheduledDate: data.get("scheduledDate") as string,
          sport: data.get("sport") as string,
          name: data.get("name") as string,
          description: (data.get("description") as string) || undefined,
          targetDurationSec: durationRaw ? Math.round(parseFloat(durationRaw) * 60) : undefined,
          targetDistanceM: distanceRaw ? Math.round(parseFloat(distanceRaw) * 1000) : undefined,
          targetTss: tssRaw ? parseInt(tssRaw, 10) : undefined,
        });
      }
      onClose();
    });
  }

  function handleDelete() {
    if (!existing) return;
    startTransition(async () => {
      await deletePlannedWorkout(existing.id);
      onClose();
    });
  }

  const defaultDurationMin = existing?.targetDurationSec
    ? String(existing.targetDurationSec / 60)
    : "";
  const defaultDistanceKm = existing?.targetDistanceM
    ? String(existing.targetDistanceM / 1000)
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">{existing ? "Edit planned workout" : "Plan a workout"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Date</label>
              <input
                type="date"
                name="scheduledDate"
                required
                defaultValue={existing?.scheduledDate ?? defaultDate}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Sport</label>
              <select
                name="sport"
                required
                defaultValue={existing?.sport ?? "run"}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              >
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Easy run"
                defaultValue={existing?.name ?? ""}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Coach notes</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Zone 2, keep HR below 140…"
              defaultValue={existing?.description ?? ""}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Duration (min)</label>
              <input
                type="number"
                name="durationMin"
                min="1"
                step="1"
                placeholder="60"
                defaultValue={defaultDurationMin}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Distance (km)</label>
              <input
                type="number"
                name="distanceKm"
                min="0.1"
                step="0.1"
                placeholder="10"
                defaultValue={defaultDistanceKm}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Target TSS</label>
              <input
                type="number"
                name="targetTss"
                min="1"
                step="1"
                placeholder="80"
                defaultValue={existing?.targetTss ?? ""}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {existing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-40"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                {existing ? "Save" : "Add"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
