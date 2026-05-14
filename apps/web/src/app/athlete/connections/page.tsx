import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { db } from "@betri/db/client";
import { garminConnections } from "@betri/db/schema";
import { isGarminConfigured } from "@/lib/garmin/oauth";
import { disconnectGarmin } from "./actions";

const errorMessages: Record<string, string> = {
  garmin_not_configured:
    "Garmin OAuth isn't configured on the server. Add GARMIN_CONSUMER_KEY and GARMIN_CONSUMER_SECRET.",
  garmin_request_token: "Couldn't get a request token from Garmin.",
  garmin_missing_params: "Garmin callback was missing oauth_token or oauth_verifier.",
  garmin_unknown_token: "Garmin returned an unknown token.",
  garmin_access_token: "Couldn't exchange the verifier for an access token.",
};

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const [garmin] = await db
    .select()
    .from(garminConnections)
    .where(eq(garminConnections.userId, userId))
    .limit(1);

  const configured = isGarminConfigured();
  const error = typeof sp.error === "string" ? sp.error : null;
  const connected = sp.connected === "garmin";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Connections</h1>
        <p className="text-sm text-muted-foreground">
          Link third-party services to auto-import activities.
        </p>
      </div>

      {connected && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800">
          Garmin connected. Activities will appear here as they sync.
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-800">
          {errorMessages[error] ?? error}
        </div>
      )}

      <div className="rounded-lg border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Garmin Connect</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Auto-import activities from Garmin watches and cycling computers.
            </p>
            {!configured && (
              <p className="mt-2 text-xs text-yellow-700">
                Pending: server admin needs to register the app at developer.garmin.com.
              </p>
            )}
            {garmin && (
              <p className="mt-2 text-xs text-muted-foreground">
                Connected on {new Date(garmin.connectedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="shrink-0">
            {garmin ? (
              <form action={disconnectGarmin}>
                <Button type="submit" variant="outline" size="sm">
                  Disconnect
                </Button>
              </form>
            ) : (
              <Button asChild size="sm" disabled={!configured}>
                <a href="/api/garmin/connect">Connect</a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
