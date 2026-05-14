import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const homeHref = role === "coach" ? "/coach" : role === "athlete" ? "/athlete" : "/";

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-6">
          <Link href={homeHref} className="text-lg font-semibold">
            Betri
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={homeHref} className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/chat" className="text-muted-foreground hover:text-foreground">
              Chat
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {session?.user?.name}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <main className="pt-6">{children}</main>
    </div>
  );
}
