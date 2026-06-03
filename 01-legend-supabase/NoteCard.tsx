import { Ionicons } from '@expo/vector-icons';
import { Image, LayoutAnimation, Pressable, Text, View } from 'react-native';
import type { Note } from './state';
import { avatarColor, relativeTime, voiceComingSoon, WAVE } from './ui';
import { styles } from './styles';

type Props = {
  item: Note;
  mediaUri?: string; // local file URI (capturing device) or Supabase public URL (everyone else)
  uploading: boolean; // media blob not yet in Storage
  pending: boolean; // row not yet confirmed by the server
  onDelete: () => void;
};

// One feed card: avatar + author + time, the sync/upload status, the body (photo / voice / text),
// and a type chip. Long-press to (soft-)delete. Purely presentational — every value comes via props,
// so it has no idea Legend-State or Supabase exist. That separation is what keeps the sync logic
// (state.ts / media.ts) testable and the UI dumb.
export function NoteCard({ item, mediaUri, uploading, pending, onDelete }: Props) {
  const [bg, fg] = avatarColor(item.id);
  const typeLabel = item.media_type === 'photo' ? 'Photo' : item.media_type === 'audio' ? 'Voice' : 'Note';
  const typeIcon =
    item.media_type === 'photo' ? 'image-outline' : item.media_type === 'audio' ? 'mic-outline' : 'document-text-outline';

  return (
    <Pressable
      onLongPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onDelete();
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
}
