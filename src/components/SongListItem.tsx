import { GestureResponderEvent, Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useState } from 'react';

import { palette } from '../constants/colors';

export type SongListItemProps = {
  title: string;
  artist: string;
  keySignature: string;
  tuning: string;
  version?: number | null;
  claimStatus?: 'yours' | 'claimed' | 'unclaimed';
  isOrphaned?: boolean;
  contributorName?: string;
  contributorAvatarUrl?: string | null;
  contributionDate?: string;
  authorComment?: string | null;
  subtext?: string;
  voteScore: number;
  userVote: 'UP' | 'DOWN' | null;
  onPreview?: () => void;
  previewLabel?: string;
  previewDisabled?: boolean;
  onUpVote?: () => void;
  onDownVote?: () => void;
  voteDisabled?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionDisabled?: boolean;
  onMenu?: () => void;
  style?: ViewStyle;
};

export function SongListItem({
  title,
  artist,
  keySignature,
  tuning,
  version,
  claimStatus,
  isOrphaned,
  contributorName,
  contributorAvatarUrl,
  contributionDate,
  authorComment,
  subtext,
  voteScore,
  userVote,
  onPreview,
  previewLabel = 'Preview',
  previewDisabled = false,
  onUpVote,
  onDownVote,
  voteDisabled = false,
  onAction,
  actionLabel,
  actionDisabled,
  onSecondaryAction,
  secondaryActionLabel,
  secondaryActionDisabled,
  onMenu,
  style,
}: SongListItemProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const highlightUp = userVote === 'UP';
  const highlightDown = userVote === 'DOWN';
  const avatarUri = contributorAvatarUrl?.trim() ?? '';
  const showAvatarImage = !avatarFailed && (avatarUri.startsWith('http://') || avatarUri.startsWith('https://'));
  const avatarInitial = contributorName?.slice(0, 1).toUpperCase() ?? '?';
  const handleActionPress = (event: GestureResponderEvent, callback?: () => void) => {
    event.stopPropagation();
    callback?.();
  };
  return (
    <Pressable
      onPress={onPreview}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
        style,
      ]}
    >
      <View style={styles.voteColumn}>
        <Pressable
          onPress={(event) => handleActionPress(event, onUpVote)}
          disabled={voteDisabled || !onUpVote}
          accessibilityRole="button"
          accessibilityLabel="Upvote song"
          hitSlop={8}
          style={[
            styles.voteButton,
            highlightUp ? styles.voteButtonActive : styles.voteButtonIdle,
            (voteDisabled || !onUpVote) && styles.voteButtonDisabled,
          ]}
        >
          <Text style={[styles.voteArrow, highlightUp && styles.voteArrowActive]}>▲</Text>
        </Pressable>
        <View style={styles.voteScorePill}>
          <Text style={styles.voteScore}>{voteScore}</Text>
        </View>
        <Pressable
          onPress={(event) => handleActionPress(event, onDownVote)}
          disabled={voteDisabled || !onDownVote}
          accessibilityRole="button"
          accessibilityLabel="Downvote song"
          hitSlop={8}
          style={[
            styles.voteButton,
            highlightDown ? styles.voteButtonActive : styles.voteButtonIdle,
            (voteDisabled || !onDownVote) && styles.voteButtonDisabled,
          ]}
        >
          <Text style={[styles.voteArrow, highlightDown && styles.voteArrowActive]}>▼</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {artist}
        </Text>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{keySignature}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{tuning}</Text>
          </View>
          {version != null ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>v{version}</Text>
            </View>
          ) : null}
          {claimStatus != null ? (
            <View style={[
              styles.chip,
              claimStatus === 'yours' && styles.chipYours,
              claimStatus === 'unclaimed' && styles.chipUnclaimed,
            ]}>
              <Text style={[
                styles.chipText,
                claimStatus === 'yours' && styles.chipTextYours,
                claimStatus === 'unclaimed' && styles.chipTextUnclaimed,
              ]}>
                {claimStatus === 'yours' ? 'Yours' : claimStatus === 'unclaimed' ? 'Orphaned' : 'Owned'}
              </Text>
            </View>
          ) : null}
        </View>
        {!isOrphaned && (contributorName || contributionDate) ? (
          <View style={styles.contributorRow}>
            <View style={styles.contributorAvatar}>
              {showAvatarImage ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.contributorAvatarImage}
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <Text style={styles.contributorAvatarInitial}>{avatarInitial}</Text>
              )}
            </View>
            <Text style={styles.contributorHint} numberOfLines={1}>
              {contributorName ?? 'Community'}
              {contributionDate ? ` • ${contributionDate}` : ''}
            </Text>
          </View>
        ) : null}
        {authorComment?.trim() ? (
          <Text style={styles.authorComment} numberOfLines={3}>
            {authorComment.trim()}
          </Text>
        ) : null}
        {subtext ? (
          <Text style={styles.subtext} numberOfLines={1}>{subtext}</Text>
        ) : null}
      </View>

      <View style={styles.actionsColumn}>
        {onPreview ? (
          <Pressable
            onPress={(event) => handleActionPress(event, onPreview)}
            disabled={previewDisabled}
            style={({ pressed }) => [
              styles.previewButton,
              previewDisabled && styles.actionDisabled,
              pressed && !previewDisabled && styles.actionPressed,
            ]}
          >
            <Text style={[styles.previewButtonText, previewDisabled && styles.actionTextDisabled]}>
              {previewLabel}
            </Text>
          </Pressable>
        ) : null}
        {actionLabel ? (
          <Pressable
            onPress={onAction ? (event) => handleActionPress(event, onAction) : undefined}
            disabled={actionDisabled || !onAction}
            style={({ pressed }) => [
              styles.actionButton,
              (actionDisabled || !onAction) && styles.actionDisabled,
              pressed && !actionDisabled && onAction && styles.actionPressed,
            ]}
          >
            <Text style={[styles.actionText, (actionDisabled || !onAction) && styles.actionTextDisabled]}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
        {secondaryActionLabel && onSecondaryAction ? (
          <Pressable
            onPress={(event) => handleActionPress(event, onSecondaryAction)}
            disabled={secondaryActionDisabled}
            style={({ pressed }) => [
              styles.actionButton,
              styles.secondaryActionButton,
              secondaryActionDisabled && styles.actionDisabled,
              pressed && !secondaryActionDisabled && styles.actionPressed,
            ]}
          >
            <Text style={[styles.actionText, styles.secondaryActionText, secondaryActionDisabled && styles.actionTextDisabled]}>
              {secondaryActionLabel}
            </Text>
          </Pressable>
        ) : null}
        {onMenu ? (
          <Pressable
            onPress={(event) => handleActionPress(event, onMenu)}
            style={styles.menuButton}
          >
            <Text style={styles.menuText}>⋯</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export const mockSongListItem: SongListItemProps = {
  title: 'Night Train Shuffle',
  artist: 'The Low-End Drivers',
  keySignature: 'E',
  tuning: 'Standard',
  contributorName: 'Mercy Vibes',
  contributionDate: 'Apr 5, 2026',
  voteScore: 8,
  userVote: 'UP',
  onPreview: () => undefined,
  onUpVote: () => undefined,
  onDownVote: () => undefined,
  onMenu: () => undefined,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.5)',
    gap: 12,
  },
  containerPressed: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
  },
  voteColumn: {
    width: 64,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  voteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  voteButtonIdle: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  voteButtonActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  voteButtonDisabled: {
    opacity: 0.55,
  },
  voteArrow: {
    fontSize: 18,
    color: '#64748b',
  },
  voteArrowActive: {
    color: '#b45309',
  },
  voteScorePill: {
    minWidth: 40,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  voteScore: {
    fontWeight: '700',
    fontSize: 15,
    color: palette.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: palette.text,
  },
  artist: {
    fontSize: 13,
    color: palette.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(147, 191, 255, 0.08)',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.textMuted,
    letterSpacing: 0.5,
  },
  chipYours: {
    borderColor: palette.primary,
    backgroundColor: 'rgba(15, 118, 110, 0.12)',
  },
  chipTextYours: {
    color: palette.primary,
  },
  chipUnclaimed: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  chipTextUnclaimed: {
    color: '#b45309',
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contributorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  contributorAvatarImage: {
    width: '100%',
    height: '100%',
  },
  contributorAvatarInitial: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  contributorHint: {
    fontSize: 11,
    color: '#9ca3af',
    flex: 1,
  },
  authorComment: {
    fontSize: 12,
    lineHeight: 17,
    color: '#334155',
    marginTop: 4,
  },
  subtext: {
    fontSize: 11,
    color: palette.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  orphanBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  orphanBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    letterSpacing: 0.5,
  },
  secondaryActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.primary,
  },
  secondaryActionText: {
    color: palette.primary,
  },
  actionsColumn: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 6,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: palette.primary,
  },
  previewButton: {
    minWidth: 108,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f8fafc',
  },
  actionDisabled: {
    backgroundColor: palette.primaryMuted,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  actionTextDisabled: {
    color: '#475569',
  },
  menuButton: {
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  menuText: {
    fontSize: 20,
    color: palette.textMuted,
  },
});
