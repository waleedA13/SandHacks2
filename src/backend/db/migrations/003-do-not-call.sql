-- Offices that asked the voice agent not to call again. Safe to run twice.
create table if not exists do_not_call (
  phone text primary key,
  created_at timestamptz not null default now()
);
