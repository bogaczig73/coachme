"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { Plus, Reply, SmilePlus, Send, X } from "lucide-react";
import {
  sendMessage,
  toggleReaction,
  markRead,
  fetchMessagesSince,
} from "@/lib/chat/actions";
import { WorkoutCard } from "./workout-card";
import { ActivityPicker } from "./activity-picker";

interface ChatActivity {
  id: string;
  name: string | null;
  sport: string | null;
  startedAt: string | null;
  durationSec: number | null;
  distanceM: number | null;
  tss: number | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string | null;
  replyToMessageId: string | null;
  activityId: string | null;
  createdAt: string;
  reactions: { emoji: string; userId: string }[];
  activity: ChatActivity | null;
  replyTo: {
    id: string;
    senderUserId: string;
    body: string | null;
    activityName: string | null;
  } | null;
}

interface Props {
  conversationId: string;
  currentUserId: string;
  otherUser: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  initialMessages: ChatMessage[];
  pickerActivities: ChatActivity[];
  pickerAthleteId: string;
  detailHrefBase: string; // "/athlete" or "/coach/athletes/{athleteId}"
  pusher: {
    enabled: boolean;
    key: string | null;
    cluster: string | null;
  };
}

const QUICK_REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "💪"];

export function ChatThread({
  conversationId,
  currentUserId,
  otherUser,
  initialMessages,
  pickerActivities,
  pickerAthleteId,
  detailHrefBase,
  pusher,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on initial render and when new messages arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Mark conversation read on mount and whenever messages change.
  useEffect(() => {
    void markRead(conversationId);
  }, [conversationId, messages.length]);

  // Pusher subscription (preferred) or polling fallback.
  const lastTsRef = useRef<string | null>(
    initialMessages[initialMessages.length - 1]?.createdAt ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    async function refresh() {
      const incoming = await fetchMessagesSince(conversationId, lastTsRef.current);
      if (cancelled || incoming.length === 0) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const m of incoming) {
          if (!ids.has(m.id)) {
            merged.push({
              ...m,
              createdAt:
                m.createdAt instanceof Date
                  ? m.createdAt.toISOString()
                  : String(m.createdAt),
              activity: m.activity
                ? {
                    ...m.activity,
                    startedAt:
                      m.activity.startedAt instanceof Date
                        ? m.activity.startedAt.toISOString()
                        : (m.activity.startedAt as string | null),
                  }
                : null,
            });
          }
        }
        lastTsRef.current = merged[merged.length - 1]!.createdAt;
        return merged;
      });
    }

    async function setup() {
      if (pusher.enabled && pusher.key && pusher.cluster) {
        const { default: PusherClient } = await import("pusher-js");
        const client = new PusherClient(pusher.key, {
          cluster: pusher.cluster,
          authEndpoint: "/api/pusher/auth",
        });
        const channel = client.subscribe(`private-conversation-${conversationId}`);
        channel.bind("message:new", () => void refresh());
        channel.bind("reaction:changed", () => void refresh());
        cleanup = () => {
          channel.unbind_all();
          client.unsubscribe(`private-conversation-${conversationId}`);
          client.disconnect();
        };
      } else {
        const id = setInterval(refresh, 4000);
        cleanup = () => clearInterval(id);
      }
    }

    void setup();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [conversationId, pusher]);

  function send(activityId?: string) {
    const body = draft.trim();
    if (!body && !activityId) return;
    const optimisticId = `tmp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId,
      conversationId,
      senderUserId: currentUserId,
      body: body || null,
      replyToMessageId: replyTo?.id ?? null,
      activityId: activityId ?? null,
      createdAt: new Date().toISOString(),
      reactions: [],
      activity: activityId
        ? pickerActivities.find((a) => a.id === activityId) ?? null
        : null,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            senderUserId: replyTo.senderUserId,
            body: replyTo.body,
            activityName: replyTo.activity?.name ?? null,
          }
        : null,
    };
    setMessages((prev) => [...prev, optimistic]);
    lastTsRef.current = optimistic.createdAt;
    setDraft("");
    setReplyTo(null);

    startTransition(async () => {
      try {
        const { id: realId, createdAt: realCreatedAt } = await sendMessage({
          conversationId,
          body: body || undefined,
          replyToMessageId: replyTo?.id,
          activityId,
        });
        setMessages((prev) => {
          // If a concurrent refresh already added the real message, just drop the optimistic.
          if (prev.some((m) => m.id === realId)) {
            return prev.filter((m) => m.id !== optimisticId);
          }
          return prev.map((m) =>
            m.id === optimisticId ? { ...m, id: realId, createdAt: realCreatedAt } : m,
          );
        });
        lastTsRef.current = realCreatedAt;
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        console.error(err);
      }
    });
  }

  function react(messageId: string, emoji: string) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const has = m.reactions.some(
          (r) => r.userId === currentUserId && r.emoji === emoji,
        );
        return {
          ...m,
          reactions: has
            ? m.reactions.filter(
                (r) => !(r.userId === currentUserId && r.emoji === emoji),
              )
            : [...m.reactions, { userId: currentUserId, emoji }],
        };
      }),
    );
    void toggleReaction(messageId, emoji);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    send();
  }

  const groupedReactions = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const msg of messages) {
      const inner = new Map<string, number>();
      for (const r of msg.reactions) {
        inner.set(r.emoji, (inner.get(r.emoji) ?? 0) + 1);
      }
      m.set(msg.id, inner);
    }
    return m;
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col rounded-lg border border-border">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        {otherUser.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={otherUser.image} alt="" className="h-9 w-9 rounded-full" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-muted" />
        )}
        <div>
          <p className="font-medium">{otherUser.name ?? otherUser.email}</p>
          <p className="text-xs text-muted-foreground">
            {pusher.enabled ? "real-time" : "polling every 4s"}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet. Say hello.
          </p>
        ) : (
          messages.map((msg) => {
            const mine = msg.senderUserId === currentUserId;
            const rxs = groupedReactions.get(msg.id);
            return (
              <div
                key={msg.id}
                className={`group flex gap-2 ${mine ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[80%] flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                  {msg.replyTo && (
                    <div className="rounded-md border-l-2 border-foreground/30 bg-background px-2 py-1 text-xs text-muted-foreground">
                      <p className="truncate">
                        {msg.replyTo.activityName
                          ? `↳ Workout: ${msg.replyTo.activityName}`
                          : `↳ ${msg.replyTo.body ?? "..."}`}
                      </p>
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 shadow-sm ${
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                    } ${msg.activity ? "min-w-[220px]" : ""}`}
                  >
                    {msg.activity && (
                      <div className="mb-1">
                        <WorkoutCard
                          activity={{
                            ...msg.activity,
                            startedAt: msg.activity.startedAt
                              ? new Date(msg.activity.startedAt)
                              : null,
                          }}
                          detailHref={`${detailHrefBase}/activities/${msg.activity.id}`}
                          compact
                        />
                      </div>
                    )}
                    {msg.body && (
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {msg.body}
                      </p>
                    )}
                  </div>

                  <div className={`flex items-center gap-1 text-xs ${mine ? "flex-row-reverse" : ""}`}>
                    <span className="text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <ReactionPicker
                      onPick={(e) => react(msg.id, e)}
                      onReply={() => setReplyTo(msg)}
                    />
                    {rxs && rxs.size > 0 && (
                      <div className="flex items-center gap-1">
                        {Array.from(rxs.entries()).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => react(msg.id, emoji)}
                            className="rounded-full border border-border bg-background px-1.5 py-0.5 hover:bg-muted"
                          >
                            {emoji} {count > 1 ? count : ""}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {replyTo && (
        <div className="flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-2 text-xs">
          <Reply className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="flex-1 truncate text-muted-foreground">
            Replying to{" "}
            <span className="font-medium text-foreground">
              {replyTo.activity?.name ?? replyTo.body ?? "..."}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="rounded p-0.5 hover:bg-background"
            aria-label="Cancel reply"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 border-t border-border px-4 py-3"
      >
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
          aria-label="Attach workout"
        >
          <Plus className="h-4 w-4" />
        </button>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
        <button
          type="submit"
          disabled={pending || (!draft.trim() && true)}
          className="rounded-lg bg-primary p-2 text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {pickerOpen && (
        <ActivityPicker
          activities={pickerActivities}
          athleteId={pickerAthleteId}
          onClose={() => setPickerOpen(false)}
          onPick={(activityId) => {
            setPickerOpen(false);
            send(activityId);
          }}
        />
      )}
    </div>
  );
}

function ReactionPicker({
  onPick,
  onReply,
}: {
  onPick: (emoji: string) => void;
  onReply: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
        aria-label="React"
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onReply}
        className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
        aria-label="Reply"
      >
        <Reply className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-6 left-0 z-10 flex gap-1 rounded-full border border-border bg-background p-1 shadow-md">
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="rounded-full px-1.5 py-0.5 text-base hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
