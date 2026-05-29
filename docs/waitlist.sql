-- DRIP waitlist table
-- Apply once in the Supabase SQL editor. The app does not run this.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'website',
  chain_interest text,
  created_at timestamptz not null default now(),
  user_agent text,
  ip_hash text
);

-- Case-insensitive uniqueness on email so the API can map duplicates to
-- "already_joined" via Postgres 23505.
create unique index if not exists waitlist_email_unique_idx
  on public.waitlist (lower(email));

-- Lock the table down. The waitlist API uses the service-role key so RLS
-- does not apply to it; we still enable RLS so anon/auth keys cannot read
-- the list from the client.
alter table public.waitlist enable row level security;
