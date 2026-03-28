import { Pressable, StyleSheet, Text, View } from 'react-native';

import { palette } from '../constants/colors';
import { Song } from '../types/models';
import { formatUpdatedAt } from '../utils/date';
import { PrimaryButton } from './PrimaryButton';

interface LibrarySongCardProps {
  song: Song;
  onEdit: () => void;
  onLive: () => void;
  onDelete: () => void;
}

export function LibrarySongCard({
  song,
  onEdit,
  onLive,
  onDelete,
}: LibrarySongCardProps) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onEdit} style={({ pressed }) => [styles.summary, pressed && styles.pressed]}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{song.title}</Text>
            <Text style={styles.artist}>{song.artist}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{song.key}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{song.tuning}</Text>
        </View>
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.updated}>Updated {formatUpdatedAt(song.updatedAt)}</Text>
        <View style={styles.actions}>
          <PrimaryButton label="Edit" onPress={onEdit} variant="ghost" />
          <PrimaryButton label="Perform" onPress={onLive} variant="secondary" />
          <PrimaryButton label="Bin Song" onPress={onDelete} variant="danger" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 14,
  },
  summary: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  artist: {
    fontSize: 16,
    color: palette.textMuted,
  },
  badge: {
    minWidth: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.primary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaText: {
    fontSize: 15,
    color: palette.textMuted,
  },
  footer: {
    gap: 12,
  },
  updated: {
    fontSize: 14,
    color: palette.textMuted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pressed: {
    opacity: 0.85,
  },
});
