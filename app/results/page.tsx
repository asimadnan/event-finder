import { Suspense } from "react";
import { ResultsClient } from "@/components/ResultsClient";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 md:px-10">
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-panel">
            <p className="text-sm text-slate-500">Preparing search…</p>
          </div>
        </main>
      }
    >
      <ResultsClient />
    </Suspense>
  );
}
