-- ─────────────────────────────────────────────────────────────────────────────
-- PowerSync ↔ Supabase setup. Run in the Supabase SQL editor.
-- (The `notes` table itself already exists from POC 1's supabase.sql / supabase-storage.sql —
--  POC 2 reuses the SAME Supabase project + tables, it just syncs them with PowerSync instead.)
--
-- PowerSync reads Postgres changes via LOGICAL REPLICATION (the Write-Ahead Log), so it needs:
--   1) a publication to listen to, and
--   2) a dedicated role to connect with.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) A publication PowerSync subscribes to. (This is separate from POC 1's supabase_realtime
--    publication — PowerSync does NOT use Supabase Realtime; it has its own sync protocol.)
drop publication if exists powersync;
create publication powersync for table notes;
-- (or, to sync everything: create publication powersync for all tables;)

-- 2) A replication role for the PowerSync Cloud service.
--    Put THIS role's name + password into the PowerSync dashboard → "Connect to your database".
--    BYPASSRLS lets PowerSync read every row; access is then governed by Sync Rules, not RLS.
drop role if exists powersync_role;
create role powersync_role with replication bypassrls login password 'CHANGE_ME_to_a_strong_password';
grant select on all tables in schema public to powersync_role;
-- For any tables added later: grant select on table <name> to powersync_role;
