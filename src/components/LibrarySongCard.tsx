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
  onToggleCommunityRelease?: () => void;
  isCommunityReleaseUpdating?: boolean;
}

export function LibrarySongCard({
  song,
  onEdit,
  onLive,
  onDelete,
  onToggleCommunityRelease,
  isCommunityReleaseUpdating = false,
}: LibrarySongCardProps) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onEdit} style={({ pressed }) => [styles.summary, pressed && styles.pressed]}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.titleLine} numberOfLines={1} ellipsizeMode="tail">
              {song.title} • {song.artist}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{song.key}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1} ellipsizeMode="tail">
            {`${song.tuning} • Updated ${formatUpdatedAt(song.updatedAt)}`}
          </Text>
          {song.releasedToCommunity ? (
            <View style={styles.communityBadge}>
              <Text style={styles.communityBadgeText}>Community Live</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.actions}>
          <PrimaryButton label="Edit" onPress={onEdit} variant="ghost" />
          <PrimaryButton label="Perform" onPress={onLive} variant="secondary" />
          {onToggleCommunityRelease ? (
            <PrimaryButton
              label={
                isCommunityReleaseUpdating
                  ? 'Updating...'
                  : song.releasedToCommunity
                    ? 'Unrelease'
                    : 'Release'
              }
              onPress={onToggleCommunityRelease}
              variant="ghost"
              disabled={isCommunityReleaseUpdating}
            />
          ) : null}
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
    justifyContent: 'center',
  },
  titleLine: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
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
  communityBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#dbeafe',
  },
  communityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: '#1e40af',
  },
  footer: {
    gap: 12,
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
