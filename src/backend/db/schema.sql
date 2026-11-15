-- Applied by `npm run db:reset`. Drops and recreates every table.
drop table if exists jobs, calls, verdicts, evidence, listings cascade;

create table listings (
  id uuid primary key default gen_random_uuid(),
  insurer text not null,
  plan text not null,
  city text not null,
  state text not null,
  name text not null,
  credential text,
  address text,
  phone text,
  npi text,
  source_url text not null,
  scraped_at timestamptz not null default now(),
  booking_url text,
  booking_source text check (booking_source in ('zocdoc', 'headway', 'alma', 'rula', 'practice_site')),
  phone_line_type text not null default 'unknown' check (phone_line_type in ('landline', 'mobile', 'voip', 'unknown'))
);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  source text not null check (source in ('psychology_today', 'practice_site', 'zocdoc', 'headway', 'license_board')),
  url text not null,
  raw_text text not null,
  fetched_at timestamptz not null default now()
);

create table verdicts (
  listing_id uuid primary key references listings(id) on delete cascade,
  still_practising text not null check (still_practising in ('yes', 'no', 'unknown')),
  lists_insurer text not null check (lists_insurer in ('yes', 'no', 'unknown')),
  accepting_new text not null check (accepting_new in ('yes', 'no', 'unknown')),
  score int not null,
  reason text not null,
  checked_at timestamptz not null default now(),
  specialties text[] not null default '{}',
  languages text[] not null default '{}',
  telehealth text not null default 'unknown' check (telehealth in ('yes', 'no', 'unknown')),
  self_pay_min int,
  self_pay_max int,
  license_status text not null default 'unchecked' check (license_status in ('active', 'inactive', 'not_found', 'unchecked')),
  license_discipline text not null default 'unknown' check (license_discipline in ('yes', 'no', 'unknown')),
  sees_self_pay text not null default 'unknown' check (sees_self_pay in ('yes', 'no', 'unknown'))
);

create table calls (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  status text not null check (status in ('in_progress', 'done', 'failed')),
  takes_plan text check (takes_plan in ('yes', 'no', 'unknown')),
  accepting_new text check (accepting_new in ('yes', 'no', 'unknown')),
  summary text,
  called_at timestamptz not null default now(),
  source text not null default 'agent' check (source in ('agent', 'caller'))
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  kind text not null check (kind in ('recheck')),
  status text not null check (status in ('queued', 'running', 'done', 'failed')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Keyed by the last 10 digits of a listing phone. Also in migrations/003-do-not-call.sql.
drop table if exists do_not_call;
create table do_not_call (
  phone text primary key,
  created_at timestamptz not null default now()
);

create index on evidence (listing_id);
create index on calls (listing_id, called_at desc);
create index on listings (insurer, city);
