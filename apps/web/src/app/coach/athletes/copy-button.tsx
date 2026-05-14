"use client";

import { useState } from "react";

export function CopyButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
