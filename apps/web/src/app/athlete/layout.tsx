import { AppHeader } from "@/components/app-header";

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <AppHeader />
      <main className="pt-8">{children}</main>
    </div>
  );
}
