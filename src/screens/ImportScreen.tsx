import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BassTabApiError, CommunitySongCardDto, createBassTabApiFromEnv } from '../api';
import { AppSectionNav } from '../components/AppSectionNav';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { TabPagePreview } from '../components/TabPagePreview';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import {
  FREE_PLAN_LIMITS,
  resolveUpgradeTrigger,
  useSubscription,
  useUpgradePrompt,
} from '../features/subscription';
import { useAuth } from '../features/auth';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { CommunitySongAuthor, CommunitySongCard, SongChart } from '../types/models';
import { SongListItem } from '../components/SongListItem';
import { flattenSongRowsToChart } from '../utils/songChart';
import { parseTab } from '../utils/tabLayout';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Import'>,
  NativeStackScreenProps<RootStackParamList>
>;

type CommunitySongListItem = CommunitySongCard;

interface CommunityPreviewData {
  title: string;
  artist: string;
  key: string;
  tuning: string;
  author?: CommunitySongAuthor;
  stringNames: string[];
  bars: ReturnType<typeof parseTab>['bars'];
  rowAnnotations: SongChart['rowAnnotations'];
  rowBarCounts: number[];
}

function resolveCommunitySaveId(song: CommunitySongCard) {
  return song.sourceSongId ?? song.id;
}

function resolveCommunityDetailId(song: CommunitySongCard) {
  return song.publishedSongId ?? song.id;
}

function resolveCommunityVoteId(song: CommunitySongCard) {
  return song.sourceSongId ?? song.id;
}

function formatPublishedDateLabel(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return 'Just added';
  }

  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return 'Just added';
  }

  return `Added ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)}`;
}

function getCommunitySongPopularityScore(song: CommunitySongListItem): number {
  return (song.votes.upVotes ?? 0) - (song.votes.downVotes ?? 0);
}

function sortCommunitySongs(songs: CommunitySongListItem[]): CommunitySongListItem[] {
  return [...songs].sort((a, b) => {
    const score = getCommunitySongPopularityScore(b) - getCommunitySongPopularityScore(a);
    if (score !== 0) {
      return score;
    }

    if (b.votes.upVotes !== a.votes.upVotes) {
      return b.votes.upVotes - a.votes.upVotes;
    }

    return a.title.localeCompare(b.title);
  });
}

function toCommunitySongListItem(song: CommunitySongCardDto): CommunitySongListItem {
  return {
    id: song.id,
    publishedSongId: song.publishedSongId ?? song.id ?? null,
    sourceSongId: song.sourceSongId ?? song.id ?? null,
    title: song.title,
    artist: song.artist,
    key: song.key ?? 'E',
    tuning: song.tuning ?? 'EADG',
    author: song.author
      ? {
        userId: song.author.userId,
        displayName: song.author.displayName ?? null,
        avatarUrl: song.author.avatarUrl ?? null,
      }
      : undefined,
    votes: {
      upVotes: song.votes.upVotes,
      downVotes: song.votes.downVotes,
      currentUserVote: song.votes.currentUserVote,
    },
    publishedAt: song.publishedAt,
    updatedAt: song.updatedAt,
    version: song.version ?? null,
    ownershipStatus: song.ownershipStatus ?? null,
  };
}

interface AuthorChipProps {
  author?: CommunitySongAuthor;
  fallbackName?: string | null;
  style?: StyleProp<ViewStyle>;
}

function AuthorChip({ author, fallbackName, style }: AuthorChipProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!author && !fallbackName?.trim()) {
    return null;
  }

  const displayName = author?.displayName?.trim() || fallbackName?.trim() || 'Community';
  const avatarUri = author?.avatarUrl?.trim() ?? '';
  const showAvatarImage =
    !imageFailed &&
    (avatarUri.startsWith('http://') || avatarUri.startsWith('https://'));
  const fallbackInitial = displayName.slice(0, 1).toUpperCase() || 'A';
  const authorLine = `contributed by ${displayName}`;

  return (
    <View style={[styles.authorRow, style]}>
      <View style={styles.authorAvatar}>
        {showAvatarImage ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.authorAvatarImage}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text style={styles.authorAvatarFallback}>{fallbackInitial}</Text>
        )}
      </View>
      <Text style={styles.authorText} numberOfLines={1}>
        {authorLine}
      </Text>
    </View>
  );
}

