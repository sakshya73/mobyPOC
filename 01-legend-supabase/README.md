# POC 1 — Legend-State + Supabase

The lightest of the three: **offline-first + realtime in ~one wiring.**

## Stack
- **Expo** (React Native) + TypeScript
- **Supabase** — managed Postgres (the backend) + Realtime
- **Legend-State** (`@legendapp/state`) — state + sync via the `syncedSupabase` plugin
- **AsyncStorage** — local offline persistence
- **expo-crypto** — client-generated UUIDs
- **expo-linear-gradient + @expo/vector-icons** — UI polish (gradient header, icons); both Expo-Go compatible
- **Live sync pill** — driven by Legend-State's `syncState` → shows **Synced / Syncing / Offline** truthfully

> **Storage choice (AsyncStorage vs MMKV):** we persist offline with **AsyncStorage** because it
> works in **Expo Go** with zero native setup (keeps the POC lightweight). AsyncStorage is *slower*
> than **MMKV**; for production we'd swap to MMKV — a one-line change
> (`observablePersistMMKV()`) that requires a custom dev build. At POC scale the difference is
> imperceptible.

## What it demonstrates
Add a note offline → it persists locally and shows instantly → syncs to Supabase when online →
appears live on other devices via Supabase Realtime. All optimistic, minimal sync code.

## Setup
1. Create a free project at **supabase.com**.
2. In the SQL Editor, run **`supabase.sql`** (creates the `notes` table + enables Realtime).
3. Paste your **Project URL** + **anon key** (Settings → API) into **`config.ts`**.
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

## Feel notes (fill in after building)
- Lines of sync code: _~_
- Setup effort: __
- Offline robustness: __
- Realtime: __
- Developer experience: __
