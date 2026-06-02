# POC 2 — PowerSync + Supabase

**Status:** scaffolded, build pending (we build POC 1 first).

## Plan
Expo app + **PowerSync** SDK (on-device SQLite kept in sync with **Supabase** Postgres).
Same minimal list/add UI as POC 1 — only the sync engine differs.

## Stack (planned)
- Expo (React Native) + TypeScript
- PowerSync (client SDK + a PowerSync instance connected to Supabase Postgres)
- Supabase (Postgres source of truth)

## What it will demonstrate
Robust offline-first via a true on-device SQLite mirror + managed sync (PowerSync Sync Rules),
with writes routed to Supabase. Heavier setup than POC 1, more industrial-strength.

> This README + the CLAUDE.md will be expanded when the POC is built.
