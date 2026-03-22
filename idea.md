# Event Finder — Implementation Plan

## Overview

A minimal Next.js app that takes a topic, location, and timeframe from the user, generates targeted search queries via OpenAI, runs them in parallel using OpenAI Web Search, deduplicates results, stores events in Supabase, and streams the entire process live to the user.

No auth. No image scraping. Session-scoped results shown immediately, with a global "all events" view backed by Supabase.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server Actions + streaming support built-in |
| AI | OpenAI `gpt-5` + structured outputs + Web Search tool | Native JSON schema enforcement, no manual parsing |
| Storage | Supabase (Postgres) | Simple hosted Postgres, good free tier |
| Styling | Tailwind CSS | Fast to build, easy to keep minimal |
| Streaming | Server-Sent Events (SSE) via Route Handler | Simple, no websocket setup needed |

---

## Project Structure

```
event-finder/
├── app/
│   ├── page.tsx                  # Search form (home)
│   ├── results/
│   │   └── page.tsx              # Results page (streams events)
│   ├── events/
│   │   └── page.tsx              # All events page (from Supabase)
│   └── api/
│       ├── generate-queries/
│       │   └── route.ts          # Step 1: LLM → search queries
│       └── search-events/
│           └── route.ts          # Step 2: SSE stream of events
├── lib/
│   ├── openai.ts                 # OpenAI client
│   ├── supabase.ts               # Supabase client
│   ├── dedup.ts                  # Name + date similarity check
│   └── types.ts                  # Shared types (Event, SearchQuery)
├── components/
│   ├── SearchForm.tsx
│   ├── EventCard.tsx             # Gradient banner + truncation handling
│   ├── StreamLog.tsx             # Live "what's happening" feed
│   └── EventGrid.tsx
└── supabase/
    └── schema.sql                # DB schema
```

---

## Database Schema

```sql
-- supabase/schema.sql

create extension if not exists pg_trgm;

create table events (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  date         date,
  end_date     date,
  time         text,
  venue        text,
  suburb       text,
  url          text,
  fee          text,
  is_free      boolean default false,
  organiser    text,
  category     text,
  source       text,             -- which search query found this
  session_id   text,             -- browser session, no auth needed
  created_at   timestamptz default now()
);

-- Indexes for dedup checks
create index on events (date);
create index on events (name);
```

No auth, no users table. `session_id` is a random UUID generated client-side on first visit and stored in `localStorage`. This lets you show "your session's events" without login.

---

## Step 1 — Search Form (`app/page.tsx`)

**Fields:**
- Location (text input, default: `Sydney, Australia`)
- Timeframe (select: `1 month` / `2 months` / `3 months` / `4 months`, default: `1 month`)
- Topic / Interest (free text, placeholder: `e.g. AI, cheese, jazz, startups`)

On submit → navigate to `/results?topic=...&location=...&months=...&session=...`

---

## Step 2 — Query Generation API (`api/generate-queries/route.ts`)

**Input:** `{ topic, location, months }`

**Model:** `gpt-5` — no web search tool on this call, just fast structured text generation.

**Prompt:**

```
The user is looking for "{topic}" events in "{location}" over the next {months} month(s).

Generate exactly 5 targeted web search queries to find event listings.
Assume standard Australian event platforms (Eventbrite, Humanitix, Luma, Meetup, Facebook Events)
plus any niche sources specifically relevant to this topic.

For each query also provide a short platform_hint (e.g. "Eventbrite", "Luma", "local food blogs")
describing where this query is aimed — used to show the user what's being searched.
```

**Structured output schema:**

```json
{
  "model": "gpt-5",
  "text": {
    "format": {
      "type": "json_schema",
      "name": "search_queries",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "queries": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "query":         { "type": "string" },
                "platform_hint": { "type": "string" }
              },
              "required": ["query", "platform_hint"],
              "additionalProperties": false
            }
          }
        },
        "required": ["queries"],
        "additionalProperties": false
      }
    }
  }
}
```

**Output:** `{ queries: [{ query: string, platform_hint: string }] }`

`platform_hint` drives the StreamLog UI — you show "🔍 Searching Eventbrite..." instead of the raw query string. Much cleaner for the demo.

**Notes:**
- No web search tool on this call — fast, ~1s
- No manual JSON parsing needed; structured outputs guarantee schema compliance
- Stream a log line immediately when this resolves before main search begins

---

## Step 3 — Event Search + SSE Stream (`api/search-events/route.ts`)

