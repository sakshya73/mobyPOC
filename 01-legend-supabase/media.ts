// ──────────────────────────────────────────────────────────────────────────────
// MEDIA pipeline for POC 1 — photo + voice, offline-first, ALL-SUPABASE.
//
// The principle (same as the interview answer): never sync the blob through the
// state layer. Only the METADATA (media_type, storage_path) syncs via Legend-State;
// the binary file goes to Supabase Storage on its own track.
// ──────────────────────────────────────────────────────────────────────────────
import { File, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { observable } from '@legendapp/state';
import { notes$, supabase } from './state';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

const BUCKET = 'media';

// Local-only map: note id → device file URI. In-memory (not synced — a device file path is
// meaningless on another device). Lets us show the photo INSTANTLY on the capturing device;
// after upload, every device displays from the Supabase public URL instead.
export const localMedia$ = observable<Record<string, string>>({});

export function mediaPublicUrl(storagePath: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// Upload the file to Supabase Storage by STREAMING it natively (expo-file-system's File.upload
// posts the bytes straight from disk via the OS networking stack — NSURLSession on iOS).
//
// Why not supabase-js / fetch? RN's fetch loads the whole image into a JS ArrayBuffer and POSTs it
// in one shot; iOS drops multi-MB bodies mid-flight with "The network connection was lost", so the
// blob never lands and the card sticks on "Uploading". The native streamed upload doesn't have that
// failure mode. We hit Storage's REST endpoint directly with the anon key (RLS authorises it) —
// verified returning HTTP 200 against this bucket.
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

// Create a media note: remember the local file (instant display), sync the metadata,
// then upload the blob in the background and record its storage_path (which also syncs).
async function createMediaNote(localUri: string, type: 'photo' | 'audio', ext: string, contentType: string) {
  const id = Crypto.randomUUID();
  localMedia$[id].set(localUri); // instant, offline-capable display
  // No created_at — let Legend-State INSERT it and the DB trigger set the timestamp. Stamping it
  // here would make the sync issue an UPDATE (0 rows) instead of an INSERT (see addNote in state.ts).
  notes$[id].set({ id, text: '', media_type: type });
  try {
    const path = `${id}.${ext}`;
    await uploadFile(localUri, path, contentType);
    notes$[id].storage_path.set(path); // upload done → the pointer syncs to other devices
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
  await createMediaNote(res.assets[0].uri, 'photo', 'jpg', 'image/jpeg');
}

// Called from the screen after expo-audio recording stops (it hands us the file URI).
export async function addVoiceNote(localUri: string) {
  await createMediaNote(localUri, 'audio', 'm4a', 'audio/m4a');
}

// Re-upload anything captured offline (has media_type but no storage_path yet).
// Call this on reconnect / app-foreground.
export async function retryPendingUploads() {
  const notes = notes$.get() ?? {};
  const local = localMedia$.get() ?? {};
  for (const id of Object.keys(notes)) {
    const n = notes[id];
    if (n?.media_type && !n.storage_path && local[id]) {
      const ext = n.media_type === 'photo' ? 'jpg' : 'm4a';
      const ct = n.media_type === 'photo' ? 'image/jpeg' : 'audio/m4a';
      try {
        await uploadFile(local[id], `${id}.${ext}`, ct);
        notes$[id].storage_path.set(`${id}.${ext}`);
      } catch {
        /* still offline — try again next time */
      }
    }
  }
}
