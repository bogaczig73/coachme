"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { renameActivity } from "@/app/athlete/activities/[id]/actions";

export function NameEditor({
  activityId,
  initialName,
}: {
  activityId: string;
  initialName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialName);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!value.trim() || value === initialName) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await renameActivity(activityId, value);
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="group flex items-center gap-2">
        <h1 className="text-2xl font-semibold">{value || "Activity"}</h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
          aria-label="Rename activity"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(initialName);
            setEditing(false);
          }
        }}
        disabled={pending}
        className="rounded-md border border-border bg-background px-2 py-1 text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded p-1 hover:bg-muted"
        aria-label="Save"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => {
          setValue(initialName);
          setEditing(false);
        }}
        disabled={pending}
        className="rounded p-1 hover:bg-muted"
        aria-label="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
