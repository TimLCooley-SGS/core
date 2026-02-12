import { DonationsNav } from "./donations-nav";

export default function DonationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Donations</h1>
      <div className="flex gap-8">
        <aside className="w-48 shrink-0">
          <DonationsNav />
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
