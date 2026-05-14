import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AthleteHome() {
  const session = await auth();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Athlete dashboard</p>
          <h1 className="text-2xl font-semibold">
            Hi, {session?.user?.name ?? "athlete"}
          </h1>
        </div>
        <SignOutButton />
      </header>

      <section className="mt-10 rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold">Phase 1 — coming next</h2>
        <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground">
          <li>Connect Garmin account</li>
          <li>Upload FIT file</li>
          <li>View activities</li>
        </ul>
      </section>
    </main>
  );
}
