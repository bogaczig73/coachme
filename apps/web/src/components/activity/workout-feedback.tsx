"use client";

import { useCallback, useRef, useState } from "react";

const FEELING_LABELS = ["", "Terrible", "Bad", "OK", "Good", "Great"] as const;
const FEELING_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"] as const;

function rpeColor(rpe: number): string {
  if (rpe <= 3) return "#22c55e";
  if (rpe <= 5) return "#84cc16";
  if (rpe <= 7) return "#eab308";
  if (rpe <= 8) return "#f97316";
  return "#ef4444";
}

interface WorkoutFeedbackProps {
  activityId: string;
  initialRpe: number | null;
  initialFeeling: number | null;
  initialNotes: string | null;
  readOnly?: boolean;
}

export function WorkoutFeedback({
  activityId,
  initialRpe,
  initialFeeling,
  initialNotes,
  readOnly = false,
}: WorkoutFeedbackProps) {
  const [rpe, setRpe] = useState<number | null>(initialRpe);
  const [feeling, setFeeling] = useState<number | null>(initialFeeling);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (patch: { rpe?: number | null; feeling?: number | null; athleteNotes?: string }) => {
      if (readOnly) return;
      setSaving(true);
      setSaved(false);
      try {
        await fetch(`/api/activities/${activityId}/feedback`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    },
    [activityId, readOnly],
  );

  function handleRpe(val: number) {
    const next = rpe === val ? null : val;
    setRpe(next);
    save({ rpe: next, feeling, athleteNotes: notes });
  }

  function handleFeeling(val: number) {
    const next = feeling === val ? null : val;
    setFeeling(next);
    save({ rpe, feeling: next, athleteNotes: notes });
  }

  function handleNotesChange(val: string) {
    setNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      save({ rpe, feeling, athleteNotes: val });
    }, 800);
  }

  if (readOnly) {
    const hasAny = rpe != null || feeling != null || notes;
    if (!hasAny) return null;
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Athlete feedback</h2>
        <div className="flex flex-wrap gap-6">
          {rpe != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">RPE</p>
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: rpeColor(rpe) }}
              >
                {rpe}
              </span>
            </div>
          )}
          {feeling != null && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Feeling</p>
              <span
                className="text-sm font-semibold"
                style={{ color: FEELING_COLORS[feeling] }}
              >
                {FEELING_LABELS[feeling]}
              </span>
            </div>
          )}
        </div>
        {notes && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{notes}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">How did it go?</h2>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
        {!saving && saved && <span className="text-xs text-green-500">Saved</span>}
      </div>

      {/* RPE */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Effort (RPE 1–10)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const active = rpe === n;
            const color = rpeColor(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => handleRpe(n)}
                className="h-8 w-8 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: active ? color : "transparent",
                  color: active ? "#fff" : color,
                  border: `2px solid ${color}`,
                  opacity: rpe != null && !active ? 0.4 : 1,
                }}
              >
                {n}
              </button>
            );
          })}
          {rpe != null && (
            <span className="ml-1 self-center text-xs text-muted-foreground">
              {rpe <= 3 ? "Easy" : rpe <= 5 ? "Moderate" : rpe <= 7 ? "Hard" : rpe <= 8 ? "Very hard" : "Maximum"}
            </span>
          )}
        </div>
      </div>

      {/* Feeling */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          How you felt
        </p>
        <div className="flex flex-wrap gap-2">
          {([1, 2, 3, 4, 5] as const).map((n) => {
            const active = feeling === n;
            const color = FEELING_COLORS[n];
            return (
              <button
                key={n}
                type="button"
                onClick={() => handleFeeling(n)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
                style={{
                  backgroundColor: active ? color : "transparent",
                  color: active ? "#fff" : color,
                  border: `2px solid ${color}`,
                  opacity: feeling != null && !active ? 0.4 : 1,
                }}
              >
                {FEELING_LABELS[n]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Notes
        </p>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="How was the workout? Any issues?"
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20 placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  );
}
