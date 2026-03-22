"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EventGrid } from "@/components/EventGrid";
import { StreamLog } from "@/components/StreamLog";
import { EventRecord, SearchQuery, StreamEvent, StreamLogItem } from "@/lib/types";

const playfulPendingMessages = [
  "Booting search pipeline...",
  "Cooking the event stew...",
  "Adding spices to the search pot...",
  "Sharpening the venue radar...",
  "Whisking together event keywords...",
  "Letting the source soup simmer...",
  "Polishing the find-everything goggles...",
  "Sending tiny scouts into the internet...",
  "Checking which event pans are already hot...",
  "Plating up likely sources...",
  "Marinating the query set...",
  "Tuning the signal antenna...",
  "Dusting the crumbs off hidden event pages...",
  "Stirring the calendar cauldron...",
  "Rolling dice for the best rabbit holes...",
  "Lighting the discovery campfire...",
  "Pulling fresh leads out of the pantry...",
  "Asking the event goblins nicely...",
  "Arranging the search orchestra...",
  "Loading the confetti cannons responsibly...",
  "Knocking on the internet's side door...",
  "Sorting the good breadcrumbs from the weird ones...",
  "Preheating the recommendation oven...",
  "Folding in a pinch of local knowledge...",
  "Setting the detective ducks in a row...",
];

