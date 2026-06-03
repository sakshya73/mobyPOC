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
  Platform,
  Pressable,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { syncState } from '@legendapp/state';
import { use$ } from '@legendapp/state/react';
import { addNote, deleteNote, localOrder$, notes$, type Note } from './state';
import { addPhotoNote, localMedia$, mediaPublicUrl, retryPendingUploads } from './media';
import { NoteCard } from './NoteCard';
import { voiceComingSoon } from './ui';
import { styles } from './styles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Live sync status of the notes observable: { isGetting, isSetting, error, ... }.
const state$ = syncState(notes$);

// A softly pulsing dot for the "Live" (realtime) indicator in the header.
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

export default function App() {
  const [text, setText] = useState('');

  // use$ subscribes the component to these observables — the UI re-renders on ANY change to them,
  // whether it came from a local write, a Realtime push from another device, or an offline catch-up.
  const notesMap = use$(notes$);
  const localMap = use$(localMedia$);
  const orderMap = use$(localOrder$);
  const sync = use$(state$);

  // Push pending media blobs on mount and whenever the app returns to the foreground.
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

  // The header pill, driven purely by Legend-State's live sync status.
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
          // Derive the display state, then hand it to the (dumb) card.
          const local = localMap?.[item.id];
          const mediaUri = local ?? (item.storage_path ? mediaPublicUrl(item.storage_path) : undefined);
          const uploading = !!item.media_type && !item.storage_path;
          // "Syncing" until the server confirms the row (it sets created_at). Show it while offline
          // or mid-pull so an offline note reads Syncing immediately on reopen; a fresh online write
          // shows Synced optimistically.
          const pending = !item.created_at && (!!sync?.error || !!sync?.isGetting);
          return (
            <NoteCard
              item={item}
              mediaUri={mediaUri}
              uploading={uploading}
              pending={pending}
              onDelete={() => deleteNote(item.id)}
            />
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
