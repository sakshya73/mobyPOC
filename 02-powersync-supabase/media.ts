// ──────────────────────────────────────────────────────────────────────────────
// MEDIA pipeline for POC 2 — photo, offline-first, ALL-SUPABASE.
//
// Same principle as POC 1: never sync the blob through the sync engine. Only the METADATA
// (media_type, storage_path) lives in the synced `notes` table; the binary file goes to Supabase
// Storage on its own track. What differs from POC 1 is WHERE the local file URI is remembered:
// here it's a row in the local-only `local_media` SQLite table (PowerSync's equivalent of POC 1's
// persisted localMedia$ observable) — on-device, never synced, because a device path is meaningless
// elsewhere. Persisting it is what makes OFFLINE capture work: a photo taken with no signal survives
// a restart and uploads when the connection returns.
// ──────────────────────────────────────────────────────────────────────────────
import { File, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { db, supabase } from './state';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

const BUCKET = 'media';
let retrying = false; // single-flight guard so overlapping triggers don't re-upload the same blob

export function mediaPublicUrl(storagePath: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// Upload the file to Supabase Storage by STREAMING it natively (expo-file-system's File.upload posts
// the bytes straight from disk via the OS networking stack — NSURLSession on iOS).
//
// Why not supabase-js / fetch? RN's fetch loads the whole image into a JS ArrayBuffer and POSTs it in
// one shot; iOS drops multi-MB bodies mid-flight with "The network connection was lost", so the blob
// never lands and the card sticks on "Uploading". The native streamed upload doesn't have that failure
// mode. We hit Storage's REST endpoint directly with the anon key (RLS authorises it). Identical to
// POC 1 — the sync engine changed, the media track did not.
async function uploadFile(localUri: string, storagePath: string, contentType: string) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await new File(localUri).upload(url, {
        httpMethod: 'POST',
        uploadType: UploadType.BINARY_CONTENT,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
      });
      if (res.status >= 200 && res.status < 300) return;
      lastError = new Error(`Supabase Storage HTTP ${res.status}: ${(res.body || '').slice(0, 200)}`);
    } catch (e) {
      lastError = e;
    }
    console.log(`[media] upload attempt ${attempt} failed, retrying…`, (lastError as any)?.message);
    await new Promise((r) => setTimeout(r, attempt * 700));
  }
  throw lastError;
}

// Create a photo note. Two LOCAL writes first (both instant + offline-capable): the synced `notes`
// row, and the `local_media` row mapping note id → device file URI (shows the photo immediately and
// survives restarts). Then upload the blob in the background and record storage_path — that UPDATE
// syncs the pointer so other devices can fetch the image from Storage.
async function createPhotoNote(localUri: string) {
  const id = Crypto.randomUUID();
  await db.execute("INSERT INTO notes (id, text, media_type, created_at) VALUES (?, '', 'photo', datetime('now'))", [id]);
  await db.execute('INSERT INTO local_media (id, uri) VALUES (?, ?)', [id, localUri]);
  try {
    const path = `${id}.jpg`;
    await uploadFile(localUri, path, 'image/jpeg');
    await db.execute("UPDATE notes SET storage_path = ?, updated_at = datetime('now') WHERE id = ?", [path, id]);
  } catch (e) {
    console.log('[media] upload failed; will retry on reconnect', e);
  }
}

export async function addPhotoNote() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return;
  // mediaTypes is an array of strings in SDK 56. (On a real device, swap to launchCameraAsync.)
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
  if (res.canceled) return;
  await createPhotoNote(res.assets[0].uri);
}

// Re-upload anything captured offline: photo notes that have a local file but no storage_path yet.
// Call on reconnect / app-foreground. The JOIN onto the local-only table gives us the device URI.
export async function retryPendingUploads() {
  if (retrying) return; // the interval + reconnect + foreground triggers can fire together
  retrying = true;
  try {
    const rows = await db.getAll<{ id: string; uri: string }>(
      "SELECT n.id AS id, m.uri AS uri FROM notes n JOIN local_media m ON m.id = n.id WHERE n.media_type = 'photo' AND n.storage_path IS NULL",
    );
    for (const r of rows) {
      try {
        const path = `${r.id}.jpg`;
        await uploadFile(r.uri, path, 'image/jpeg');
        await db.execute("UPDATE notes SET storage_path = ?, updated_at = datetime('now') WHERE id = ?", [path, r.id]);
      } catch {
        /* still offline — try again next time */
      }
    }
  } finally {
    retrying = false;
  }
}
