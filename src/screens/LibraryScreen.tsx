import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Circle, Svg, Text as SvgText } from 'react-native-svg';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createBassTabApiFromEnv, toSongChartDto } from '../api';
import { EmptyState } from '../components/EmptyState';
import { AppSectionNav } from '../components/AppSectionNav';
import { LibrarySongCard } from '../components/LibrarySongCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SearchBar } from '../components/SearchBar';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { resolveUpgradeTrigger, useSubscription, useUpgradePrompt } from '../features/subscription';
import { useAuth } from '../features/auth';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { Song } from '../types/models';
import { usePublishedSongLookup, PublishedSongInfo } from '../hooks/usePublishedSongLookup';
import { logClientEvent } from '../utils/clientTelemetry';
import { appLog } from '../utils/logging';

const NAMEPLATE_BG = '#1a120a';
const NAMEPLATE_TEXT = '#f5e6c8';
const NAMEPLATE_MUTED = '#a8957e';
const NAMEPLATE_GOLD = '#c8a96e';

const SONG_QUIPS = [
  'We\'ll start this too fast.',
  'Solid until the chorus.',
  'We\'ll get away with it.',
  'Needs confidence.',
  'Good if we\'ve rehearsed it.',
  'The one we overplay.',
  'Works better live.',
  'Deceptively simple.',
  'Everyone has a different version.',
  'The bass carries this one.',
];

function getSongQuip(id: string): string {
  const code = id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return SONG_QUIPS[code % SONG_QUIPS.length];
}

function DadBandBadge() {
  return (
    <Svg width={80} height={80} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="54" fill="none" stroke={NAMEPLATE_GOLD} strokeWidth={3} />
      <Circle cx="60" cy="60" r="44" fill="none" stroke={NAMEPLATE_GOLD} strokeWidth={2} strokeDasharray="4 3" />
      <SvgText x="60" y="65" textAnchor="middle" fontSize={18} fontWeight="bold" letterSpacing={2} fill={NAMEPLATE_TEXT} fontFamily="Arial">DAD BAND</SvgText>
      <SvgText x="60" y="24" textAnchor="middle" fontSize={8} letterSpacing={1.5} fill={NAMEPLATE_GOLD} fontFamily="Arial">LIBRARY</SvgText>
      <SvgText x="60" y="108" textAnchor="middle" fontSize={7} letterSpacing={1.2} fill={NAMEPLATE_GOLD} fontFamily="Arial">SORT OF KNOW THESE</SvgText>
    </Svg>
  );
}

const needsRepublish = (song: Song, publishedInfo?: PublishedSongInfo): boolean => {
  if (!publishedInfo) {
    return false;
  }

  return song.updatedAt !== publishedInfo.updatedAt;
};

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Library'>,
  NativeStackScreenProps<RootStackParamList>
>;

type SongPendingDelete = {
  id: string;
  title: string;
  backendSongId?: string | null;
  communityAction: 'LOCAL_ONLY' | 'ORPHAN_THEN_DELETE' | 'REMOVE_FROM_COMMUNITY_THEN_DELETE';
  publishedSongId?: string | null;
  upVotes?: number;
};

