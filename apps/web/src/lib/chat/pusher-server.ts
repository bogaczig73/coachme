// Pusher server publisher. No-op if Pusher env vars aren't configured —
// the chat UI falls back to polling, so dev works without a Pusher account.

interface PusherCreds {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
}

let cached: { client: unknown; creds: PusherCreds } | null = null;

function getCreds(): PusherCreds | null {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) return null;
  return { appId, key, secret, cluster };
}

export function isPusherConfigured() {
  return !!getCreds();
}

async function getClient() {
  const creds = getCreds();
  if (!creds) return null;
  if (cached && cached.creds.appId === creds.appId) return cached.client;

  const { default: Pusher } = await import("pusher");
  const client = new Pusher({
    appId: creds.appId,
    key: creds.key,
    secret: creds.secret,
    cluster: creds.cluster,
    useTLS: true,
  });
  cached = { client, creds };
  return client;
}

export function channelForConversation(conversationId: string) {
  return `private-conversation-${conversationId}`;
}

export async function publishMessage(
  conversationId: string,
  event: string,
  payload: unknown,
) {
  const client = (await getClient()) as
    | { trigger: (ch: string, ev: string, data: unknown) => Promise<unknown> }
    | null;
  if (!client) return;
  try {
    await client.trigger(channelForConversation(conversationId), event, payload);
  } catch (err) {
    console.error("[pusher] publish failed", err);
  }
}

export async function authorizeChannel(
  socketId: string,
  channel: string,
  userId: string,
  userName: string | null,
) {
  const client = (await getClient()) as
    | {
        authorizeChannel: (
          socketId: string,
          channel: string,
          userData: { user_id: string; user_info: { name: string | null } },
        ) => { auth: string };
      }
    | null;
  if (!client) return null;
  return client.authorizeChannel(socketId, channel, {
    user_id: userId,
    user_info: { name: userName },
  });
}
