@AGENTS.md

# CLAUDE.md — POC 2 (PowerSync + Supabase)

Throwaway POC to evaluate the offline-sync **feel** for Moby. Keep it **minimal**.

**Status:** scaffolded; build pending (POC 1 first).

## Purpose
Same minimal list/add app as POC 1, but the sync engine is **PowerSync** (on-device SQLite ↔
Supabase Postgres). No auth/multi-tenant/camera/GPS.

## Conventions
- pnpm only. Expo SDK 56 (see AGENTS.md — check versioned docs before writing Expo code).
- Minimal deps; nothing beyond the sync demo.
- **Maintain this file and `README.md`** as the POC is built and the structure firms up.
