-- Bug fix: local_date defaulted to now()::date (time of INSERT), not derived
-- from checked_in_at. That's only correct for a real-time check-in; backfilling
-- a historical checked_in_at left local_date stuck on today for every row,
-- immediately colliding with the one-check-in-per-day unique constraint.
-- A generated column fixes this for both backfills and live inserts.

-- checked_in_at::date is not IMMUTABLE (depends on session timezone), which
-- Postgres requires for a generated column — cast through `at time zone`
-- first, which is deterministic (always UTC) regardless of session settings.
drop index if exists attendance_events_member_local_date_key;
alter table attendance_events drop column local_date;
alter table attendance_events add column local_date date generated always as ((checked_in_at at time zone 'utc')::date) stored;
create unique index attendance_events_member_local_date_key on attendance_events (member_id, local_date);