This is the main route. It accepts the 5 queries and streams progress back to the client using SSE.

**Flow inside the route:**

```
1. For each of the 5 queries (run in parallel with Promise.allSettled):
   a. Stream a "log" event immediately: "🔍 Searching <platform_hint>..."
   b. Call gpt-5 with web_search tool + structured output schema
   c. Receive guaranteed-valid JSON — no parsing needed
   d. Stream a "log" event: "✅ Found N events via <platform_hint>"
   e. For each event, run dedup check against Supabase
   f. If not a duplicate, insert into Supabase and stream "event" payload
   g. If duplicate, stream a "log" event with status "skipped"

2. When all 5 resolve, stream a "done" event
```

**SSE event types streamed to client:**

```ts
{ type: "log",   message: string, status: "searching" | "found" | "skipped" | "error" }
{ type: "event", data: Event }
{ type: "done",  total: number }
```

**Structured output schema for event search:**

```json
{
  "model": "gpt-5",
  "tools": [{ "type": "web_search" }],
  "text": {
    "format": {
      "type": "json_schema",
      "name": "events_result",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "events": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name":        { "type": "string" },
                "date":        { "type": "string" },
                "end_date":    { "type": ["string", "null"] },
                "time":        { "type": ["string", "null"] },
                "venue":       { "type": "string" },
                "suburb":      { "type": "string" },
                "description": { "type": "string" },
                "url":         { "type": "string" },
                "fee":         { "type": "string" },
                "is_free":     { "type": "boolean" },
                "organiser":   { "type": ["string", "null"] },
                "category":    { "type": "string" }
              },
              "required": [
                "name", "date", "end_date", "time",
                "venue", "suburb", "description", "url",
                "fee", "is_free", "organiser", "category"
              ],
              "additionalProperties": false
            }
          },
          "sources_searched": {
            "type": "array",
            "items": { "type": "string" }
          }
        },
        "required": ["events", "sources_searched"],
        "additionalProperties": false
      }
    }
  }
}
```

**Field design decisions:**
- `venue` and `suburb` are separate — venue can be long (truncated in card), suburb is always short and used in the metadata row
- `is_free` boolean means the UI never has to parse the `fee` string for badge colour logic
- `sources_searched` is logged to the StreamLog for transparency — shows users what pages were actually visited
- `end_date` and `time` are nullable to handle events where this info isn't available

**Prompt per search query:**

```
Search the web for this query: "{query}"

Find real upcoming events. Only include events:
- Happening between {startDate} and {endDate}
- Located in or near {location}, Australia

For venue: provide the specific venue name.
For suburb: provide the Sydney suburb or area (e.g. "Surry Hills", "CBD", "Pyrmont").
For description: write 1-2 sentences summarising the event.
For fee: write the ticket price as a string (e.g. "$25", "$10–$50") or "Free".
For date: use YYYY-MM-DD format. If only a month is known, use the 1st of that month.
For category: use a single short tag (e.g. "AI", "Food & Drink", "Music", "Startup", "Wellness").
```

---

## Step 4 — Deduplication (`lib/dedup.ts`)

Before inserting any event, check Supabase using `pg_trgm` similarity:

```sql
SELECT id FROM events
WHERE date = $1
  AND similarity(name, $2) > 0.9
LIMIT 1;
```

If a match is found → skip insert, stream a log event with `status: "skipped"`.

**Client-side fast path:** also maintain a `Set<string>` of `"name::date"` strings in memory during the session. Check this first before hitting the DB — catches obvious duplicates within the same search run without a round-trip.

---

## Step 5 — Results Page (`app/results/page.tsx`)

**Client component.** On mount:
1. Call `api/generate-queries` — get 5 `{ query, platform_hint }` objects
2. Open an `EventSource` connection to `api/search-events?queries=...&session=...`
3. Listen for SSE events:
   - `log` → append to `StreamLog` component
   - `event` → append new `EventCard` to grid
   - `done` → show summary banner, close connection

**StreamLog component** — the "reasoning tokens" UX:
- Collapsible panel (open by default while searching, collapses when done)
- Lines appear one by one as SSE log events arrive
- Icon per status: 🔍 searching / ✅ found / ⚠️ skipped / ❌ error
- Subtle fade-in animation per line, auto-scrolls to latest
- Shows `sources_searched` URLs as small pills when a query completes

Cards animate in (staggered fade-up) as they arrive — not all at once at the end.

---

## Step 6 — All Events Page (`app/events/page.tsx`)

