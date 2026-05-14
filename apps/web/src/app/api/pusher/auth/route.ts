import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { assertConversationMember } from "@/lib/chat/queries";
import { authorizeChannel, isPusherConfigured } from "@/lib/chat/pusher-server";

export async function POST(req: Request) {
  if (!isPusherConfigured()) {
    return NextResponse.json({ error: "pusher not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");

  if (!channel.startsWith("private-conversation-")) {
    return NextResponse.json({ error: "bad channel" }, { status: 400 });
  }

  const conversationId = channel.slice("private-conversation-".length);

  try {
    await assertConversationMember(conversationId, session.user.id);
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const authPayload = await authorizeChannel(
    socketId,
    channel,
    session.user.id,
    session.user.name ?? null,
  );
  if (!authPayload) {
    return NextResponse.json({ error: "auth failed" }, { status: 500 });
  }

  return NextResponse.json(authPayload);
}
