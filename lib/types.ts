export type SearchQuery = {
  query: string;
  platform_hint: string;
};

export type EventRecord = {
  id?: string;
  name: string;
  description: string | null;
  date: string | null;
  end_date: string | null;
  time: string | null;
  venue: string | null;
  suburb: string | null;
  url: string | null;
  fee: string | null;
  is_free: boolean;
  organiser: string | null;
  category: string | null;
  source: string | null;
  session_id: string | null;
  created_at?: string;
  result_origin?: "saved" | "live";
};

export type StreamLogStatus = "searching" | "found" | "skipped" | "error";

export type StreamLogItem = {
  message: string;
  status: StreamLogStatus;
  sources?: string[];
};

export type StreamEvent =
  | { type: "log"; message: string; status: StreamLogStatus; sources?: string[] }
  | { type: "event"; data: EventRecord }
  | { type: "done"; total: number };
