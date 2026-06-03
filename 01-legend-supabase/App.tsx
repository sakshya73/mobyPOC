import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { syncState } from '@legendapp/state';
import { use$ } from '@legendapp/state/react';
import { addNote, deleteNote, localOrder$, notes$, type Note } from './state';
import { addPhotoNote, localMedia$, mediaPublicUrl, retryPendingUploads } from './media';

// Voice capture is parked for now (the expo-audio integration is being sorted out separately).
// Focus: photo + text + offline sync. The mic button is a gentle "coming soon" stub.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const state$ = syncState(notes$);

const AVATAR_COLORS: [string, string][] = [
  ['#e0e7ff', '#4f46e5'],
  ['#fae8ff', '#a21caf'],
  ['#dcfce7', '#15803d'],
  ['#ffedd5', '#c2410c'],
  ['#cffafe', '#0e7490'],
];
function avatarColor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function relativeTime(iso?: string | null) {
  if (!iso) return 'just now';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function PulsingDot({ color = '#4ade80' }: { color?: string }) {
  const a = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.35, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity: a }} />;
}

const WAVE = [9, 15, 11, 18, 13, 7, 16, 12, 19, 10, 14, 8];

const voiceComingSoon = () =>
  Alert.alert('Voice coming soon', 'We’re focusing on photo + text + offline sync first. Voice capture is being wired up separately.');

export default function App() {
  const [text, setText] = useState('');

  const notesMap = use$(notes$);
  const localMap = use$(localMedia$);
  const orderMap = use$(localOrder$);
  const sync = use$(state$);

  useEffect(() => {
    retryPendingUploads();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') retryPendingUploads();
    });
    return () => sub.remove();
  }, []);

  // Reconnect → flush any pending blob uploads. sync.error clears the moment we're back online,
  // even if the app stayed in the foreground the whole time (AppState wouldn't fire then).
  useEffect(() => {
    if (!sync?.error) retryPendingUploads();
  }, [sync?.error]);

  // Sort newest-first. A synced note ranks by its server created_at; a brand-new/offline note has
  // none yet, so it ranks above everything via its local order counter (newest local addition first).
  const PENDING_RANK = 1e15; // larger than any epoch-ms timestamp → un-synced notes float to the top
  const rank = (n: Note) => (n.created_at ? new Date(n.created_at).getTime() : PENDING_RANK + (orderMap?.[n.id] ?? 0));
  const notes = Object.values(notesMap ?? {})
    .filter((n): n is Note => !!n && !n.deleted)
    .sort((a, b) => rank(b) - rank(a));

  const status = sync?.error
    ? { label: 'Offline', color: '#fbbf24', icon: 'cloud-offline' as const }
    : sync?.isGetting || sync?.isSetting
      ? { label: 'Syncing', color: '#bfdbfe', icon: 'sync' as const }
      : { label: 'Synced', color: '#86efac', icon: 'checkmark-circle' as const };

  const onAdd = () => {
    const body = text.trim();
    if (!body) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    addNote(body);
    setText('');
  };

  const onPhoto = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void addPhotoNote();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient colors={['#7c3aed', '#4338ca', '#1d4ed8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.projIcon}>
            <Ionicons name="water" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.eyebrow}>RESTORATION PROJECT</Text>
            <Text style={styles.title}>123 Main St — Water Damage</Text>
          </View>
          <View style={styles.syncPill}>
            <Ionicons name={status.icon} size={13} color={status.color} />
            <Text style={[styles.syncText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <View style={styles.chips}>
          <View style={styles.chip}>
            <PulsingDot />
            <Text style={styles.chipText}>Live</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="cloud-offline-outline" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.chipText}>Offline-ready</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="albums-outline" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.chipText}>
              {notes.length} note{notes.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyCircle}>
              <Ionicons name="clipboard-outline" size={34} color="#818cf8" />
            </View>
            <Text style={styles.emptyTitle}>No field notes yet</Text>
            <Text style={styles.emptyHint}>Add a note or photo below — it all works offline and syncs automatically.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const [bg, fg] = avatarColor(item.id);
          const local = localMap?.[item.id];
          const mediaUri = local ?? (item.storage_path ? mediaPublicUrl(item.storage_path) : undefined);
          const uploading = !!item.media_type && !item.storage_path;
          // "Syncing" = the server hasn't confirmed this row yet (it sets created_at). Show it while
          // offline (sync.error) or during a pull (isGetting), so an offline note reads "Syncing" the
          // instant the app reopens — but a fresh ONLINE write shows "Synced" optimistically (no lag).
          const pending = !item.created_at && (!!sync?.error || !!sync?.isGetting);
          const typeLabel = item.media_type === 'photo' ? 'Photo' : item.media_type === 'audio' ? 'Voice' : 'Note';
          const typeIcon =
            item.media_type === 'photo' ? 'image-outline' : item.media_type === 'audio' ? 'mic-outline' : 'document-text-outline';

          return (
            <Pressable
              onLongPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                deleteNote(item.id);
              }}
              style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.99 }] }]}
            >
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: bg }]}>
                  <Text style={[styles.avatarText, { color: fg }]}>SA</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardName}>Technician</Text>
                  <Text style={styles.cardTime}>{relativeTime(item.created_at)}</Text>
                </View>
                {uploading ? (
                  <View style={styles.uploadTag}>
                    <Ionicons name="cloud-upload-outline" size={12} color="#b45309" />
                    <Text style={styles.uploadText}>Uploading</Text>
                  </View>
                ) : pending ? (
                  <View style={styles.uploadTag}>
                    <Ionicons name="time-outline" size={12} color="#b45309" />
                    <Text style={styles.uploadText}>Syncing</Text>
                  </View>
                ) : (
                  <Ionicons name="checkmark-done" size={18} color="#22c55e" />
                )}
              </View>

              {item.media_type === 'photo' && mediaUri ? (
                <Image source={{ uri: mediaUri }} style={styles.photo} />
              ) : item.media_type === 'audio' ? (
                <Pressable onPress={voiceComingSoon} style={styles.audioRow}>
                  <View style={styles.playBtn}>
                    <Ionicons name="play" size={15} color="#fff" />
                  </View>
                  <View style={styles.wave}>
                    {WAVE.map((h, i) => (
                      <View key={i} style={[styles.waveBar, { height: h }]} />
                    ))}
                  </View>
                  <Text style={styles.audioLabel}>Voice note</Text>
                </Pressable>
              ) : item.text ? (
                <Text style={styles.cardText}>{item.text}</Text>
              ) : null}

              <View style={styles.typeChip}>
                <Ionicons name={typeIcon} size={12} color="#64748b" />
                <Text style={styles.typeChipText}>{typeLabel}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <Pressable onPress={onPhoto} hitSlop={8}>
              <Ionicons name="image-outline" size={22} color="#6366f1" />
            </Pressable>
            <Pressable onPress={voiceComingSoon} hitSlop={8}>
              <Ionicons name="mic-outline" size={22} color="#cbd5e1" />
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="Add a field note…"
              placeholderTextColor="#94a3b8"
              value={text}
              onChangeText={setText}
              onSubmitEditing={onAdd}
              returnKeyType="send"
            />
          </View>
          <Pressable onPress={onAdd} style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.94 }] }]}>
            <LinearGradient colors={['#6366f1', '#2563eb']} style={styles.send}>
              <Ionicons name="arrow-up" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

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

  empty: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyCircle: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16.5, fontWeight: '800', color: '#475569', marginTop: 4 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 44, lineHeight: 19 },

  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 22, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f1f5f9', borderRadius: 14, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#0f172a' },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
});
