import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8 md:px-10 md:py-10">
      <section className="relative overflow-hidden rounded-[40px] border border-white/70 bg-white/65 px-6 py-8 shadow-panel backdrop-blur md:px-10 md:py-10">
        <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.16),transparent_38%),radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.16),transparent_34%)]" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
              EF
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Event Finder</p>
              <p className="text-xs text-slate-500">Search the web for what is happening next</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 md:inline-flex">
            Live event discovery
          </span>
        </div>

        <div className="relative mt-12 grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <section className="space-y-7">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                AI event search across the web
              </span>
              <h1 className="max-w-3xl font-display text-5xl leading-[1.02] text-slate-950 md:text-7xl">
                Find the events worth showing up for.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Search by topic, city, and timeframe. We scan event platforms and niche sources,
                surface relevant matches fast, and keep the whole process visible while results
                stream in.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/80 bg-white/75 p-4">
                <p className="text-2xl font-semibold text-slate-950">5+</p>
                <p className="mt-1 text-sm text-slate-500">Source types searched in parallel</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/75 p-4">
                <p className="text-2xl font-semibold text-slate-950">Live</p>
                <p className="mt-1 text-sm text-slate-500">Results stream into the page as they land</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/75 p-4">
                <p className="text-2xl font-semibold text-slate-950">Zero tabs</p>
                <p className="mt-1 text-sm text-slate-500">One search instead of ten messy searches</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-slate-950 px-5 py-5 text-slate-100">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Search workflow
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
                <p>1. Enter a topic and location.</p>
                <p>2. Discover matching sources and saved events.</p>
                <p>3. Watch fresh events appear in real time.</p>
              </div>
            </div>
          </section>

          <div className="relative">
            <div className="pointer-events-none absolute -inset-3 rounded-[32px] bg-gradient-to-br from-white/70 via-transparent to-slate-200/50 blur-2xl" />
            <div className="relative">
              <SearchForm />
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-10 flex flex-col gap-4 border-t border-slate-200/70 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>Browse the shared index of discovered events or start a fresh search above.</p>
        <Link
          href="/events"
          prefetch={false}
          className="inline-flex rounded-full border border-slate-200 bg-white/80 px-4 py-2 font-medium text-slate-900 transition hover:border-slate-400"
        >
          View all events
        </Link>
      </footer>
    </main>
  );
}
