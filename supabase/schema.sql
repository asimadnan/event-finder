create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  date date,
  end_date date,
  time text,
  venue text,
  suburb text,
  url text,
  fee text,
  is_free boolean default false,
  organiser text,
  category text,
  source text,
  session_id text,
  created_at timestamptz default now()
);

create index if not exists events_date_idx on events (date);
create index if not exists events_name_idx on events (name);

create or replace function find_similar_event(event_date date, event_name text)
returns table (id uuid)
language sql
as $$
  select events.id
  from events
  where events.date = event_date
    and similarity(events.name, event_name) > 0.9
  limit 1;
$$;
