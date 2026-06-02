import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  FlatList,
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
import { addNote, deleteNote, notes$, type Note } from './state';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Legend-State exposes the live sync state of an observable — we use it to drive the
// status pill (Synced / Syncing / Offline) truthfully, straight from the engine.
const state$ = syncState(notes$);

function relativeTime(iso?: string | null) {
  if (!iso) return 'syncing…';
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function App() {
  const [text, setText] = useState('');

  const notesMap = use$(notes$);
  const sync = use$(state$);

  const notes = Object.values(notesMap ?? {})
    .filter((n): n is Note => !!n && !n.deleted)
    .sort((a, b) => (b.created_at ?? '~').localeCompare(a.created_at ?? '~'));

  const status = sync?.error
    ? { label: 'Offline', color: '#f59e0b', icon: 'cloud-offline' as const }
    : sync?.isGetting || sync?.isSetting
      ? { label: 'Syncing…', color: '#bfdbfe', icon: 'sync' as const }
      : { label: 'Synced', color: '#86efac', icon: 'checkmark-circle' as const };

  const onAdd = () => {
    const body = text.trim();
    if (!body) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    addNote(body);
    setText('');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#4f46e5', '#2563eb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.eyebrow}>RESTORATION PROJECT</Text>
            <Text style={styles.title}>123 Main St — Water Damage</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name={status.icon} size={13} color={status.color} />
            <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.sub}>
          {notes.length} field note{notes.length === 1 ? '' : 's'} · offline-first · realtime
        </Text>
      </LinearGradient>

      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={42} color="#cbd5e1" />
            <Text style={styles.emptyText}>No field notes yet</Text>
            <Text style={styles.emptyHint}>Add one below — it works in airplane mode and syncs automatically.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const pending = !item.created_at;
          return (
            <Pressable onLongPress={() => deleteNote(item.id)} style={styles.card}>
              <View style={[styles.accent, { backgroundColor: pending ? '#f59e0b' : '#6366f1' }]} />
              <View style={styles.cardBody}>
                <Text style={styles.cardText}>{item.text}</Text>
                <View style={styles.cardMeta}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>SA</Text>
                  </View>
                  <Text style={styles.author}>Technician</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.time}>{relativeTime(item.created_at)}</Text>
                  <View style={{ flex: 1 }} />
                  <Ionicons
                    name={pending ? 'time-outline' : 'checkmark-done'}
                    size={16}
                    color={pending ? '#f59e0b' : '#22c55e'}
                  />
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Add a field note…"
            placeholderTextColor="#94a3b8"
            value={text}
            onChangeText={setText}
            onSubmitEditing={onAdd}
            returnKeyType="send"
          />
          <Pressable
            style={({ pressed }) => [styles.send, pressed && { opacity: 0.9, transform: [{ scale: 0.95 }] }]}
            onPress={onAdd}
          >
            <Ionicons name="arrow-up" size={22} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#1e1b4b',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: 'rgba(255,255,255,0.65)' },
  title: { fontSize: 19, fontWeight: '800', color: '#fff', marginTop: 3 },
  sub: { fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 12, fontWeight: '500' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  pillText: { fontSize: 12, fontWeight: '700' },

  list: { padding: 16, paddingBottom: 24, gap: 12, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eef2f7',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  accent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardText: { fontSize: 15.5, color: '#0f172a', lineHeight: 22, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 10, fontWeight: '800', color: '#4f46e5' },
  author: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  dot: { color: '#cbd5e1' },
  time: { fontSize: 12, color: '#94a3b8' },

  empty: { alignItems: 'center', paddingTop: 90, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 48 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#0f172a',
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
