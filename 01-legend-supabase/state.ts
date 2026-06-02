// ──────────────────────────────────────────────────────────────────────────────
// The SYNC ENGINE for POC 1 — and the whole point of this POC.
//
// Compare this to ../../slice, where we hand-wrote an outbox + push/pull + a NestJS
// API. Here, ONE observable wired with `syncedSupabase` gives us:
//   • offline persistence (AsyncStorage)   • optimistic local writes
//   • automatic sync to Supabase           • realtime updates from other devices
// …with essentially no sync code of our own. That's the "feel" to show the client.
//
// Storage note: we persist with AsyncStorage because it works in Expo Go with zero
// native setup. It's slower than MMKV; production would swap to MMKV (one line) +
// a dev build. At POC scale the difference is imperceptible.
// ──────────────────────────────────────────────────────────────────────────────

import 'react-native-url-polyfill/auto'; // Supabase's client needs URL/fetch polyfills in RN
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import { observable } from '@legendapp/state';
import { configureSynced } from '@legendapp/state/sync';
import { observablePersistAsyncStorage } from '@legendapp/state/persist-plugins/async-storage';
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

export type Note = {
  id: string;
  text: string;
  created_at?: string | null;
  updated_at?: string | null;
  deleted?: boolean | null;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Bake the persistence PLUGIN + Supabase client + sync-field config into a reusable
// `customSynced`. The persist plugin MUST be configured here — registering it this way
// (not via configureSyncedSupabase) is what fixes the "Local persist is not configured" error.
const customSynced = configureSynced(syncedSupabase, {
  supabase,
  persist: { plugin: observablePersistAsyncStorage({ AsyncStorage }) }, // WHERE we cache offline
  generateId: () => Crypto.randomUUID(),          // client-generated UUIDs
  changesSince: 'last-sync',                       // delta sync, by updated_at
  fieldCreatedAt: 'created_at',
  fieldUpdatedAt: 'updated_at',
  fieldDeleted: 'deleted',                         // soft-delete tombstones sync too
});

// The ENTIRE `notes` table as one observable — offline-persisted + realtime-synced.
export const notes$ = observable(
  customSynced({
    collection: 'notes',                          // the Supabase table
    realtime: true,                               // subscribe to Realtime → other devices stream in
    persist: { name: 'notes', retrySync: true },  // cache key (deep-merged with the plugin above)
    retry: { infinite: true },                    // keep retrying failed syncs
  }),
);

// Add a note. We just write locally — Legend-State persists it offline and syncs it
// up when there's a connection. No manual push/pull, no outbox.
export function addNote(text: string) {
  const id = Crypto.randomUUID();
  // Stamp created_at locally so the note sorts correctly (newest-first) *immediately*,
  // before it syncs. The DB's handle_times trigger sets the authoritative value on the server.
  notes$[id].set({ id, text, created_at: new Date().toISOString() });
}

// Soft-delete (tombstone) — also syncs.
export function deleteNote(id: string) {
  notes$[id].deleted.set(true);
}
