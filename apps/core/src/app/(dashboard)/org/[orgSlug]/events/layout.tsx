import { EventsNav } from "./events-nav";

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-bold">Events</h1>
      <div className="flex gap-8">
        <aside className="w-48 shrink-0">
          <EventsNav />
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
