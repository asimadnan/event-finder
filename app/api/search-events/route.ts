import dayjs from "dayjs";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { rememberEvent, hasSeenEvent, findDuplicateEvent } from "@/lib/dedup";
import { normalizeDate } from "@/lib/date";
import { eventsSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { EventRecord, SearchQuery, StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function writeChunk(controller: ReadableStreamDefaultController<Uint8Array>, payload: StreamEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeEvent(event: EventRecord, source: string, sessionId: string) {
  const date = normalizeDate(event.date);
  const endDate = normalizeDate(event.end_date);

  return {
    ...event,
    description: event.description?.trim() || null,
    date,
    end_date: endDate,
    time: event.time?.trim() || null,
    venue: event.venue?.trim() || null,
    suburb: event.suburb?.trim() || null,
    url: event.url?.trim() || null,
    fee: event.fee?.trim() || null,
    organiser: event.organiser?.trim() || null,
    category: event.category?.trim() || "General",
    is_free: event.is_free || event.fee?.toLowerCase() === "free",
    source,
    session_id: sessionId,
  } satisfies EventRecord;
}

async function fetchEventsForQuery(query: SearchQuery, location: string, months: string) {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const startDate = dayjs().format("YYYY-MM-DD");
  const endDate = dayjs().add(Number(months), "month").format("YYYY-MM-DD");

  const response = await client.responses.parse({
    model,
    tools: [{ type: "web_search" }],
    input: `Search the web for this query: "${query.query}"

Find real upcoming events. Only include events:
- Happening between ${startDate} and ${endDate}
- Located in or near ${location}, Australia

For venue: provide the specific venue name.
For suburb: provide the suburb or area.
For description: write 1-2 sentences summarising the event.
For fee: write the ticket price as a string (e.g. "$25", "$10–$50") or "Free".
For date: use YYYY-MM-DD format. If only a month is known, use the 1st of that month.
For category: use a single short tag.
Also return a sources_searched array of domains or pages you relied on.`,
    text: {
      format: {
        type: "json_schema",
        name: "events_result",
        strict: true,
        schema: eventsSchema,
      },
    },
  });

  return (response.output_parsed ?? { events: [], sources_searched: [] }) as {
    events: EventRecord[];
    sources_searched: string[];
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session");
  const location = searchParams.get("location") ?? "Sydney";
  const months = searchParams.get("months") ?? "1";
  const queriesRaw = searchParams.get("queries");

  if (!sessionId || !queriesRaw) {
    return new Response("Missing session or queries.", { status: 400 });
  }

  const queries = JSON.parse(queriesRaw) as SearchQuery[];
  const supabase = getSupabaseAdminClient();
  console.log("[search-events] stream opened", {
    sessionId,
    queryCount: queries.length,
    location,
    months,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let total = 0;

      const safeWrite = (payload: StreamEvent) => writeChunk(controller, payload);

      const tasks = queries.map((query, index) =>
        (async () => {
          await delay(index * 100);
          console.log("[search-events] query starting", {
            platform: query.platform_hint,
            query: query.query,
          });
          safeWrite({
            type: "log",
            message: `Searching ${query.platform_hint}...`,
            status: "searching",
          });

          try {
            const result = await fetchEventsForQuery(query, location, months);
            console.log("[search-events] query completed", {
              platform: query.platform_hint,
              candidates: result.events.length,
              sources: result.sources_searched,
            });

            safeWrite({
              type: "log",
              message: `Found ${result.events.length} candidate events via ${query.platform_hint}.`,
              status: "found",
              sources: result.sources_searched,
            });

            for (const item of result.events) {
              const normalized = sanitizeEvent(item, query.query, sessionId);
              if (!normalized.name || !normalized.date) {
                console.log("[search-events] skipped incomplete", {
                  platform: query.platform_hint,
                });
                safeWrite({
                  type: "log",
                  message: `Skipped an incomplete event from ${query.platform_hint}.`,
                  status: "skipped",
                });
                continue;
              }

              if (hasSeenEvent(normalized.name, normalized.date)) {
                console.log("[search-events] skipped in-memory duplicate", {
                  name: normalized.name,
                  date: normalized.date,
                });
                safeWrite({
                  type: "log",
                  message: `Skipped duplicate "${normalized.name}" from in-memory dedup.`,
                  status: "skipped",
                });
                continue;
              }

              const duplicate = await findDuplicateEvent(normalized.name, normalized.date);
              if (duplicate) {
                rememberEvent(normalized.name, normalized.date);
                console.log("[search-events] skipped database duplicate", {
                  name: normalized.name,
                  date: normalized.date,
                });
                safeWrite({
                  type: "log",
                  message: `Skipped duplicate "${normalized.name}" already in Supabase.`,
                  status: "skipped",
                });
                continue;
              }

              const { data, error } = await supabase
                .from("events")
                .insert(normalized)
                .select("*")
                .single();

              if (error) {
                console.error("[search-events] insert failed", {
                  name: normalized.name,
                  error: error.message,
                });
                safeWrite({
                  type: "log",
                  message: `Insert failed for "${normalized.name}": ${error.message}`,
                  status: "error",
                });
                continue;
              }

              rememberEvent(normalized.name, normalized.date);
              total += 1;
              console.log("[search-events] inserted", {
                name: normalized.name,
                date: normalized.date,
                total,
              });
              safeWrite({
                type: "event",
                data: {
                  ...(data as EventRecord),
                  result_origin: "live",
                },
              });
            }
          } catch (cause) {
            console.error("[search-events] query failed", {
              platform: query.platform_hint,
              error: cause instanceof Error ? cause.message : "Unknown error",
            });
            safeWrite({
              type: "log",
              message: `Search failed for ${query.platform_hint}: ${
                cause instanceof Error ? cause.message : "Unknown error"
              }`,
              status: "error",
            });
          }
        })(),
      );

      await Promise.allSettled(tasks);
      console.log("[search-events] stream completed", { total });
      safeWrite({ type: "done", total });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