export function ResultsClient() {
  const params = useSearchParams();
  const topic = params.get("topic") ?? "";
  const location = params.get("location") ?? "Sydney, Australia";
  const months = params.get("months") ?? "1";
  const sessionId = params.get("session") ?? "";

  const [queries, setQueries] = useState<SearchQuery[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [logs, setLogs] = useState<StreamLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSearchFinished, setSavedSearchFinished] = useState(false);
  const lastRealLogAtRef = useRef(Date.now());
  const fillerIndexRef = useRef(Math.floor(Math.random() * playfulPendingMessages.length));
  const doneRef = useRef(false);
  const seenKeysRef = useRef(new Set<string>());

  const summary = useMemo(() => `${topic || "General"} in ${location}`, [location, topic]);

  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  useEffect(() => {
    if (!topic || !sessionId) {
      setError("Missing search parameters. Start from the home page.");
      setLoading(false);
      return;
    }

    setQueries([]);
    setEvents([]);
    setLogs([]);
    setLoading(true);
    setDone(false);
    setError(null);
    setSavedSearchFinished(false);

    let cancelled = false;
    let eventSource: EventSource | null = null;
    let savedQueueInterval: number | null = null;
    lastRealLogAtRef.current = Date.now();
    seenKeysRef.current = new Set();

    const fillerInterval = window.setInterval(() => {
      if (cancelled || doneRef.current) {
        return;
      }

      if (Date.now() - lastRealLogAtRef.current < 2600) {
        return;
      }

      fillerIndexRef.current = (fillerIndexRef.current + 1) % playfulPendingMessages.length;
      setLogs((current) => [
        ...current,
        {
          message: playfulPendingMessages[fillerIndexRef.current],
          status: "searching",
        },
      ]);
      lastRealLogAtRef.current = Date.now();
    }, 2400);

    async function run() {
      try {
        setLogs([
          {
            message: `Starting search for ${topic} events in ${location} in the next ${months} month(s)...`,
            status: "searching",
          },
          {
            message: `Looking for sources to find ${topic} events...`,
            status: "searching",
          },
          {
            message: "Generating search queries for all sources...",
            status: "searching",
          },
          {
            message: `Searching saved events in our database for ${topic}...`,
            status: "searching",
          },
        ]);
        const generateQueriesPromise = fetch("/api/generate-queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, location, months }),
        });
        const savedSearchPromise = fetch(
          `/api/search-saved-events?${new URLSearchParams({ topic, location, months }).toString()}`,
        );

        const [response, savedSearchResponse] = await Promise.all([
          generateQueriesPromise,
          savedSearchPromise,
        ]);

        if (!response.ok) {
          throw new Error("Failed to generate search queries.");
        }

        if (!savedSearchResponse.ok) {
          throw new Error("Failed to search saved events.");
        }

        const savedSearchData = (await savedSearchResponse.json()) as { events: EventRecord[] };
        lastRealLogAtRef.current = Date.now();
        setLogs((current) => [
          ...current,
          {
            message: `Found ${savedSearchData.events.length} saved event matches in our database.`,
            status: "found",
          },
        ]);

        if (savedSearchData.events.length === 0) {
          setSavedSearchFinished(true);
        } else {
          let savedIndex = 0;
          savedQueueInterval = window.setInterval(() => {
            if (cancelled || savedIndex >= savedSearchData.events.length) {
              if (savedQueueInterval) {
                window.clearInterval(savedQueueInterval);
              }
              setSavedSearchFinished(true);
              return;
            }

            const nextEvent = savedSearchData.events[savedIndex];
            const dedupKey = `${nextEvent.name.toLowerCase()}::${nextEvent.date ?? "unknown"}`;
            if (!seenKeysRef.current.has(dedupKey)) {
              seenKeysRef.current.add(dedupKey);
              setEvents((current) => [nextEvent, ...current]);
            }
            savedIndex += 1;
          }, 520);
        }

        const data = (await response.json()) as { queries: SearchQuery[] };
        if (cancelled) {
          return;
        }

        setQueries(data.queries);
        lastRealLogAtRef.current = Date.now();
        setLogs((current) => [
          ...current,
          {
            message: `Built ${data.queries.length} source-specific search queries.`,
            status: "found",
          },
          {
            message: `Opening live stream for ${data.queries.length} parallel source searches...`,
            status: "searching",
          },
        ]);

        const streamParams = new URLSearchParams({
          session: sessionId,
          location,
          months,
          queries: JSON.stringify(data.queries),
        });

        eventSource = new EventSource(`/api/search-events?${streamParams.toString()}`);

        eventSource.onmessage = (event) => {
          const payload = JSON.parse(event.data) as StreamEvent;

          if (payload.type === "log") {
            lastRealLogAtRef.current = Date.now();
            setLogs((current) => [
              ...current,
              {
                message: payload.message,
                status: payload.status,
              },
            ]);
          }

          if (payload.type === "event") {
            setEvents((current) => {
              lastRealLogAtRef.current = Date.now();
              const dedupKey = `${payload.data.name.toLowerCase()}::${payload.data.date ?? "unknown"}`;
              if (seenKeysRef.current.has(dedupKey)) {
                return current;
              }

              seenKeysRef.current.add(dedupKey);
              return [payload.data, ...current];
            });
          }

          if (payload.type === "done") {
            setDone(true);
            setLoading(false);
            lastRealLogAtRef.current = Date.now();
            setLogs((current) => [
              ...current,
              { message: `Finished search with ${payload.total} saved events.`, status: "found" },
            ]);
            eventSource?.close();
          }
        };

        eventSource.onerror = () => {
          setError("The event stream closed unexpectedly.");
          setLoading(false);
          setDone(true);
          eventSource?.close();
        };
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unknown error");
        setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      window.clearInterval(fillerInterval);
      if (savedQueueInterval) {
        window.clearInterval(savedQueueInterval);
      }
      eventSource?.close();
    };
  }, [location, months, sessionId, topic]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 md:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Link href="/" className="text-sm text-slate-500 transition hover:text-slate-900">
            ← New search
          </Link>
          <h1 className="font-display text-4xl text-slate-950">Searching {summary}</h1>
          <p className="text-sm text-slate-500">
            Looking across {queries.length || 5} targeted sources over the next {months} month(s).
          </p>
        </div>
        <Link
          href="/events"
          prefetch={false}
          className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400"
        >
          View all stored events
        </Link>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-8 space-y-6">
        <StreamLog items={logs} done={done} />

        <section className="space-y-5">
          <div className="rounded-[24px] border border-white/70 bg-white/75 p-5 shadow-panel backdrop-blur">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Live results</h2>
                <p className="text-sm text-slate-500">
                  {loading
                    ? "Saved matches land first, then live web results continue streaming in."
                    : "Search completed."}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {events.length} events
              </span>
            </div>
          </div>

          <EventGrid events={events} loadingCount={loading && savedSearchFinished ? 3 : 0} />
        </section>
      </div>
    </main>
  );
}
