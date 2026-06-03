// ──────────────────────────────────────────────────────────────────────────────
// The SYNC ENGINE for POC 2 — PowerSync.
//
// Compare to POC 1 (Legend-State): there the UI read an observable and Supabase Realtime pushed
// changes straight from Postgres. Here the app reads a LOCAL SQLite database; the PowerSync Service
// streams rows into it, and our connector uploads local writes back to Supabase. The UI queries
// SQLite via `useQuery` and never touches the network — that's what makes it offline-first.
// ──────────────────────────────────────────────────────────────────────────────
import { PowerSyncDatabase, Schema, Table, column, createBaseLogger, LogLevel } from '@powersync/react-native';
import { OPSqliteOpenFactory } from '@powersync/op-sqlite';
import { connector, supabase } from './PowerSyncConnector';

export { supabase }; // re-export from one place (media.ts imports the Supabase client from here)

// PowerSync logging in the Metro console. WARN surfaces real sync issues without DEBUG's spam —
// set LogLevel.DEBUG temporarily when diagnosing connection/sync problems.
const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.WARN);

// 1) Local SQLite schema. NEVER declare `id` — PowerSync adds it automatically (TEXT primary key).
//    Booleans are stored as 0/1 (column.integer); dates as ISO strings (column.text).
const notes = new Table({
  text: column.text,
  media_type: column.text,
  storage_path: column.text,
  created_at: column.text,
  updated_at: column.text,
  deleted: column.integer,
});
// Local-only: note id → device file URI. `localOnly` tables persist on-device but are NEVER synced
// (a device path is meaningless elsewhere) — the PowerSync equivalent of POC 1's persisted localMedia$.
const local_media = new Table({ uri: column.text }, { localOnly: true });

export const AppSchema = new Schema({ notes, local_media });
export type Note = {
  id: string;
  text?: string | null;
  media_type?: 'photo' | 'audio' | null;
  storage_path?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted?: number | null; // 0 | 1
  local_uri?: string | null; // NOT a notes column — joined in from the local-only local_media table
};

// 2) The on-device PowerSync database (SQLite via @powersync/op-sqlite). We name the OPSqliteOpenFactory
// explicitly — the SDK's auto-detect uses a dynamic require that Metro doesn't bundle, so it otherwise
// falls back to react-native-quick-sqlite (not installed) and crashes with "Could not resolve …".
export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: new OPSqliteOpenFactory({ dbFilename: 'moby.db' }),
});

// 3) Start syncing. connect() is fire-and-forget — the backend connector lives in PowerSyncConnector.ts.
export function connectPowerSync() {
  db.connect(connector);
}

// Writes go through db.execute so PowerSync tracks them and queues the upload. `uuid()` and
// `datetime('now')` are built-in SQLite functions. created_at is set locally so the note sorts
// newest-first immediately (no Legend-State "insert vs update" gotcha here — PowerSync tracks ops).
export async function addNote(text: string) {
  await db.execute("INSERT INTO notes (id, text, created_at) VALUES (uuid(), ?, datetime('now'))", [text]);
}
export async function deleteNote(id: string) {
  await db.execute("UPDATE notes SET deleted = 1, updated_at = datetime('now') WHERE id = ?", [id]);
}
