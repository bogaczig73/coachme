import Link from "next/link";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

/** Single shared app header used by /athlete, /coach, and /chat layouts. */
export async function AppHeader() {
  const session = await auth();
  const role = session?.user?.role;
  const homeHref = role === "coach" ? "/coach" : role === "athlete" ? "/athlete" : "/";

  return (
    <header className="flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-center gap-6">
        <Link href={homeHref} className="text-lg font-semibold">
          Betri
        </Link>
        {role && <AppNav role={role} />}
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {session?.user?.name}
        </span>
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
