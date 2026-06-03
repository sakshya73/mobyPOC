# POC 1 — Legend-State + Supabase

The lightest of the three: **offline-first + realtime in ~one wiring.**

## Stack
- **Expo** (React Native) + TypeScript
- **Supabase** — managed Postgres (the backend) + Realtime
- **Legend-State** (`@legendapp/state`) — state + sync via the `syncedSupabase` plugin
- **AsyncStorage** — local offline persistence
- **expo-crypto** — client-generated UUIDs
- **Supabase Storage** — photo blobs (all-Supabase; no S3/AWS)
- **expo-image-picker + expo-file-system + base64-arraybuffer** — capture a photo and upload its bytes
- **expo-linear-gradient + @expo/vector-icons** — UI polish (gradient header, icons); both Expo-Go compatible
- **Live sync pill** — driven by Legend-State's `syncState` → shows **Synced / Syncing / Offline** truthfully

> **Storage choice (AsyncStorage vs MMKV):** we persist offline with **AsyncStorage** because it
> works in **Expo Go** with zero native setup (keeps the POC lightweight). AsyncStorage is *slower*
> than **MMKV**; for production we'd swap to MMKV — a one-line change
> (`observablePersistMMKV()`) that requires a custom dev build. At POC scale the difference is
> imperceptible.

## What it demonstrates
Add a note **or photo** offline → it persists locally and shows instantly → syncs to Supabase when
online → appears live on other devices via Supabase Realtime. All optimistic, minimal sync code.

**Media is offline-first too:** the photo shows immediately from the local file; its bytes upload to
Supabase Storage on their own track, and only a tiny pointer (`storage_path`) syncs through the state
layer — never the blob. Voice capture is wired in `media.ts` (`addVoiceNote`) but **parked** for now.

## Setup
1. Create a free project at **supabase.com**.
2. In the SQL Editor, run **`supabase.sql`** (creates the `notes` table + enables Realtime),
   then **`supabase-storage.sql`** (creates the public `media` bucket + adds the `media_type` /
   `storage_path` columns).
3. Paste your **Project URL** + **publishable key** (Settings → API) into **`config.ts`**.
4. Install & run:
   ```bash
   pnpm install
   pnpm exec expo start
   ```

## How it works
- **`state.ts`** — one Legend-State observable wired with `syncedSupabase`. It persists locally,
  syncs to Supabase, and subscribes to Realtime — automatically.
- **`App.tsx`** — the list/add UI (copied from `../../slice`). The UI reads/writes the observable;
  it never talks to the network directly. *That* is what makes it offline-first.
- **`media.ts`** — the photo pipeline. Separates metadata (syncs via Legend-State) from the blob
  (uploaded to Supabase Storage). `localMedia$` maps note id → device file URI for instant display.

## Gotchas (hard-won — read before touching sync or media)
- **Never stamp `created_at` yourself.** Legend-State treats a row *with* `created_at` as
  already-existing → it issues an UPDATE (0 rows) instead of an INSERT, so the note **silently never
  syncs**. Let the DB set it. (New notes still sort newest-first via the `?? '~'` fallback.)
- **`File.arrayBuffer()` hangs in React Native.** Use the native `base64()` read + `base64-arraybuffer`
  `decode()` to get the bytes for upload.
- **Supabase Storage uploads from RN are flaky** ("fetch failed: cannot parse response") — `uploadFile`
  **retries with backoff** so a transient blip self-heals.
- **After adding/removing a native module, `expo start --clear`.** Plain HMR corrupts the bundle graph
  (a phantom `undefined is not a function` that survives every edit until a clean rebuild).

## Feel notes (fill in after building)
- Lines of sync code: _~_
- Setup effort: __
- Offline robustness: __
- Realtime: __
- Developer experience: __
