import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { PowerSyncContext, useQuery, useStatus } from '@powersync/react-native';
import { addNote, connectPowerSync, db, deleteNote, type Note } from './state';
import { NoteCard } from './NoteCard';
import { voiceComingSoon } from './ui';
import { styles } from './styles';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Media (photo/voice) is wired in a later step — buttons are stubs for now.
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
  const { data: notes = [] } = useQuery<Note>(
    'SELECT * FROM notes WHERE deleted = 0 OR deleted IS NULL ORDER BY created_at DESC, id DESC',
  );
  const status = useStatus();

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
        renderItem={({ item }) => (
          <NoteCard item={item} uploading={false} pending={false} onDelete={() => void deleteNote(item.id)} />
        )}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <Pressable onPress={voiceComingSoon} hitSlop={8}>
              <Ionicons name="image-outline" size={22} color="#cbd5e1" />
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
