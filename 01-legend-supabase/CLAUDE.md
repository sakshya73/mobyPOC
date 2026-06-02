@AGENTS.md

# CLAUDE.md — POC 1 (Legend-State + Supabase)

Throwaway POC to evaluate the offline-sync **feel** for Moby. Keep it **minimal**.

## Purpose
One screen (list + add notes), offline-first + realtime, via Legend-State's `syncedSupabase`.
NOT a full app — no auth, multi-tenant, camera, or GPS. Just the sync layer.

## Key files
- `config.ts` — Supabase URL + anon key (do not commit real values)
- `state.ts` — the Legend-State observable + `syncedSupabase` wiring (**the heart**)
- `App.tsx` — list/add UI (copied from `../../slice`)
- `supabase.sql` — `notes` table + Realtime setup (run in the Supabase SQL editor)

## Conventions
- pnpm only. Expo SDK 56 (see AGENTS.md — check versioned docs before writing Expo code).
- Keep dependencies minimal; don't add features beyond the offline + realtime sync demo.
- **Maintain this file and `README.md`** whenever the structure or approach changes.

## Run
`pnpm install && pnpm exec expo start` — needs Supabase creds in `config.ts`.