export function LibraryScreen({ navigation }: Props) {
  const { tier, capabilities } = useSubscription();
  const { showUpgradePrompt } = useUpgradePrompt();
  const { authState } = useAuth();
  const currentUserId = authState.type === 'AUTHENTICATED' ? authState.user.userId : null;
  const currentUserLegacyId = authState.type === 'AUTHENTICATED' ? authState.user.id : null;
  const isOwnedBySignedInUser = (ownerUserId?: string | null) =>
    Boolean(ownerUserId) &&
    (ownerUserId === currentUserId || ownerUserId === currentUserLegacyId);
  const {
    songs,
    createSong,
    deleteSong,
  } = useBassTab();
  const backendApi = useMemo(() => createBassTabApiFromEnv(), []);
  const { lookup: publishedLookup, refresh: refreshPublishedLookup } = usePublishedSongLookup(
    backendApi,
  );
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'artist'>('title');
  const [publishingSongId, setPublishingSongId] = useState<string | null>(null);
  const [songPendingDelete, setSongPendingDelete] = useState<SongPendingDelete | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const lastStateSignatureRef = useRef<string>('');

  const filteredSongs = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filtered = normalized
      ? songs.filter((song) =>
          [song.title, song.artist, song.authorComment ?? '', song.key, song.tuning]
            .join(' ')
            .toLowerCase()
            .includes(normalized),
        )
      : songs;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'artist') {
        return (a.artist ?? '').localeCompare(b.artist ?? '') || (a.title ?? '').localeCompare(b.title ?? '');
      }
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
  }, [query, songs, sortBy]);

  useEffect(() => {
    const payload = {
      authState: authState.type,
      songsCount: songs.length,
      filteredSongsCount: filteredSongs.length,
      queryLength: query.length,
      firstSongId: songs[0]?.id ?? null,
      firstFilteredSongId: filteredSongs[0]?.id ?? null,
    };
    const signature = JSON.stringify(payload);

    if (lastStateSignatureRef.current === signature) {
      return;
    }

    lastStateSignatureRef.current = signature;
    logClientEvent('info', 'library.render_state', payload);
  }, [authState.type, filteredSongs, query.length, songs]);

  const handleCreateSong = async () => {
    try {
      const song = await createSong();
      navigation.navigate('SongEditor', { songId: song.id, isNew: true });
    } catch (error) {
      const trigger = resolveUpgradeTrigger(error);

      if (trigger) {
        showUpgradePrompt(trigger);
        return;
      }

      const message = error instanceof Error ? error.message : 'Could not create song.';
      setStatusMessage(`Could not create song: ${message}`);
    }
  };

  const handleDeleteSong = async (songId: string, songTitle: string) => {
    const cachedPublishedInfo = publishedLookup[songId];
    let nextPendingDelete: SongPendingDelete = {
      id: songId,
      title: songTitle,
      backendSongId: songId,
      communityAction: 'LOCAL_ONLY',
      publishedSongId: cachedPublishedInfo?.publishedSongId ?? null,
    };

    if (tier === 'FREE') {
      setSongPendingDelete(nextPendingDelete);
      return;
    }

    if (backendApi) {
      try {
        const communitySongs = await backendApi.listCommunitySongs();
        const communityEntry = communitySongs.find((entry) => {
          const sourceSongId = entry.sourceSongId ?? null;
          const publishedSongId =
            entry.publishedSongId ??
            (entry.id && entry.id !== sourceSongId ? entry.id : null);
          return sourceSongId === songId && Boolean(publishedSongId);
        });

        if (communityEntry) {
          const upVotes = Math.max(0, communityEntry.votes?.upVotes ?? 0);
          const sourceSongId = communityEntry.sourceSongId ?? songId;
          const publishedSongId =
            communityEntry.publishedSongId ??
            (communityEntry.id && communityEntry.id !== sourceSongId ? communityEntry.id : null) ??
            cachedPublishedInfo?.publishedSongId ??
            null;
          const shouldOrphan = upVotes > 0;

          nextPendingDelete = {
            id: songId,
            title: songTitle,
            backendSongId: sourceSongId,
            communityAction: shouldOrphan
              ? 'ORPHAN_THEN_DELETE'
              : 'REMOVE_FROM_COMMUNITY_THEN_DELETE',
            publishedSongId,
            upVotes,
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not verify Community rating.';
        setStatusMessage(message);
        return;
      }
    }

    setSongPendingDelete(nextPendingDelete);
  };

  const handleToggleCommunityRelease = async (songId: string) => {
    if (!backendApi || publishingSongId) {
      return;
    }

    const song = songs.find((item) => item.id === songId);

    if (!song) {
      return;
    }

    setPublishingSongId(song.id);

    try {
      const publishedInfo = publishedLookup[song.id];
      const existingPublishedSongId = publishedInfo?.publishedSongId;
      const isOrphaned = publishedInfo?.ownershipStatus === 'ORPHANED';

      if (existingPublishedSongId && !isOrphaned) {
        await backendApi.disownCommunitySong(existingPublishedSongId);
        // deleteSong fires a fire-and-forget HTTP delete internally (void return).
        // Only call it after the disown API call confirms success above.
        deleteSong(song.id);
        setStatusMessage(`"${song.title}" released — it's now free to be claimed by the community.`);
      } else {
        await backendApi.replaceSongChart(song.id, {
          chart: toSongChartDto(song),
        });
        await backendApi.publishSong(song.id);
        const nextLookup = await refreshPublishedLookup();
        setStatusMessage(
          nextLookup[song.id]
            ? `"${song.title}" is now live in Community.`
            : `"${song.title}" published. It may take a moment to appear in Community.`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update community publish state.';
      setStatusMessage(message);
    } finally {
      setPublishingSongId(null);
    }
  };

  const handleRepublish = async (songId: string) => {
    if (!backendApi || publishingSongId) {
      return;
    }

    const song = songs.find((item) => item.id === songId);

    if (!song) {
      return;
    }

    setPublishingSongId(song.id);

    try {
      const publishedSongId = publishedLookup[song.id]?.publishedSongId;

      if (!publishedSongId) {
        setStatusMessage('Could not republish: missing published community id.');
        return;
      }

      await backendApi.replaceSongChart(song.id, {
        chart: toSongChartDto(song),
      });
      await backendApi.republishCommunitySong(publishedSongId, song.id);
      await refreshPublishedLookup();
      setStatusMessage(`"${song.title}" republished to Community.`);
    } catch (error) {
      const trigger = resolveUpgradeTrigger(error);

      if (trigger) {
        showUpgradePrompt(trigger);
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Could not republish this song to community.';
      setStatusMessage(message);
    } finally {
      setPublishingSongId(null);
    }
  };

  const confirmDeleteSong = async (
    forcedCommunityAction?: SongPendingDelete['communityAction'],
  ) => {
    if (!songPendingDelete) {
      return;
    }

    const nextAction =
      tier === 'PRO'
        ? (forcedCommunityAction ?? songPendingDelete.communityAction)
        : 'LOCAL_ONLY';
    const pendingDelete: SongPendingDelete = {
      ...songPendingDelete,
      communityAction: nextAction,
    };
    setSongPendingDelete(null);

    const isPolicyDelete =
      tier === 'PRO' &&
      Boolean(backendApi) &&
      Boolean(pendingDelete.publishedSongId) &&
      pendingDelete.communityAction !== 'LOCAL_ONLY';

    if (isPolicyDelete && backendApi) {
      const intent =
        pendingDelete.communityAction === 'ORPHAN_THEN_DELETE'
          ? 'orphanAlways'
          : 'removeFromCommunity';

      try {
        await backendApi.deleteSongWithPolicy(
          pendingDelete.backendSongId ?? pendingDelete.id,
          intent,
        );
      } catch (error) {
        const trigger = resolveUpgradeTrigger(error);

        if (trigger) {
          showUpgradePrompt(trigger);
          return;
        }

        const message = error instanceof Error
          ? error.message
          : 'Could not delete song with community policy.';
        setStatusMessage(message);
        return;
      }
    }

    deleteSong(
      pendingDelete.id,
      pendingDelete.backendSongId ?? pendingDelete.id,
      { skipBackendDelete: isPolicyDelete },
    );
    void refreshPublishedLookup().catch((error) => {
      appLog.warn('Failed to refresh published lookup after delete', error);
    });

    if (pendingDelete.communityAction === 'ORPHAN_THEN_DELETE') {
      setStatusMessage('Song deleted locally. Community version kept as orphan (has likes).');
      return;
    }

    if (pendingDelete.communityAction === 'REMOVE_FROM_COMMUNITY_THEN_DELETE') {
      setStatusMessage('Song deleted locally and removed from Community.');
      return;
    }

    setStatusMessage('Song binned.');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.navRow}>
          <AppSectionNav
            current="Library"
            onHome={() => navigation.navigate('Home')}
            onLibrary={() => navigation.navigate('Library')}
            onSetlist={() => navigation.navigate('Setlist')}
            onImport={() => navigation.navigate('Import')}
            onAICreate={() => navigation.navigate('AICreate')}
            onGoPro={() => navigation.navigate('Upgrade')}
            onAccount={() => navigation.navigate('Account')}
          />
        </View>

        <View style={styles.nameplate}>
          <View style={styles.nameplateInner}>
            <View style={styles.nameplateText}>
              <Text style={styles.nameplateTitle}>Dad Band Library 🎸</Text>
              <Text style={styles.nameplateSubtitle}>All the songs we sort of know.</Text>
              <View style={styles.warningPill}>
                <Text style={styles.warningPillText}>⚠️ Accuracy varies. Confidence does not.</Text>
              </View>
            </View>
            <View style={styles.badgeSlap}>
              <DadBandBadge />
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <PrimaryButton label="New Song" onPress={handleCreateSong} />
        </View>
      </View>

      {statusMessage ? <Text style={styles.storageNote}>{statusMessage}</Text> : null}

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search songs, artists, or something we half remember" />

      <View style={styles.sortRow}>
        {(['title', 'artist'] as const).map((option) => (
          <Pressable
            key={option}
            style={[styles.sortTab, sortBy === option && styles.sortTabActive]}
            onPress={() => setSortBy(option)}
          >
            <Text style={[styles.sortTabText, sortBy === option && styles.sortTabTextActive]}>
              {option === 'title' ? 'Title' : 'Artist'}
            </Text>
          </Pressable>
        ))}
      </View>

      {filteredSongs.length === 0 ? (
        query.trim() ? (
          <EmptyState
            title="Nothing matches that."
            description="Try a different search, or we genuinely don't have it."
          />
        ) : (
          <EmptyState
            title="Nothing in here yet."
            description="Time to learn something. Or pretend to."
          />
        )
      ) : (
        filteredSongs.map((song) => {
          const publishedInfo = publishedLookup[song.id];
          const isOrphanedInCommunity =
            Boolean(publishedInfo?.publishedSongId) &&
            (publishedInfo?.ownershipStatus === 'ORPHANED' ||
              (publishedInfo?.ownerUserId != null &&
                !isOwnedBySignedInUser(publishedInfo.ownerUserId)));

          return (
            <LibrarySongCard
              key={song.id}
              song={song}
              subtext={song.authorComment?.trim() ? undefined : getSongQuip(song.id)}
              onEdit={() => navigation.navigate('SongEditor', { songId: song.id })}
              onLive={() => navigation.navigate('PerformanceView', { songId: song.id })}
              onDelete={() => {
                void handleDeleteSong(song.id, song.title);
              }}
              onExportPdf={() => navigation.navigate('ExportSong', { songId: song.id })}
              onLockedPdfExport={() => showUpgradePrompt('PDF_EXPORT')}
              isPdfExportLocked={tier === 'FREE'}
              onToggleCommunityRelease={
                backendApi
                  ? () => {
                    void handleToggleCommunityRelease(song.id);
                  }
                  : undefined
              }
              isPublishedToCommunity={
                Boolean(publishedInfo?.publishedSongId) &&
                publishedInfo?.ownershipStatus !== 'ORPHANED'
              }
              isOrphanedInCommunity={isOrphanedInCommunity}
              onLockedCommunityAction={() => showUpgradePrompt('COMMUNITY_SAVE')}
              isCommunityReleaseUpdating={publishingSongId === song.id}
              isCommunityActionLocked={capabilities.maxCommunitySaves !== null}
              onRepublish={
                !isOrphanedInCommunity && publishedInfo?.publishedSongId
                  ? () => {
                    void handleRepublish(song.id);
                  }
                  : undefined
              }
              showRepublish={!isOrphanedInCommunity && needsRepublish(song, publishedInfo)}
              isRepublishDisabled={publishingSongId === song.id}
            />
          );
        })
      )}

      <Modal
        visible={Boolean(songPendingDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setSongPendingDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Bin song?</Text>
                <Text style={styles.modalText}>
              {songPendingDelete
                ? songPendingDelete.communityAction === 'ORPHAN_THEN_DELETE'
                  ? `"${songPendingDelete.title}" has ${songPendingDelete.upVotes ?? 0} like${(songPendingDelete.upVotes ?? 0) === 1 ? '' : 's'} in Community. It can't be deleted there.`
                  : songPendingDelete.communityAction === 'REMOVE_FROM_COMMUNITY_THEN_DELETE'
                    ? `"${songPendingDelete.title}" is published in Community with no likes. Deleting now will remove it from Community and your library.`
                    : `Are you sure you want to bin "${songPendingDelete.title}"?`
                : ''}
            </Text>
            {songPendingDelete?.communityAction === 'ORPHAN_THEN_DELETE' ? (
              <Text style={styles.modalText}>We can orphan it in Community and delete it locally.</Text>
            ) : null}
            {songPendingDelete?.communityAction === 'REMOVE_FROM_COMMUNITY_THEN_DELETE' &&
            tier === 'PRO' ? (
              <Text style={styles.modalText}>
                Pro option: orphan it in Community and still bin it from your library.
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <PrimaryButton
                label="Cancel"
                onPress={() => setSongPendingDelete(null)}
                variant="ghost"
              />
              {songPendingDelete?.communityAction === 'REMOVE_FROM_COMMUNITY_THEN_DELETE' &&
              tier === 'PRO' ? (
                <PrimaryButton
                  label="Orphan + Bin"
                  onPress={() => {
                    void confirmDeleteSong('ORPHAN_THEN_DELETE');
                  }}
                  variant="secondary"
                />
              ) : null}
              <PrimaryButton
                label={
                  songPendingDelete?.communityAction === 'ORPHAN_THEN_DELETE'
                    ? 'Orphan + Bin'
                    : songPendingDelete?.communityAction === 'REMOVE_FROM_COMMUNITY_THEN_DELETE'
                      ? 'Remove + Bin'
                      : 'Bin it'
                }
                onPress={() => {
                  void confirmDeleteSong();
                }}
                variant="danger"
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
  },
  navRow: {
    marginBottom: 0,
  },
  nameplate: {
    backgroundColor: NAMEPLATE_BG,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: NAMEPLATE_GOLD,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  nameplateInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameplateText: {
    flex: 1,
    gap: 8,
  },
  nameplateTitle: {
    fontFamily: brandDisplayFontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: NAMEPLATE_TEXT,
    flexShrink: 1,
  },
  nameplateSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: NAMEPLATE_MUTED,
    fontStyle: 'italic',
  },
  warningPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2e1f0a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7a5520',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warningPillText: {
    fontSize: 11,
    color: '#d4a04a',
    fontWeight: '600',
  },
  badgeSlap: {
    transform: [{ rotate: '-10deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 5,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  storageNote: {
    fontSize: 13,
    lineHeight: 20,
    color: palette.textMuted,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  sortTabActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  sortTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  sortTabTextActive: {
    color: '#f8fafc',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
    gap: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: palette.text,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: palette.textMuted,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
});
