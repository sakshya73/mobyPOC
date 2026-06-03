import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  LogBox,
  Platform,
  Pressable,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { PowerSyncContext, useQuery, useStatus } from '@powersync/react-native';
import { addNote, connectPowerSync, db, deleteNote, type Note } from './state';
import { addPhotoNote, mediaPublicUrl, retryPendingUploads } from './media';
import { NoteCard } from './NoteCard';
import { voiceComingSoon } from './ui';
import { styles } from './styles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// PowerSync closes its idle sync WebSocket after ~30s offline and reconnects — expected behaviour, not
// a failure. Silence the dev-only LogBox red screen so it doesn't look like a crash during the demo.
LogBox.ignoreLogs(['No data received on WebSocket']);

// Photo is wired (image button → picker → Supabase Storage). Voice stays parked behind voiceComingSoon.
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

function Screen() {
  const [text, setText] = useState('');

  // Live query over LOCAL SQLite — re-renders on ANY change, whether a local write or a row streamed
  // in from the PowerSync service. The UI never touches the network. (Compare to POC 1's use$(notes$).)
  // LEFT JOIN the local-only local_media table so each note carries its on-device file URI (if any).
  // The query watches BOTH tables, so the photo appears the instant createPhotoNote inserts the URI.
  const { data: notes = [] } = useQuery<Note>(
    `SELECT n.*, m.uri AS local_uri
     FROM notes n
     LEFT JOIN local_media m ON m.id = n.id
     WHERE n.deleted = 0 OR n.deleted IS NULL
     ORDER BY replace(n.created_at, 'T', ' ') DESC, n.id DESC`,
  );
  const status = useStatus();

  // Per-note sync state: a note stays "pending" until its local write leaves PowerSync's upload queue
  // (i.e. has actually been uploaded). Read-only peek at the CRUD queue; refresh when notes/status change.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const batch = await db.getCrudBatch(1000);
      const ids = new Set((batch?.crud ?? []).filter((e) => e.table === 'notes').map((e) => e.id));
      if (!cancelled) setPendingIds(ids);
    })();
    return () => {
      cancelled = true;
    };
  }, [notes, status]);

  // Re-upload anything captured offline: once we reconnect, and whenever the app returns to foreground.
  useEffect(() => {
    if (status.connected) void retryPendingUploads();
  }, [status.connected]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void retryPendingUploads();
    });
    return () => sub.remove();
  }, []);

  // Header pill, driven by PowerSync's live sync status.
  const flow = status.dataFlowStatus;
  const pill =
    !status.connected || flow?.downloadError
      ? { label: 'Offline', color: '#fbbf24', icon: 'cloud-offline' as const }
      : flow?.uploading || flow?.downloading
        ? { label: 'Syncing', color: '#bfdbfe', icon: 'sync' as const }
        : { label: 'Synced', color: '#86efac', icon: 'checkmark-circle' as const };

  const onAdd = () => {
    const body = text.trim();
    if (!body) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void addNote(body);
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
            <Text style={styles.eyebrow}>RESTORATION · POWERSYNC</Text>
            <Text style={styles.title}>123 Main St — Water Damage</Text>
          </View>
          <View style={styles.syncPill}>
            <Ionicons name={pill.icon} size={13} color={pill.color} />
            <Text style={[styles.syncText, { color: pill.color }]}>{pill.label}</Text>
          </View>
        </View>
        <View style={styles.chips}>
          <View style={styles.chip}>
            <PulsingDot />
            <Text style={styles.chipText}>Live</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="server-outline" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={styles.chipText}>Local SQLite</Text>
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
            <Text style={styles.emptyHint}>Add a note below — it's written to local SQLite and synced by PowerSync.</Text>
          </View>
        }
        renderItem={({ item }) => {
          // Show the local file immediately on this device; other devices fetch from the Storage URL.
          // "Uploading" = a photo whose blob hasn't landed in Storage yet (storage_path still null).
          const uploading = item.media_type === 'photo' && !item.storage_path;
          const mediaUri = item.local_uri ?? (item.storage_path ? mediaPublicUrl(item.storage_path) : undefined);
          return (
            <NoteCard
              item={item}
              mediaUri={mediaUri}
              uploading={uploading}
              pending={pendingIds.has(item.id)}
              onDelete={() => void deleteNote(item.id)}
            />
          );
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            {/* Photo is active → filled brand-indigo icon. Mic is parked → muted/disabled-looking. */}
            <Pressable onPress={onPhoto} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.5 }}>
              <Ionicons name="image" size={22} color="#6366f1" />
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

export default function App() {
  // Start syncing once, then provide `db` to useQuery/useStatus throughout the tree.
  useEffect(() => {
    connectPowerSync();
  }, []);
  return (
    <PowerSyncContext.Provider value={db}>
      <Screen />
    </PowerSyncContext.Provider>
  );
}
