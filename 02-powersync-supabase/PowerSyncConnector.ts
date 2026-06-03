// Backend connector — the bridge between the PowerSync client and Supabase.
// Adapted from PowerSync's generated Supabase template for React Native + this no-login POC:
//   • @powersync/web → @powersync/react-native
//   • import.meta.env (Vite) → ./config
//   • email/password login → a PowerSync DEVELOPMENT TOKEN (no auth in this POC)
// The robust FATAL_RESPONSE_CODES handling from the template is kept.
import { UpdateType } from '@powersync/react-native';
import type {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from '@powersync/react-native';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, POWERSYNC_URL, POWERSYNC_TOKEN } from './config';

// One Supabase client, shared by uploadData (writes) and media.ts (Storage). No auth session is
// created, so PostgREST treats writes as the `anon` role — exactly what POC 1's RLS policies allow.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Postgres error codes we cannot recover from by retrying: data exception (22xxx), integrity
// constraint violation (23xxx), and RLS denial (42501). On these we discard the op instead of
// blocking the upload queue forever.
const FATAL_RESPONSE_CODES = [/^22...$/, /^23...$/, /^42501$/];

export const connector: PowerSyncBackendConnector = {
  // No login screen → a PowerSync development token (the dashboard generates it; it EXPIRES).
  // Production swap: sign the user in (even anonymously) and return `session.access_token` here,
  // with "Use Supabase Auth" enabled on the PowerSync instance.
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    return { endpoint: POWERSYNC_URL, token: POWERSYNC_TOKEN };
  },

  // Push each locally-queued write up to Supabase. `transaction.complete()` is MANDATORY — without
  // it `getNextCrudTransaction()` returns the same transaction forever and the queue stalls.
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastOp: CrudEntry | null = null;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const data: Record<string, any> = { ...op.opData };
        if ('deleted' in data) data.deleted = !!data.deleted; // SQLite 0/1 → Postgres boolean

        const table = supabase.from(op.table);
        let result: { error: any };
        if (op.op === UpdateType.PUT) result = await table.upsert({ ...data, id: op.id });
        else if (op.op === UpdateType.PATCH) result = await table.update(data).eq('id', op.id);
        else result = await table.delete().eq('id', op.id);

        if (result.error) throw result.error;
      }
      await transaction.complete();
    } catch (ex: any) {
      if (typeof ex.code === 'string' && FATAL_RESPONSE_CODES.some((re) => re.test(ex.code))) {
        // Permanent error (bad data / constraint / RLS) → discard so the queue can advance.
        console.error('[powersync] fatal upload error — discarding transaction:', lastOp, ex);
        await transaction.complete();
      } else {
        // Transient (network / 5xx) → throw so PowerSync retries with backoff.
        throw ex;
      }
    }
  },
};
