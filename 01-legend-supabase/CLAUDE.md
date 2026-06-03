@AGENTS.md

# CLAUDE.md — POC 1 (Legend-State + Supabase)

Throwaway POC to evaluate the offline-sync **feel** for Moby. Keep it **minimal**.

## Purpose
One screen (list + add notes + **photos**), offline-first + realtime, via Legend-State's
`syncedSupabase`, with media blobs in Supabase Storage. NOT a full app — no auth, multi-tenant, or
GPS. Voice capture is coded in `media.ts` but **parked** (see Gotchas). Just the sync layer.

## Key files
- `config.ts` — Supabase URL + publishable key (do not commit real values)
- `state.ts` — the Legend-State observable + `syncedSupabase` wiring (**the heart**)
- `media.ts` — photo capture + Supabase Storage upload (metadata syncs, the blob does not)
- `App.tsx` — list/add UI + photo button (copied from `../../slice`)
- `supabase.sql` — `notes` table + Realtime setup (run **first** in the Supabase SQL editor)
- `supabase-storage.sql` — `media` bucket + `media_type`/`storage_path` columns (run **second**)

## Conventions
- pnpm only. Expo SDK 56 (see AGENTS.md — check versioned docs before writing Expo code).
- Keep dependencies minimal; don't add features beyond the offline + realtime sync demo.
- **Maintain this file and `README.md`** whenever the structure or approach changes.

## Gotchas (hard-won — do not regress)
- **Do not set `created_at` in app code.** Legend-State reads its presence as "row already exists" →
  it UPDATEs (0 rows) instead of INSERTing → the row **silently never syncs**. Let the DB trigger set
  it; new rows still sort newest-first via the `?? '~'` fallback in `App.tsx`.
- **`File.arrayBuffer()` hangs in RN** → use `(new File(uri) as any).base64()` + `decode()` for uploads.
- **Supabase Storage uploads are flaky in RN** ("cannot parse response") → `uploadFile` retries with backoff.
- **Changed a native module / `app.json` plugin? Kill Metro and `expo start --clear`.** HMR on top of a
  native-module change wedges the bundle with a phantom `undefined is not a function` that survives edits.
- **expo-audio** is installed but **not imported** (voice parked); re-enable via a dev build later.

## Run
`pnpm install && pnpm exec expo start` — needs Supabase creds in `config.ts`, and both SQL files run.
