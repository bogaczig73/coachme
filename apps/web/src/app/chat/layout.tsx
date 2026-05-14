import { AppHeader } from "@/components/app-header";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <AppHeader />
      <main className="pt-6">{children}</main>
    </div>
  );
}
