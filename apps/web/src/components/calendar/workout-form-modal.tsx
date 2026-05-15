"use client";

import { useRef, useTransition, useState, type FormEvent } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { SPORT_THEMES } from "@/lib/sport";
import { createPlannedWorkout, updatePlannedWorkout, deletePlannedWorkout } from "@/lib/planned-workouts/actions";
import type { PlannedWorkout, WorkoutStep } from "@betri/db/schema";

interface Props {
  athleteUserId: string;
  defaultDate: string; // YYYY-MM-DD
  existing?: PlannedWorkout;
  onClose: () => void;
}

const SPORTS = Object.values(SPORT_THEMES).map((t) => ({ value: t.key, label: t.label }));

const STEP_TYPES: { value: WorkoutStep["type"]; label: string }[] = [
  { value: "warmup", label: "Warm Up" },
  { value: "active", label: "Active / Interval" },
  { value: "cooldown", label: "Cool Down" },
  { value: "rest", label: "Rest" },
];

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20";

const LABEL_CLASS = "mb-1 block text-sm font-medium";

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-md px-1 py-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
    >
      {title}
      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}

export function WorkoutFormModal({ athleteUserId, defaultDate, existing, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [steps, setSteps] = useState<WorkoutStep[]>(
    existing?.workoutSteps ?? [],
  );
  const [showTargets, setShowTargets] = useState(true);
  const [showSteps, setShowSteps] = useState((existing?.workoutSteps?.length ?? 0) > 0);
  const [showNotes, setShowNotes] = useState(
    !!(existing?.description || existing?.preActivityComments),
  );

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { type: "active", name: "", durationMin: 20 },
    ]);
    setShowSteps(true);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStep<K extends keyof WorkoutStep>(i: number, key: K, value: WorkoutStep[K]) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    const num = (key: string) => {
      const v = data.get(key) as string;
      return v ? Number(v) : undefined;
    };
    const numOrNull = (key: string) => {
      const v = data.get(key) as string;
      return v ? Number(v) : null;
    };

    const cleanedSteps = steps.filter((s) => s.name.trim() || s.durationMin > 0);

    startTransition(async () => {
      if (existing) {
        await updatePlannedWorkout({
          id: existing.id,
          scheduledDate: data.get("scheduledDate") as string,
          sport: data.get("sport") as string,
          name: data.get("name") as string,
          description: (data.get("description") as string) || null,
          preActivityComments: (data.get("preActivityComments") as string) || null,
          targetDurationSec: numOrNull("durationMin") !== null ? Math.round(numOrNull("durationMin")! * 60) : null,
          targetDistanceM: numOrNull("distanceKm") !== null ? Math.round(numOrNull("distanceKm")! * 1000) : null,
          targetTss: numOrNull("targetTss"),
          targetCaloriesKcal: numOrNull("targetCaloriesKcal"),
          targetElevationGainM: numOrNull("targetElevationGainM"),
          targetAvgPowerW: numOrNull("targetAvgPowerW"),
          targetAvgHrBpm: numOrNull("targetAvgHrBpm"),
          targetIntensityFactor: numOrNull("targetIntensityFactor"),
          workoutSteps: cleanedSteps.length > 0 ? cleanedSteps : null,
        });
      } else {
        const durationMin = num("durationMin");
        const distanceKm = num("distanceKm");
        await createPlannedWorkout({
          athleteUserId,
          scheduledDate: data.get("scheduledDate") as string,
          sport: data.get("sport") as string,
          name: data.get("name") as string,
          description: (data.get("description") as string) || undefined,
          preActivityComments: (data.get("preActivityComments") as string) || undefined,
          targetDurationSec: durationMin ? Math.round(durationMin * 60) : undefined,
          targetDistanceM: distanceKm ? Math.round(distanceKm * 1000) : undefined,
          targetTss: num("targetTss"),
          targetCaloriesKcal: num("targetCaloriesKcal"),
          targetElevationGainM: num("targetElevationGainM"),
          targetAvgPowerW: num("targetAvgPowerW"),
          targetAvgHrBpm: num("targetAvgHrBpm"),
          targetIntensityFactor: num("targetIntensityFactor"),
          workoutSteps: cleanedSteps.length > 0 ? cleanedSteps : undefined,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-xl">
        {/* Header */}
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

        <form ref={formRef} onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
          {/* ── Basic Info ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLASS}>Date</label>
              <input
                type="date"
                name="scheduledDate"
                required
                defaultValue={existing?.scheduledDate ?? defaultDate}
                className={INPUT_CLASS}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL_CLASS}>Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Zone 2 Endurance Ride"
                defaultValue={existing?.name ?? ""}
                className={INPUT_CLASS}
              />
            </div>
            <div className="col-span-2">
              <label className={LABEL_CLASS}>Sport</label>
              <select
                name="sport"
                required
                defaultValue={existing?.sport ?? "ride"}
                className={INPUT_CLASS}
              >
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            {/* ── Target Metrics ──────────────────────────────────── */}
            <SectionHeader
              title="Target Metrics"
              open={showTargets}
              onToggle={() => setShowTargets((v) => !v)}
            />
            {showTargets && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <label className={LABEL_CLASS}>Duration (min)</label>
                  <input
                    type="number"
                    name="durationMin"
                    min="1"
                    step="1"
                    placeholder="90"
                    defaultValue={defaultDurationMin}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Distance (km)</label>
                  <input
                    type="number"
                    name="distanceKm"
                    min="0.1"
                    step="0.1"
                    placeholder="40"
                    defaultValue={defaultDistanceKm}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>TSS</label>
                  <input
                    type="number"
                    name="targetTss"
                    min="1"
                    step="1"
                    placeholder="80"
                    defaultValue={existing?.targetTss ?? ""}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>IF (Intensity Factor)</label>
                  <input
                    type="number"
                    name="targetIntensityFactor"
                    min="0"
                    max="2"
                    step="0.01"
                    placeholder="0.75"
                    defaultValue={existing?.targetIntensityFactor ?? ""}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Avg Power (W)</label>
                  <input
                    type="number"
                    name="targetAvgPowerW"
                    min="1"
                    step="1"
                    placeholder="180"
                    defaultValue={existing?.targetAvgPowerW ?? ""}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Avg HR (bpm)</label>
                  <input
                    type="number"
                    name="targetAvgHrBpm"
                    min="1"
                    step="1"
                    placeholder="140"
                    defaultValue={existing?.targetAvgHrBpm ?? ""}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Calories (kcal)</label>
                  <input
                    type="number"
                    name="targetCaloriesKcal"
                    min="1"
                    step="1"
                    placeholder="600"
                    defaultValue={existing?.targetCaloriesKcal ?? ""}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Elevation Gain (m)</label>
                  <input
                    type="number"
                    name="targetElevationGainM"
                    min="0"
                    step="1"
                    placeholder="500"
                    defaultValue={existing?.targetElevationGainM ?? ""}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Workout Steps ──────────────────────────────────────── */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <SectionHeader
                title={`Workout Structure${steps.length > 0 ? ` (${steps.length} steps)` : ""}`}
                open={showSteps}
                onToggle={() => setShowSteps((v) => !v)}
              />
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
              >
                <Plus className="h-3 w-3" />
                Add step
              </button>
            </div>

            {showSteps && steps.length > 0 && (
              <div className="mt-3 space-y-3">
                {steps.map((step, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <select
                        value={step.type}
                        onChange={(e) => updateStep(i, "type", e.target.value as WorkoutStep["type"])}
                        className="rounded border border-border bg-background px-2 py-1 text-xs"
                      >
                        {STEP_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeStep(i)}
                        className="ml-auto rounded p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Step name
                        </label>
                        <input
                          type="text"
                          value={step.name}
                          onChange={(e) => updateStep(i, "name", e.target.value)}
                          placeholder="e.g. Endurance block"
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Duration (min)
                        </label>
                        <input
                          type="number"
                          value={step.durationMin || ""}
                          onChange={(e) => updateStep(i, "durationMin", Number(e.target.value))}
                          min="1"
                          step="1"
                          placeholder="20"
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Zone
                        </label>
                        <input
                          type="text"
                          value={step.zone ?? ""}
                          onChange={(e) => updateStep(i, "zone", e.target.value || undefined)}
                          placeholder="Zone 2"
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Power min (W)
                        </label>
                        <input
                          type="number"
                          value={step.powerMinW ?? ""}
                          onChange={(e) => updateStep(i, "powerMinW", e.target.value ? Number(e.target.value) : undefined)}
                          min="0"
                          step="1"
                          placeholder="123"
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Power max (W)
                        </label>
                        <input
                          type="number"
                          value={step.powerMaxW ?? ""}
                          onChange={(e) => updateStep(i, "powerMaxW", e.target.value ? Number(e.target.value) : undefined)}
                          min="0"
                          step="1"
                          placeholder="165"
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Cadence min (rpm)
                        </label>
                        <input
                          type="number"
                          value={step.cadenceMinRpm ?? ""}
                          onChange={(e) => updateStep(i, "cadenceMinRpm", e.target.value ? Number(e.target.value) : undefined)}
                          min="0"
                          step="1"
                          placeholder="85"
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Cadence max (rpm)
                        </label>
                        <input
                          type="number"
                          value={step.cadenceMaxRpm ?? ""}
                          onChange={(e) => updateStep(i, "cadenceMaxRpm", e.target.value ? Number(e.target.value) : undefined)}
                          min="0"
                          step="1"
                          placeholder="95"
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                        />
                      </div>
                    </div>

                    <div className="mt-2">
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Step notes
                      </label>
                      <input
                        type="text"
                        value={step.notes ?? ""}
                        onChange={(e) => updateStep(i, "notes", e.target.value || undefined)}
                        placeholder="Keep cadence high, stay seated…"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showSteps && steps.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                No steps yet — click "Add step" to build the workout structure.
              </p>
            )}
          </div>

          {/* ── Notes ─────────────────────────────────────────────── */}
          <div className="border-t border-border pt-4">
            <SectionHeader
              title="Notes"
              open={showNotes}
              onToggle={() => setShowNotes((v) => !v)}
            />
            {showNotes && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className={LABEL_CLASS}>Coach notes / Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Zone 2, keep HR below 140, smooth pedalling…"
                    defaultValue={existing?.description ?? ""}
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Pre-activity motivation</label>
                  <textarea
                    name="preActivityComments"
                    rows={3}
                    placeholder="Today's goal is to build your aerobic base…"
                    defaultValue={existing?.preActivityComments ?? ""}
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between border-t border-border pt-4">
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
