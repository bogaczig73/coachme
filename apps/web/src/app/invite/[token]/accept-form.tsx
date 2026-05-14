"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/lib/chat/actions";

export function AcceptForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await acceptInvitation(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not accept invite");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button onClick={submit} disabled={pending} className="w-full">
        {pending ? "Accepting…" : "Accept and open chat"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
