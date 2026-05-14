"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createInvitation } from "@/lib/chat/actions";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await createInvitation(fd);
        setLink(result.url);
        setEmail("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create invite");
      }
    });
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="athlete@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 min-w-[220px] rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invite"}
        </Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {link && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm">
          <p className="text-green-800">
            Invite link ready. Send this to the athlete:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">
              {link}
            </code>
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-muted"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
