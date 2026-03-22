import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import { EventGrid } from "@/components/EventGrid";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { EventRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EventsPageProps = {
  searchParams?: {
    category?: string;
  };
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  noStore();

  const activeCategory = searchParams?.category ?? "All";

  const supabase = getSupabaseAdminClient();
  const query = supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (activeCategory !== "All") {
    query.eq("category", activeCategory);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const events = ((data ?? []) as EventRecord[]).sort((left, right) => {
    const leftDate = left.date ? dayjs(left.date).valueOf() : Number.MAX_SAFE_INTEGER;
    const rightDate = right.date ? dayjs(right.date).valueOf() : Number.MAX_SAFE_INTEGER;

    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }

    const leftCreated = left.created_at ? dayjs(left.created_at).valueOf() : 0;
    const rightCreated = right.created_at ? dayjs(right.created_at).valueOf() : 0;
    return rightCreated - leftCreated;
  });
  const categories = ["All", ...new Set(events.map((event) => event.category).filter(Boolean) as string[])];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 md:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-900">
            ← Back home
          </Link>
          <h1 className="mt-2 font-display text-4xl text-slate-950">All stored events</h1>
          <p className="mt-2 text-sm text-slate-500">Latest 200 items from Supabase.</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {categories.map((category) => (
          <Link
            key={category}
            href={category === "All" ? "/events" : `/events?category=${encodeURIComponent(category)}`}
            className={`rounded-full px-4 py-2 text-sm transition ${
              category === activeCategory
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white/70 text-slate-700"
            }`}
          >
            {category}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <EventGrid events={events} metaMode="dateOnly" />
      </div>
    </main>
  );
}
