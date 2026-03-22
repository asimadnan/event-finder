import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { querySchema } from "@/lib/schemas";
import { SearchQuery } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      topic?: string;
      location?: string;
      months?: string;
    };

    if (!body.topic || !body.location || !body.months) {
      return NextResponse.json({ error: "Missing topic, location, or months." }, { status: 400 });
    }

    console.log("[generate-queries] starting", {
      topic: body.topic,
      location: body.location,
      months: body.months,
    });

    const client = getOpenAIClient();
    const model = getOpenAIModel();
    const response = await client.responses.parse({
      model,
      input: `The user is looking for "${body.topic}" events in "${body.location}" over the next ${body.months} month(s).

Generate exactly 5 targeted web search queries to find event listings.
Assume standard Australian event platforms (Eventbrite, Humanitix, Luma, Meetup, Facebook Events)
plus any niche sources specifically relevant to this topic.

For each query also provide a short platform_hint (e.g. "Eventbrite", "Luma", "local food blogs")
describing where this query is aimed.`,
      text: {
        format: {
          type: "json_schema",
          name: "search_queries",
          strict: true,
          schema: querySchema,
        },
      },
    });

    const parsed = response.output_parsed as { queries: SearchQuery[] } | null;
    console.log("[generate-queries] completed", {
      model,
      count: parsed?.queries.length ?? 0,
    });
    return NextResponse.json(parsed ?? { queries: [] });
  } catch (cause) {
    console.error("[generate-queries] failed", cause);
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "Unable to generate queries." },
      { status: 500 },
    );
  }
}
