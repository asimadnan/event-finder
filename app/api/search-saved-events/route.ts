import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { EventRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

function toTerms(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term && !STOP_WORDS.has(term))
    .flatMap((term) => {
      const variants = new Set<string>();
      variants.add(term);

      // Keep meaningful short acronyms like "ai".
      if (term.length >= 3) {
        if (term.endsWith("ies") && term.length > 4) {
          variants.add(`${term.slice(0, -3)}y`);
        } else if (term.endsWith("s") && !term.endsWith("ss") && term.length > 3) {
          variants.add(term.slice(0, -1));
        }
      }

      return [...variants].filter((variant) => variant.length >= 2);
    });
}

function scoreEvent(event: EventRecord, topic: string, location: string) {
  const topicTerms = toTerms(topic);
  const locationTerms = toTerms(location);
  const eventName = event.name.toLowerCase();
  const haystack = [
    event.name,
    event.description,
    event.category,
    event.organiser,
    event.venue,
    event.suburb,
    event.source,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  let topicMatchCount = 0;

  for (const term of topicTerms) {
    if (eventName.includes(term)) {
      topicMatchCount += 1;
      score += term.length > 4 ? 10 : 7;
    } else if (haystack.includes(term)) {
      score += term.length > 3 ? 4 : 2;
    }
  }

  for (const term of locationTerms) {
    if (haystack.includes(term)) {
      score += 1;
    }
  }

  if (event.category?.toLowerCase().includes(topic.toLowerCase())) {
    score += 6;
  }

  if (event.name.toLowerCase().includes(topic.toLowerCase())) {
    score += 8;
  }

  return {
    score,
    topicMatchCount,
  };
}

export async function GET(request: NextRequest) {
  try {
    const topic = request.nextUrl.searchParams.get("topic");
    const location = request.nextUrl.searchParams.get("location") ?? "";
    const months = Number(request.nextUrl.searchParams.get("months") ?? "1");

    if (!topic) {
      return NextResponse.json({ error: "Missing topic." }, { status: 400 });
    }

    const topicTerms = toTerms(topic);
    const supabase = getSupabaseAdminClient();
    const startDate = dayjs().format("YYYY-MM-DD");
    const endDate = dayjs().add(months, "month").format("YYYY-MM-DD");

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true, nullsFirst: false })
      .limit(200);

    if (error) {
      throw error;
    }

    const ranked = ((data ?? []) as EventRecord[])
      .map((event) => ({
        event: {
          ...event,
          result_origin: "saved" as const,
        },
        ...scoreEvent(event, topic, location),
      }))
      .filter((entry) => (topicTerms.length ? entry.topicMatchCount > 0 : entry.score > 0))
      .sort((left, right) => {
        if (left.topicMatchCount !== right.topicMatchCount) {
          return right.topicMatchCount - left.topicMatchCount;
        }

        if (left.score !== right.score) {
          return right.score - left.score;
        }

        return (left.event.date ?? "").localeCompare(right.event.date ?? "");
      })
      .slice(0, 18)
      .map((entry) => entry.event);

    console.log("[search-saved-events] completed", {
      topic,
      location,
      months,
      count: ranked.length,
    });

    return NextResponse.json({ events: ranked });
  } catch (cause) {
    console.error("[search-saved-events] failed", cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Unable to search saved events." },
      { status: 500 },
    );
  }
}
