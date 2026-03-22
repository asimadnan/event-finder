import clsx from "clsx";
import dayjs from "dayjs";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function getOrCreateSessionId() {
  if (typeof window === "undefined") {
    return "";
  }

  const key = "event-finder-session-id";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}

export function formatEventDate(date: string | null, endDate: string | null, time: string | null) {
  if (!date) {
    return "Date TBD";
  }

  const start = dayjs(date);
  if (!start.isValid()) {
    return "Date TBD";
  }

  if (endDate) {
    const end = dayjs(endDate);
    if (end.isValid() && !end.isSame(start, "day")) {
      return `${start.format("ddd D MMM")} - ${end.format("ddd D MMM")}`;
    }
  }

  return time ? `${start.format("ddd D MMM")} · ${time}` : start.format("ddd D MMM");
}

export function normaliseCategory(category: string | null | undefined) {
  if (!category) {
    return "General";
  }

  return category.trim() || "General";
}
