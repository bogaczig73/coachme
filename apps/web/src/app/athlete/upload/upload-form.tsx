"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { uploadFit } from "./actions";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Choose a .fit file");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setError(null);
    startTransition(async () => {
      const res = await uploadFit(fd);
      if (res && "error" in res) setError(res.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label
        htmlFor="fit-file"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-sm transition-colors ${
          dragOver
            ? "border-foreground bg-muted"
            : "border-border hover:bg-muted"
        }`}
      >
        <p className="font-medium">
          {file ? file.name : "Drop a .fit file here, or click to choose"}
        </p>
        {file ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">10 MB max</p>
        )}
        <input
          id="fit-file"
          type="file"
          accept=".fit"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!file || pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
        {file && (
          <button
            type="button"
            onClick={() => setFile(null)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
