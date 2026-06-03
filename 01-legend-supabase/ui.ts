// Small, pure UI helpers shared between App (the screen) and NoteCard (a card).
// No state, no side effects — just formatting + a couple of constants.
import { Alert } from 'react-native';

// Deterministic [background, foreground] avatar color from a string, so each note's avatar is
// stable across renders but varied across notes.
const AVATAR_COLORS: [string, string][] = [
  ['#e0e7ff', '#4f46e5'],
  ['#fae8ff', '#a21caf'],
  ['#dcfce7', '#15803d'],
  ['#ffedd5', '#c2410c'],
  ['#cffafe', '#0e7490'],
];
export function avatarColor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// "12m ago" style relative time. A missing timestamp (not yet synced) reads as "just now".
export function relativeTime(iso?: string | null) {
  if (!iso) return 'just now';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

// Static bar heights for the (decorative) voice waveform.
export const WAVE = [9, 15, 11, 18, 13, 7, 16, 12, 19, 10, 14, 8];

// Voice is parked for now (expo-audio needs a dev build to be demo-stable).
export const voiceComingSoon = () =>
  Alert.alert(
    'Voice coming soon',
    'We’re focusing on photo + text + offline sync first. Voice capture is being wired up separately.',
  );
