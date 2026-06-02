-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).

-- The notes table. Legend-State syncs by created_at / updated_at / deleted, so we need all three.
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  text       text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted    boolean default false
);

-- Keep created_at/updated_at correct on every write. Legend-State's incremental sync
-- ("changes since last-sync") relies on updated_at being bumped on UPDATE.
create or replace function handle_times() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at := now();
    new.updated_at := now();
  elsif (tg_op = 'UPDATE') then
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_times on notes;
create trigger handle_times before insert or update on notes
  for each row execute procedure handle_times();

-- Stream row changes to clients (this powers Legend-State's realtime: true).
alter publication supabase_realtime add table notes;

-- POC ONLY: let the anon key read/write everything. In production you'd write real
-- per-tenant RLS policies instead.
alter table notes enable row level security;
drop policy if exists "poc_all_access" on notes;
create policy "poc_all_access" on notes for all to anon using (true) with check (true);
