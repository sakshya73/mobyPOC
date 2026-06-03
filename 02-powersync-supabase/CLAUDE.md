@AGENTS.md

# CLAUDE.md — POC 2 (PowerSync + Supabase)

Throwaway POC to evaluate the offline-sync **feel** for Moby with **PowerSync** as the engine, for a
head-to-head against POC 1 (Legend-State). Keep it **minimal**.

## Purpose
One screen (list + add notes), offline-first, where the app reads/writes a **local SQLite DB** and
PowerSync syncs it to the same Supabase Postgres as POC 1. NOT a full app — no auth, multi-tenant, or
GPS. Photo (capture + display) is wired; voice is parked behind `voiceComingSoon`. Just the sync layer.

## Key files
- `config.ts` — Supabase URL + anon key, `POWERSYNC_URL`, `POWERSYNC_TOKEN` (dev token, ~12h)
- `state.ts` — **the heart**: PowerSync schema (`notes` + local-only `local_media`), the `PowerSyncDatabase`
  init with an explicit `OPSqliteOpenFactory`, `connectPowerSync()`, and `addNote`/`deleteNote` via `db.execute`
- `PowerSyncConnector.ts` — the `supabase` client + the backend `connector` (`fetchCredentials` returns
  `{endpoint, token}`; `uploadData` applies queued local CRUD to Supabase)
- `media.ts` — photo capture + Supabase Storage streaming upload; note→file-URI map in the local-only
  `local_media` table (the blob never syncs through PowerSync — only `media_type`/`storage_path` do)
- `App.tsx` — the screen: `useQuery('SELECT … FROM notes')`, `useStatus()` pill, `PowerSyncContext.Provider`
- `NoteCard.tsx` — presentational feed card; `ui.ts` (pure helpers) + `styles.ts` (StyleSheet)
- `powersync.sql` — `powersync` publication + `powersync_role` (run in Supabase; logical replication)
- `sync-rules.yaml` — Sync Streams (edition 3) config; deploy via the CLI (see Gotchas)

> The `notes` table + `media` bucket are **reused from POC 1** (same Supabase project) — no table/bucket
> SQL here. Only `powersync.sql` (replication setup) is POC-2-specific on the backend.

## Conventions
- pnpm only (`.npmrc` has `node-linker=hoisted` — required for RN native autolinking / CocoaPods).
- Expo SDK 56 (see AGENTS.md — check versioned docs before writing Expo code).
- Keep dependencies minimal; don't add features beyond the offline-sync demo.
- **Maintain this file and `README.md`** whenever the structure or approach changes.

## Gotchas (hard-won — do not regress)
- **Name `OPSqliteOpenFactory` explicitly** in `new PowerSyncDatabase({ database: … })`. The SDK's
  auto-detect uses a dynamic `require` Metro can't bundle, so it falls back to `react-native-quick-sqlite`
  (not installed) and crashes with `Could not resolve @journeyapps/react-native-quick-sqlite`.
- **Deploy the sync config with the CLI, not just the dashboard.** Our dashboard edit silently didn't
  apply → the app logged `PSYNC_S2302 No sync config available` and showed **Offline / 0 notes**. Fix:
  `npx powersync@latest deploy sync-config` (Sync Streams, edition 3). Success = `Validated and applied
  checkpoint` in the logs.
- **Use Sync Streams (edition 3), not legacy `bucket_definitions`.** `sync-rules.yaml` here is streams.
- **Never declare an `id` column** in a `Table` — PowerSync auto-creates it (TEXT primary key). Booleans
  are `column.integer` (0/1), dates are `column.text` (ISO strings). `deleted` is 0/1, not a JS boolean.
- **`transaction.complete()` is mandatory** at the end of `uploadData`, or the upload queue stalls forever.
- **A 4xx from `uploadData` blocks the queue permanently.** `FATAL_RESPONSE_CODES` (22xxx/23xxx/42501)
  are treated as permanent and **discarded** (we log + return) so one bad row can't wedge all future syncs.
- **Dev token expires (~12h).** When sync stops with an auth error, regenerate (dashboard → Client Auth
  temporary token, or the CLI) and update `POWERSYNC_TOKEN` in `config.ts`.
- **Native module ⇒ no Expo Go.** Use a dev build: `expo prebuild` then `expo run:ios`. After any native
  module / `app.json` change, kill Metro and `expo start --clear` (stale cached bundle serves phantom
  errors — same lesson as POC 1).
- **The dev-client deep-link dialog can't be auto-tapped here.** Launch the installed build directly:
  `xcrun simctl launch com.moby.powersync` (bypasses the "Open in Moby PowerSync?" prompt).
- **Soft-delete, never hard-delete.** Set `deleted = 1` (tombstone); a hard `DELETE` in Postgres won't
  propagate down as a removal to clients that already synced the row (same delta-sync lesson as POC 1).
- **Media: the blob never syncs through PowerSync.** Only `media_type` + `storage_path` (synced columns)
  describe a photo; the bytes go straight to Supabase Storage via expo-file-system `File.upload()` (native
  streaming — RN `fetch` drops multi-MB iOS bodies, same as POC 1). The note→device-file-URI map is a row
  in the **local-only `local_media`** table (insert the `id` explicitly to match the note); the read query
  LEFT JOINs it so the photo shows instantly on the capturing device, while other devices fetch from the
  Storage public URL. `retryPendingUploads` (on reconnect + foreground) re-uploads photos captured offline.

## Run
`pnpm install && pnpm exec expo run:ios` — needs Supabase + PowerSync creds in `config.ts`, `powersync.sql`
run in Supabase, and the sync config deployed via the CLI.
