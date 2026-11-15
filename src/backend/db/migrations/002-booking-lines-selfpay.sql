-- Adds the booking, line type, self-pay and caller-report columns (issue #45).
-- Only adds columns with safe defaults, so it is safe on the live database and safe to run twice.
alter table listings
  add column if not exists booking_url text,
  add column if not exists booking_source text check (booking_source in ('zocdoc', 'headway', 'alma', 'rula', 'practice_site')),
  add column if not exists phone_line_type text not null default 'unknown' check (phone_line_type in ('landline', 'mobile', 'voip', 'unknown'));

alter table verdicts
  add column if not exists sees_self_pay text not null default 'unknown' check (sees_self_pay in ('yes', 'no', 'unknown'));

alter table calls
  add column if not exists source text not null default 'agent' check (source in ('agent', 'caller'));
