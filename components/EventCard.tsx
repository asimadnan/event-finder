import { EventRecord } from "@/lib/types";
import { cn, formatEventDate, normaliseCategory } from "@/lib/utils";

const CATEGORY_GRADIENTS: Record<string, string> = {
  AI: "from-indigo-500 via-violet-500 to-purple-600",
  "Food & Drink": "from-pink-400 via-rose-500 to-orange-500",
  Music: "from-sky-400 via-cyan-400 to-teal-400",
  Startup: "from-emerald-400 via-teal-400 to-cyan-400",
  Wellness: "from-amber-300 via-orange-400 to-pink-400",
  General: "from-slate-400 via-slate-500 to-slate-700",
};

export function EventCard({
  event,
  metaMode = "full",
}: {
  event: EventRecord;
  metaMode?: "full" | "dateOnly";
}) {
  const category = normaliseCategory(event.category);
  const gradient = CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS.General;

  return (
    <article className="group overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-panel opacity-0 animate-rise">
      <div className={cn("relative h-[72px] overflow-hidden bg-gradient-to-br", gradient)}>
        <span className="absolute left-4 top-5 h-10 w-10 rounded-full bg-white/20 animate-drift" />
        <span className="absolute right-8 top-3 h-6 w-6 rounded-full bg-white/15 animate-drift" />
        <span className="absolute right-16 top-8 h-3 w-3 rounded-full bg-white/25 animate-drift" />
        <span className="absolute bottom-3 left-4 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {category}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div className="min-w-0 space-y-2">
          <h3 className="text-clamp-2 min-w-0 text-sm font-medium text-slate-900">{event.name}</h3>
          <p className="text-clamp-2 min-w-0 text-xs leading-5 text-slate-500">
            {event.description || "No description available."}
          </p>
        </div>

        {metaMode === "dateOnly" ? (
          <div className="space-y-1 text-xs text-slate-600">
            <p className="truncate">{formatEventDate(event.date, event.end_date, null)}</p>
          </div>
        ) : (
          <div className="space-y-1 text-xs text-slate-600">
            <p className="truncate">
              <span className="mr-1">📍</span>
              {event.venue || "Venue TBD"}
            </p>
            <p className="truncate">{formatEventDate(event.date, event.end_date, event.time)}</p>
            <p className="truncate">{event.suburb || "Location TBD"}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            event.is_free
              ? "bg-emerald-50 text-emerald-700"
              : event.fee
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600",
          )}
        >
          {event.is_free ? "Free" : event.fee || "Unknown"}
        </span>
        {event.url ? (
          <a
            href={event.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-slate-900 transition group-hover:text-slate-600"
          >
            View event →
          </a>
        ) : (
          <span className="text-xs text-slate-400">No link</span>
        )}
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/80 shadow-panel opacity-0 animate-rise">
      <div className="h-[72px] animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded-full bg-slate-200" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-slate-100" />
          <div className="h-3 w-5/6 rounded-full bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-2/3 rounded-full bg-slate-100" />
          <div className="h-3 w-1/2 rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
        <div className="h-6 w-16 rounded-full bg-slate-100" />
        <div className="h-4 w-20 rounded-full bg-slate-100" />
      </div>
    </article>
  );
}
