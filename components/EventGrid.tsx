import { EventRecord } from "@/lib/types";
import { EventCard, EventCardSkeleton } from "@/components/EventCard";

export function EventGrid({
  events,
  metaMode = "full",
  loadingCount = 0,
}: {
  events: EventRecord[];
  metaMode?: "full" | "dateOnly";
  loadingCount?: number;
}) {
  if (!events.length && loadingCount === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500">
        No events yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.id ?? event.url ?? `${event.name}-${event.date ?? "unknown"}`}
          event={event}
          metaMode={metaMode}
        />
      ))}
      {Array.from({ length: loadingCount }).map((_, index) => (
        <EventCardSkeleton key={`skeleton-${index}`} />
      ))}
    </div>
  );
}