const isCommunityAlreadySavedError = (error: unknown): boolean => {
  if (error instanceof BassTabApiError) {
    const code = error.code?.toUpperCase();

    if (
      code === 'COMMUNITY_ALREADY_SAVED' ||
      code === 'COMMUNITY_SONG_ALREADY_SAVED' ||
      code === 'COMMUNITY_SAVE_ALREADY_EXISTS'
    ) {
      return true;
    }

    if (error.status === 400 && /already (saved|exists)/i.test(error.message)) {
      return true;
    }
  }

  if (error instanceof Error) {
    return /already (saved|exists)/i.test(error.message);
  }

  return false;
};

export function ImportScreen({ navigation }: Props) {
  const {
    tier,
    capabilities,
    communitySongsSaved,
    refresh,
    setCommunitySongsSaved,
    capabilityDefaults,
  } = useSubscription();
  const { showUpgradePrompt } = useUpgradePrompt();
  const { authState } = useAuth();
  const currentUserId = authState.type === 'AUTHENTICATED' ? authState.user.id : null;
  const currentUserDisplayName = authState.type === 'AUTHENTICATED' ? authState.user.displayName : null;
  const { songs, importSongFromDto } = useBassTab();
  const importedPublishedSongIds = useMemo(
    () => new Set(songs.map((s) => s.importedPublishedSongId).filter(Boolean) as string[]),
    [songs],
  );
  const backendApi = useMemo(() => createBassTabApiFromEnv(), []);
  const [communityCatalog, setCommunityCatalog] = useState<CommunitySongListItem[]>([]);
  const [savedCommunitySongIds, setSavedCommunitySongIds] = useState<string[]>([]);
  const [savingSongId, setSavingSongId] = useState<string | null>(null);
  const [adoptingSongId, setAdoptingSongId] = useState<string | null>(null);
  const [previewLoadingSongId, setPreviewLoadingSongId] = useState<string | null>(null);
  const [votingSongId, setVotingSongId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<CommunityPreviewData | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Browse community charts and save the ones you want to play.');
  const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'MINE' | 'UNCLAIMED'>('ALL');

  const hydrateCommunity = useCallback(async () => {
    if (!backendApi) {
      setCommunityCatalog([]);
      setSavedCommunitySongIds([]);
      setStatusMessage('Community requires backend API configuration.');
      setLoadingCatalog(false);
      return;
    }

    try {
      setLoadingCatalog(true);
      const [savedSongs, releasedSongs] = await Promise.all([
        backendApi.listSavedCommunitySongs(),
        backendApi.listCommunitySongs(),
      ]);

      const sortedSongs = sortCommunitySongs(releasedSongs.map(toCommunitySongListItem));
      const savedIdSet = new Set<string>(savedSongs.map((item) => item.publishedSongId));
      sortedSongs.forEach((song) => {
        const publishedId = song.publishedSongId ?? song.id;
        if (savedIdSet.has(publishedId)) {
          savedIdSet.add(resolveCommunitySaveId(song));
        }
      });
      setSavedCommunitySongIds(Array.from(savedIdSet));
      setCommunityCatalog(sortedSongs);
      if (releasedSongs.length === 0) {
        setStatusMessage('No community charts have been released yet.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load community charts.';
      setStatusMessage(message);
      console.warn('Community song hydrate failed', error);
    } finally {
      setLoadingCatalog(false);
      // Refresh subscription state independently — failure here must not
      // corrupt the catalog error message or block the catalog from rendering.
      refresh().catch((error) => {
        console.warn('Subscription refresh failed during community hydrate', error);
      });
    }
  }, [backendApi, refresh]);

  useEffect(() => {
    void hydrateCommunity();
  }, [hydrateCommunity]);

  useFocusEffect(
    useCallback(() => {
      void hydrateCommunity();
      return undefined;
    }, [hydrateCommunity]),
  );

  const fallbackFreeCapabilities = capabilityDefaults?.free ?? {
    maxCommunitySongs: FREE_PLAN_LIMITS.communitySaves,
    maxCommunitySaves: FREE_PLAN_LIMITS.communitySaves,
    maxSongs: FREE_PLAN_LIMITS.songs,
    maxSetlists: FREE_PLAN_LIMITS.setlists,
    maxStringCount: FREE_PLAN_LIMITS.strings,
    svgEnabled: false,
  };
  const planCommunitySaveLimit =
    capabilities.maxCommunitySaves ??
    capabilities.maxCommunitySongs ??
    fallbackFreeCapabilities.maxCommunitySaves ??
    fallbackFreeCapabilities.maxCommunitySongs ??
    (tier === 'FREE' ? FREE_PLAN_LIMITS.communitySaves : null);
  const hasCommunityLimit = typeof planCommunitySaveLimit === 'number' && planCommunitySaveLimit >= 0;
  const freeSaveSlotsLeft = hasCommunityLimit
    ? Math.max(0, planCommunitySaveLimit - communitySongsSaved)
    : 0;

  const handleOpenPreview = async (song: CommunitySongListItem) => {
    if (previewLoadingSongId || savingSongId) {
      return;
    }

    if (!backendApi) {
      setStatusMessage('Community requires backend API configuration.');
      return;
    }

    setPreviewLoadingSongId(song.id);

    try {
      const communitySong = await backendApi.getCommunitySong(resolveCommunityDetailId(song));
      const flattened = flattenSongRowsToChart({
        stringNames: communitySong.chart.stringNames,
        rows: communitySong.chart.rows,
      });
      const parsed = parseTab(flattened.tab);

      setPreviewData({
        title: communitySong.title,
        artist: communitySong.artist,
        key: communitySong.key ?? 'E',
        tuning: communitySong.tuning ?? 'EADG',
        author: communitySong.author
          ? {
            userId: communitySong.author.userId,
            displayName: communitySong.author.displayName ?? null,
            avatarUrl: communitySong.author.avatarUrl ?? null,
          }
          : undefined,
        stringNames:
          parsed.stringNames.length > 0 ? parsed.stringNames : communitySong.chart.stringNames,
        bars: parsed.bars,
        rowAnnotations: flattened.rowAnnotations,
        rowBarCounts: flattened.rowBarCounts,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load preview.';
      setStatusMessage(message);
    } finally {
      setPreviewLoadingSongId(null);
    }
  };

  const handleSaveCommunitySong = async (communityEntryId: string) => {
    if (!backendApi) {
      setStatusMessage('Community requires backend API configuration.');
      return;
    }

    const selectedSong = communityCatalog.find((song) => song.id === communityEntryId);

    if (!selectedSong || savingSongId) {
      return;
    }

    const saveId = resolveCommunitySaveId(selectedSong);
    const hasCommunitySave = savedCommunitySongIds.includes(saveId);
    const maxSongs =
      capabilities.maxSongs ?? fallbackFreeCapabilities.maxSongs ?? FREE_PLAN_LIMITS.songs;

    if (tier === 'FREE' && songs.length >= maxSongs) {
      showUpgradePrompt('SONG_LIMIT');
      return;
    }

    console.info('Community save attempt', {
      song: selectedSong.title,
      hasCommunitySave,
      planCommunitySaveLimit,
      communitySongsSaved,
      hasCommunityLimit,
    });

    if (!hasCommunitySave && hasCommunityLimit && communitySongsSaved >= planCommunitySaveLimit) {
      console.warn(
        'Community save blocked',
        { communitySongsSaved, planCommunitySaveLimit, hasCommunitySave, song: selectedSong.title },
      );
      showUpgradePrompt('COMMUNITY_SAVE');
      return;
    }

    setSavingSongId(selectedSong.id);

    try {
      let songForSave = selectedSong;

      if (!hasCommunitySave) {
        try {
          const communitySongId = resolveCommunitySaveId(songForSave);
          const savedResponse = await backendApi.saveCommunitySong({ communitySongId });
          console.info(
            'Saved community song response',
            savedResponse,
            { hasCommunitySave, communitySongsSaved, next: savedResponse.communitySongsSaved },
          );
          setCommunitySongsSaved(savedResponse.communitySongsSaved);
        } catch (error) {
          const trigger = resolveUpgradeTrigger(error);

          if (trigger) {
            showUpgradePrompt(trigger);
            return;
          }

          if (error instanceof BassTabApiError && error.code === 'COMMUNITY_LIMIT') {
            showUpgradePrompt('COMMUNITY_SAVE');
            return;
          }

          const lowerMessage = error instanceof Error ? error.message.toLowerCase() : '';

          if (lowerMessage.includes('is required')) {
            setStatusMessage('Save failed: communitySongId is required.');
            return;
          }

          if (
            error instanceof BassTabApiError &&
            error.status === 400 &&
            lowerMessage.includes('not available in community catalog')
          ) {
            const refreshedSongs = sortCommunitySongs((await backendApi.listCommunitySongs()).map(toCommunitySongListItem));
            setCommunityCatalog(refreshedSongs);

            const refreshedMatch = refreshedSongs.find((song) =>
              song.id === songForSave.id ||
              resolveCommunitySaveId(song) === resolveCommunitySaveId(songForSave) ||
              resolveCommunityDetailId(song) === resolveCommunityDetailId(songForSave),
            );

            if (!refreshedMatch) {
              setStatusMessage('Community list changed. Pull to refresh and try again.');
              return;
            }

            // Intentional reassignment: the import step below uses songForSave,
            // so it must point to the refreshed entry after a successful retry.
            songForSave = refreshedMatch;
            const retryCommunitySongId = resolveCommunitySaveId(songForSave);
            await backendApi.saveCommunitySong({ communitySongId: retryCommunitySongId });
          } else if (!isCommunityAlreadySavedError(error)) {
            throw error;
          }
        }
      }

      const importTargetId = resolveCommunityDetailId(songForSave);
      const { song: importedSongDto, status: importStatus } =
        await backendApi.importCommunitySong(importTargetId);

      // Prefer the BE-supplied importedPublishedSongId, then the canonical
      // publishedSongId for this entry, and never fall back to sourceSongId
      // (which would break the "Already saved" lookup keyed on publishedSongId).
      const importedPublishedSongId =
        importedSongDto.importedPublishedSongId ??
        songForSave.publishedSongId ??
        importTargetId;
      const importedSong = importSongFromDto(importedSongDto, { importedPublishedSongId });

      const nextSaveId = resolveCommunitySaveId(songForSave);
      setSavedCommunitySongIds((prevIds) => {
        const nextSavedSet = new Set(prevIds);
        nextSavedSet.add(nextSaveId);
        if (songForSave.publishedSongId) {
          nextSavedSet.add(songForSave.publishedSongId);
        }
        return Array.from(nextSavedSet);
      });
      const importedMessage =
        importStatus === 200
          ? `Already imported "${importedSong.title}"—your existing copy is unchanged.`
          : `Moved "${importedSong.title}" to your library.`;
      setStatusMessage(importedMessage);

    } catch (error) {
      const trigger = resolveUpgradeTrigger(error);

      if (trigger) {
        showUpgradePrompt(trigger);
        return;
      }

      if (error instanceof BassTabApiError && error.code === 'COMMUNITY_LIMIT') {
        showUpgradePrompt('COMMUNITY_SAVE');
        return;
      }

      const message = error instanceof Error ? error.message : 'Could not save this community chart.';
      setStatusMessage(message);
    } finally {
      setSavingSongId(null);
    }
  };

  const handleVote = async (communityEntryId: string, direction: 'UP' | 'DOWN') => {
    if (!backendApi || votingSongId) {
      return;
    }

    const selectedSong = communityCatalog.find((song) => song.id === communityEntryId);

    if (!selectedSong) {
      return;
    }

    const voteSongId = resolveCommunityVoteId(selectedSong);
    setVotingSongId(selectedSong.id);

    try {
      const nextVotes =
        selectedSong.votes.currentUserVote === direction
          ? await backendApi.clearCommunitySongVote(voteSongId)
          : direction === 'UP'
            ? await backendApi.voteCommunitySongUp(voteSongId)
            : await backendApi.voteCommunitySongDown(voteSongId);

      setCommunityCatalog((currentSongs) =>
        currentSongs.map((song) =>
          song.id === selectedSong.id
            ? {
              ...song,
              votes: {
                upVotes: nextVotes.upVotes,
                downVotes: nextVotes.downVotes,
                currentUserVote: nextVotes.currentUserVote,
              },
            }
            : song,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update vote.';
      setStatusMessage(message);
    } finally {
      setVotingSongId(null);
    }
  };

  const handleAdopt = async (communityEntryId: string) => {
    if (!backendApi || adoptingSongId) {
      return;
    }

    const selectedSong = communityCatalog.find((song) => song.id === communityEntryId);

    if (!selectedSong) {
      return;
    }

    const publishedSongId = resolveCommunityDetailId(selectedSong);
    setAdoptingSongId(selectedSong.id);

    try {
      const updatedCard = await backendApi.adoptCommunitySong(publishedSongId);

      setCommunityCatalog((currentSongs) =>
        currentSongs.map((song) =>
          song.id === selectedSong.id
            ? {
              ...song,
              ownershipStatus: updatedCard.ownershipStatus ?? 'ACTIVE',
              version: updatedCard.version ?? song.version,
              author: updatedCard.author?.userId
                ? {
                  userId: updatedCard.author.userId,
                  displayName: updatedCard.author.displayName ?? null,
                  avatarUrl: updatedCard.author.avatarUrl ?? null,
                }
                : song.author,
            }
            : song,
        ),
      );

      setStatusMessage(`You are now the owner of "${selectedSong.title}".`);
    } catch (error) {
      const trigger = resolveUpgradeTrigger(error);

      if (trigger) {
        showUpgradePrompt(trigger);
        return;
      }

      const message = error instanceof Error ? error.message : 'Could not adopt this song.';
      setStatusMessage(message);
    } finally {
      setAdoptingSongId(null);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Community Charts</Text>
        <Text style={styles.subtitle}>
          Find useful bass charts from the community and stash them for rehearsal.
        </Text>
        <AppSectionNav
          current="Import"
          onHome={() => navigation.navigate('Home')}
          onLibrary={() => navigation.navigate('Library')}
          onSetlist={() => navigation.navigate('Setlist')}
          onImport={() => navigation.navigate('Import')}
          onAICreate={() => navigation.navigate('AICreate')}
          onGoPro={() => navigation.navigate('Upgrade')}
        />
      </View>

      <View style={styles.planBanner}>
        <Text style={styles.planTitle}>
          {tier === 'PRO' ? 'Pro Community Access' : 'Free Community Access'}
        </Text>
        {tier !== 'PRO' ? (
          <Text style={styles.planText}>
            {hasCommunityLimit
              ? `${communitySongsSaved} of ${planCommunitySaveLimit} community saves used`
              : 'Unlimited community saves'}
          </Text>
        ) : null}
        {tier !== 'PRO' && hasCommunityLimit && planCommunitySaveLimit > communitySongsSaved ? (
          <Text style={styles.planSubText}>
            Unlock unlimited saves to keep every community chart you love.
          </Text>
        ) : null}
        {tier !== 'PRO' ? (
          <Pressable
            style={styles.proLink}
            onPress={() => {
              navigation.navigate('Upgrade');
            }}
          >
            <Text style={styles.proLinkText}>See Pro benefits →</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.statusText}>{statusMessage}</Text>

      <View style={styles.filterRow}>
        {(['ALL', 'MINE', 'UNCLAIMED'] as const).map((filter) => (
          <Pressable
            key={filter}
            style={[styles.filterTab, ownershipFilter === filter && styles.filterTabActive]}
            onPress={() => setOwnershipFilter(filter)}
          >
            <Text style={[styles.filterTabText, ownershipFilter === filter && styles.filterTabTextActive]}>
              {filter === 'ALL' ? 'All' : filter === 'MINE' ? 'Mine' : 'Orphaned'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loadingCatalog ? (
        <EmptyState
          title="Loading community charts"
          description="Pulling the latest released songs."
        />
      ) : communityCatalog.length === 0 ? (
        <EmptyState
          title="No community charts yet"
          description="Check back soon for shared songs."
        />
      ) : (
        communityCatalog
          .filter((song) => {
            if (ownershipFilter === 'MINE') {
              return song.ownershipStatus === 'ACTIVE' &&
                Boolean(currentUserId) &&
                song.author?.userId === currentUserId;
            }
            if (ownershipFilter === 'UNCLAIMED') {
              return song.ownershipStatus === 'ORPHANED';
            }
            return true;
          })
          .map((song) => {
          const isSaving = savingSongId === song.id;
          const isAdopting = adoptingSongId === song.id;
          const isPreviewLoading = previewLoadingSongId === song.id;
          const dateLabel = formatPublishedDateLabel(song.publishedAt ?? song.updatedAt ?? null);
          const saveId = resolveCommunitySaveId(song);
          const publishedId = song.publishedSongId ?? song.id;
          const hasCommunitySave = savedCommunitySongIds.includes(saveId);
          const isInLibrary =
            importedPublishedSongIds.has(publishedId) || importedPublishedSongIds.has(saveId);
          const limitReached =
            hasCommunityLimit && communitySongsSaved >= planCommunitySaveLimit && !hasCommunitySave;
          const isOrphaned = song.ownershipStatus === 'ORPHANED';
          const isOwner =
            !isOrphaned &&
            Boolean(currentUserId) &&
            Boolean(song.author?.userId) &&
            song.author?.userId === currentUserId;
          const canAdopt = isOrphaned && tier === 'PRO';

          return (
            <SongListItem
              key={song.id}
              style={styles.songRow}
              title={song.title}
              artist={song.artist}
              keySignature={song.key ?? 'E'}
              tuning={song.tuning ?? 'EADG'}
              version={song.version}
              claimStatus={isOwner ? 'yours' : isOrphaned ? 'unclaimed' : 'claimed'}
              isOrphaned={isOrphaned}
              contributorName={isOrphaned ? undefined : (isOwner ? (currentUserDisplayName ?? song.author?.displayName ?? 'You') : (song.author?.displayName ?? 'Community'))}
              contributorAvatarUrl={isOrphaned ? null : (song.author?.avatarUrl ?? null)}
              contributionDate={isOrphaned ? undefined : dateLabel}
              voteScore={song.votes.upVotes - song.votes.downVotes}
              userVote={song.votes.currentUserVote}
              onPreview={() => {
                void handleOpenPreview(song);
              }}
              onUpVote={() => {
                void handleVote(song.id, 'UP');
              }}
              onDownVote={() => {
                void handleVote(song.id, 'DOWN');
              }}
              actionLabel={
                isOwner
                  ? song.ownershipStatus === 'ORPHANED'
                    ? 'Disowned'
                    : 'Your Song'
                  : isSaving
                    ? 'Moving...'
                    : isInLibrary
                      ? 'Already saved'
                      : limitReached
                        ? 'Upgrade for more saves'
                        : 'Copy Song to Library'
              }
              onAction={
                isOwner
                  ? undefined
                  : () => {
                    if (limitReached) {
                      showUpgradePrompt('COMMUNITY_SAVE');
                      return;
                    }

                    void handleSaveCommunitySong(song.id);
                  }
              }
              actionDisabled={isOwner || isSaving || isPreviewLoading || limitReached || isInLibrary}
              secondaryActionLabel={
                canAdopt
                  ? isAdopting
                    ? 'Adopting...'
                    : 'Adopt Song'
                  : isOrphaned && tier !== 'PRO'
                    ? 'Adopt (Pro)'
                    : undefined
              }
              onSecondaryAction={
                canAdopt
                  ? () => { void handleAdopt(song.id); }
                  : isOrphaned && tier !== 'PRO'
                    ? () => { showUpgradePrompt('COMMUNITY_SAVE'); }
                    : undefined
              }
              secondaryActionDisabled={isAdopting || isSaving || isPreviewLoading}
            />
          );
        })
      )}

      <Modal
        visible={Boolean(previewData)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewData(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.previewModalCard}>
            {previewData ? (
              <>
                <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{previewData.title}</Text>
              <Text style={styles.previewMeta}>
                {previewData.artist} • {previewData.key} • {previewData.tuning}
              </Text>
              <AuthorChip author={previewData.author} fallbackName={previewData.artist} />
            </View>

                <ScrollView
                  style={styles.previewScroll}
                  contentContainerStyle={styles.previewScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <TabPagePreview
                    stringNames={previewData.stringNames}
                    bars={previewData.bars}
                    rowAnnotations={previewData.rowAnnotations}
                    rowBarCounts={previewData.rowBarCounts}
                    renderMode="ascii"
                    compact
                  />
                </ScrollView>

                <View style={styles.previewActions}>
                  <PrimaryButton
                    label="Close"
                    onPress={() => setPreviewData(null)}
                    variant="ghost"
                    size="compact"
                  />
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: palette.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#4b5563',
  },
  planBanner: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#0b0b0f',
    borderWidth: 1,
    borderColor: '#1f2937',
    gap: 4,
  },
  proLink: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  proLinkText: {
    fontSize: 12,
    letterSpacing: 0.5,
    color: '#fbbf24',
    fontWeight: '700',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  planText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#cbd5e1',
  },
  planSubText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#9ca3af',
    marginTop: 4,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 20,
    color: palette.textMuted,
  },
  songRow: {
    marginVertical: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  filterTabTextActive: {
    color: '#f8fafc',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarImage: {
    width: '100%',
    height: '100%',
  },
  authorAvatarFallback: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
    color: '#1e3a8a',
  },
  authorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: '#475569',
    fontWeight: '700',
  },
  votePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  votePillActiveUp: {
    borderColor: '#67e8f9',
    backgroundColor: '#cffafe',
  },
  votePillActiveDown: {
    borderColor: '#fecaca',
    backgroundColor: '#fee2e2',
  },
  votePillLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: '#334155',
  },
  votePillLabelActiveUp: {
    color: '#155e75',
  },
  votePillLabelActiveDown: {
    color: '#991b1b',
  },
  authorDateStack: {
    alignItems: 'flex-end',
    gap: 4,
  },
  authorRowRight: {
    marginTop: 0,
  },
  previewModalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '86%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 14,
    gap: 10,
  },
  previewHeader: {
    gap: 4,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.text,
  },
  previewMeta: {
    fontSize: 13,
    color: palette.textMuted,
  },
  previewScroll: {
    maxHeight: 420,
  },
  previewScrollContent: {
    paddingVertical: 4,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
