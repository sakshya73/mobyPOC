// ──────────────────────────────────────────────────────────────────────────────
// MEDIA pipeline for POC 1 — photo + voice, offline-first, ALL-SUPABASE.
//
// The principle (same as the interview answer): never sync the blob through the
// state layer. Only the METADATA (media_type, storage_path) syncs via Legend-State;
// the binary file goes to Supabase Storage on its own track.
// ──────────────────────────────────────────────────────────────────────────────
import { decode } from 'base64-arraybuffer';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { observable } from '@legendapp/state';
import { notes$, supabase } from './state';

const BUCKET = 'media';

// Local-only map: note id → device file URI. In-memory (not synced — a device file path is
// meaningless on another device). Lets us show the photo INSTANTLY on the capturing device;
// after upload, every device displays from the Supabase public URL instead.
export const localMedia$ = observable<Record<string, string>>({});

export function mediaPublicUrl(storagePath: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// Read the local file's bytes and upload them to Supabase Storage.
// IMPORTANT: File.arrayBuffer() hangs in React Native (upload sticks on "Uploading" forever),
// so we use the native base64() read + base64-arraybuffer decode — the proven RN pattern that
// successfully uploaded our first clip. `as any` because base64() is a native method that the
// expo-file-system TypeScript types omit (only arrayBuffer() is typed, and it's the broken one).
async function uploadFile(localUri: string, storagePath: string, contentType: string) {
  const bytes = decode(await (new File(localUri) as any).base64());
  // Supabase Storage uploads from RN occasionally fail transiently ("fetch failed: cannot parse
  // response"). Retry a few times with backoff so a network blip self-heals instead of leaving
  // the card stuck on "Uploading".
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType, upsert: true });
    if (!error) return;
    lastError = error;
    console.log(`[media] upload attempt ${attempt} failed, retrying…`, (error as any)?.message);
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
