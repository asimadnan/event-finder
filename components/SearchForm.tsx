"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getOrCreateSessionId } from "@/lib/utils";

const timeframeOptions = [
  { label: "1 month", value: "1" },
  { label: "2 months", value: "2" },
  { label: "3 months", value: "3" },
  { label: "4 months", value: "4" },
];

export function SearchForm() {
  const router = useRouter();
  const [location, setLocation] = useState("Sydney, Australia");
  const [months, setMonths] = useState("1");
  const [topic, setTopic] = useState("");
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams({
      location,
      months,
      topic,
      session: sessionId || getOrCreateSessionId(),
    });

    router.push(`/results?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-panel backdrop-blur md:p-8"
    >
      <div className="grid gap-5 md:grid-cols-[1fr_180px]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Location</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            placeholder="Sydney, Australia"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Timeframe</span>
          <select
            value={months}
            onChange={(event) => setMonths(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          >
            {timeframeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-5 block space-y-2">
        <span className="text-sm font-medium text-slate-700">Topic or interest</span>
        <input
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          placeholder="e.g. AI, cheese, jazz, startups"
          required
        />
      </label>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          Searches five tailored sources and streams events into your session.
        </p>
        <button
          type="submit"
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Find events
        </button>
      </div>
    </form>
  );
}
