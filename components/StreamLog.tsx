"use client";

import { useEffect, useRef, useState } from "react";
import { StreamLogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_PREFIX = {
  searching: "[scan]",
  found: "[ok]",
  skipped: "[skip]",
  error: "[err]",
} as const;

const TYPE_SPEED_MS = 18;

type RenderedLine = StreamLogItem & {
  typedMessage: string;
  isTyping: boolean;
};

export function StreamLog({
  items,
  done,
}: {
  items: StreamLogItem[];
  done: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const queueIndexRef = useRef(0);
  const typingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const [renderedLines, setRenderedLines] = useState<RenderedLine[]>([]);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [renderedLines]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (items.length === 0) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      queueIndexRef.current = 0;
      typingRef.current = false;
      setRenderedLines([]);
      return;
    }

    const typeNextLine = () => {
      if (typingRef.current || queueIndexRef.current >= itemsRef.current.length) {
        return;
      }

      const nextItem = itemsRef.current[queueIndexRef.current];
      typingRef.current = true;

      setRenderedLines((current) => [
        ...current,
        {
          ...nextItem,
          typedMessage: "",
          isTyping: true,
        },
      ]);

      let charIndex = 0;
      const fullMessage = nextItem.message;

      const step = () => {
        charIndex += 1;
        const typedMessage = fullMessage.slice(0, charIndex);

        setRenderedLines((current) => {
          const updated = [...current];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              typedMessage,
              isTyping: charIndex < fullMessage.length,
            };
          }
          return updated;
        });

        if (charIndex < fullMessage.length) {
          timeoutRef.current = window.setTimeout(step, TYPE_SPEED_MS);
          return;
        }

        queueIndexRef.current += 1;
        typingRef.current = false;
        if (queueIndexRef.current < itemsRef.current.length) {
          timeoutRef.current = window.setTimeout(typeNextLine, 110);
        }
      };

      timeoutRef.current = window.setTimeout(step, TYPE_SPEED_MS);
    };

    typeNextLine();
  }, [items]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-800 bg-[#08111f] text-slate-100 shadow-panel">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="font-mono text-sm font-semibold text-slate-100">Live search log</h2>
          <p className="font-mono text-xs text-slate-400">
            {done ? "Search complete." : "Streaming activity while the search pipeline runs."}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs font-medium",
            done
              ? "border-slate-700 bg-slate-800 text-slate-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 animate-pulseSoft",
          )}
        >
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              done ? "bg-emerald-400" : "bg-rose-400 animate-recording-dot",
            )}
          />
          {done ? "Done" : "Searching"}
        </span>
      </div>

      <div ref={ref} className="max-h-[420px] space-y-2 overflow-y-auto p-5 font-mono">
        {renderedLines.length ? (
          renderedLines.map((item, index) => (
            <p
              key={`${item.message}-${index}`}
              className={cn(
                "text-sm leading-7 opacity-0 animate-rise",
                item.status === "error" && "text-rose-300",
                item.status === "found" && "text-emerald-300",
                item.status === "skipped" && "text-amber-300",
                item.status === "searching" && "text-slate-300",
              )}
              style={{ animationDelay: `${index * 20}ms`, animationFillMode: "forwards" }}
            >
              <span className="mr-3 text-cyan-300">$</span>
              <span className="mr-3 text-slate-500">{STATUS_PREFIX[item.status]}</span>
              {item.typedMessage}
              {item.isTyping ? <span className="ml-1 text-cyan-300 animate-pulse">|</span> : null}
            </p>
          ))
        ) : (
          <p className="text-sm text-slate-400">Waiting to start search…</p>
        )}
      </div>
    </section>
  );
}
