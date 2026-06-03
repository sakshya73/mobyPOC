// All screen + card styles in one place, shared by App (the screen) and NoteCard (a card).
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  // ── Header (gradient) ───────────────────────────────────────────────────────
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, shadowColor: '#312e81', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  projIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.3, color: 'rgba(255,255,255,0.6)' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 },
  syncPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.16)' },
  syncText: { fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 8, marginTop: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.13)' },
  chipText: { fontSize: 11.5, fontWeight: '600', color: 'rgba(255,255,255,0.95)' },

  // ── Feed + card ─────────────────────────────────────────────────────────────
  list: { padding: 16, paddingBottom: 24, gap: 12, flexGrow: 1 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#eef2f7', shadowColor: '#0f172a', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800' },
  cardName: { fontSize: 13.5, fontWeight: '700', color: '#1e293b' },
  cardTime: { fontSize: 11.5, color: '#94a3b8', marginTop: 1 },
  uploadTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  uploadText: { fontSize: 11, fontWeight: '700', color: '#b45309' },
  cardText: { fontSize: 15.5, color: '#0f172a', lineHeight: 22, fontWeight: '500', marginTop: 12 },
  photo: { width: '100%', height: 190, borderRadius: 12, marginTop: 12, backgroundColor: '#e2e8f0' },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: '#c7d2fe' },
  audioLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#f1f5f9', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, marginTop: 12 },
  typeChipText: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  // ── Empty state ─────────────────────────────────────────────────────────────
  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16.5, fontWeight: '800', color: '#475569', marginTop: 4 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 44, lineHeight: 19 },

  // ── Input bar ───────────────────────────────────────────────────────────────
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 22, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#0f172a' },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
});