Simple server component. Queries Supabase:

```sql
SELECT * FROM events
ORDER BY date ASC, created_at DESC
LIMIT 200;
```

Displays a filterable grid by category tag. No pagination needed for MVP.

---

## Event Card Design

Each card has three zones: a **gradient banner**, a **body**, and a **footer**.

### Gradient banner (top, ~72px tall)

Category maps to a fixed gradient. Example mapping:

```ts
const CATEGORY_GRADIENTS: Record<string, string> = {
  "AI":           "135deg, #667eea, #764ba2",
  "Food & Drink": "135deg, #f093fb, #f5576c",
  "Music":        "135deg, #4facfe, #00f2fe",
  "Startup":      "135deg, #43e97b, #38f9d7",
  "Wellness":     "135deg, #fa709a, #fee140",
  "default":      "135deg, #a18cd1, #fbc2eb",
}
```

- 2–3 small translucent circles animate with CSS `@keyframes` drifting upward inside the banner — gives life without distraction
- Category pill sits bottom-left of the banner, white text with `backdrop-filter: blur`

### Body (padding: 14px 16px)

- **Event name**: `font-size: 14px`, `font-weight: 500`, `-webkit-line-clamp: 2` — max 2 lines, ellipsis. Prevents long titles breaking layout.
- **Description**: `font-size: 12px`, muted colour, `-webkit-line-clamp: 2` — always exactly 2 lines shown.
- **Venue**: single line, truncated with ellipsis if long. Prefixed with a small location pin icon.
- **Date + time**: formatted as `"Sat 12 Apr · 6:00 PM"` or `"Sat 12 – Sun 13 Apr"` for multi-day. Never show raw ISO strings.

### Footer (border-top, padding: 10px 16px)

- Left: **Fee badge** — `"Free"` in green / price string in amber / `"Unknown"` in gray. Use `is_free` boolean for colour logic, not string parsing.
- Right: **"View event →"** link opening `url` in a new tab.

### Truncation rules summary

| Field | Max display | Method |
|---|---|---|
| Name | 2 lines | `-webkit-line-clamp: 2` |
| Description | 2 lines | `-webkit-line-clamp: 2` |
| Venue | 1 line | `text-overflow: ellipsis` |
| Suburb | 1 line | `text-overflow: ellipsis` |
| Fee | badge | always short by design |

**Critical:** all flex children containing truncated text must have `min-width: 0` and `overflow: hidden` — without this, ellipsis silently fails inside flex/grid containers.

---

## Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # for server-side inserts
```

---

## Build Order

Build in this sequence — each step is independently testable:

1. **Supabase schema** — create table, enable `pg_trgm`, test a manual insert
2. **`/api/generate-queries`** — test with curl, confirm structured output returns 5 objects with `platform_hint`
3. **`/api/search-events`** (no SSE yet) — return flat JSON first, validate the structured schema works end-to-end with web search
4. **Add SSE streaming** to the search route — test with curl and watch events stream line by line
5. **Build the Results page** — wire up `EventSource`, `StreamLog`, `EventCard`
6. **Build the Search form** on home page
7. **Build the All Events page** — simple Supabase query + grid
8. **Polish** — gradient cards, animations, empty states, error handling

---

## Key Gotchas

**Structured outputs + web search on gpt-5** — the `text.format` JSON schema and `web_search` tool work together. The model searches, then formats its answer to your schema. No manual parsing needed, but still wrap in try/catch for network errors and empty `events` arrays.

**SSE in Next.js App Router** — use a Route Handler (not a Server Action) and set headers manually:
```ts
headers: {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
}
```

**`Promise.allSettled` not `Promise.all`** — one failed query must not kill the whole stream. Log failures as a `log` SSE event with `status: "error"`.

**Date normalisation** — even with structured outputs, GPT may return `"April 2026"` or partial dates. Post-process all date fields through `dayjs` to enforce `YYYY-MM-DD` before insert.

**`min-width: 0` on flex children** — any card body element using `text-overflow: ellipsis` inside a flex container will silently not truncate without this. Apply defensively to all flex children that contain text.

**Rate limits** — 5 parallel gpt-5 web search calls on a new API key may hit limits. Add a 100ms stagger between launches if needed.

---

## What's Out of Scope (MVP)

- Image fetching from event pages (flaky — use gradient banners instead)
- Auth / user accounts
- Email alerts or saved searches
- Pagination on all-events page
- Mobile-optimised layout (desktop first for a demo)