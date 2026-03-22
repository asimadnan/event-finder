import { getSupabaseAdminClient } from "@/lib/supabase";

const seenEvents = new Set<string>();

export function getInMemoryDedupKey(name: string, date: string | null) {
  return `${name.trim().toLowerCase()}::${date ?? "unknown"}`;
}

export function hasSeenEvent(name: string, date: string | null) {
  return seenEvents.has(getInMemoryDedupKey(name, date));
}

export function rememberEvent(name: string, date: string | null) {
  seenEvents.add(getInMemoryDedupKey(name, date));
}

export async function findDuplicateEvent(name: string, date: string | null) {
  if (!date) {
    return false;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("find_similar_event", {
    event_date: date,
    event_name: name,
  });

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}
