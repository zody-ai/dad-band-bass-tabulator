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

import { Circle, Svg, Text as SvgText } from 'react-native-svg';

import { BassTabApiError, CommunitySongCardDto, createBassTabApiFromEnv } from '../api';
import { AppSectionNav } from '../components/AppSectionNav';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { TabPagePreview, TabPreviewRenderMode } from '../components/TabPagePreview';
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
import { appLog } from '../utils/logging';
import { flattenSongRowsToChart } from '../utils/songChart';
import { parseTab } from '../utils/tabLayout';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Import'>,
  NativeStackScreenProps<RootStackParamList>
>;

type CommunitySongListItem = CommunitySongCard;
const FREE_PREVIEW_ROW_LIMIT = 2;
const DEFAULT_BARS_PER_ROW = 4;

interface CommunityPreviewData {
  title: string;
  artist: string;
  authorComment?: string | null;
  key: string;
  tuning: string;
  author?: CommunitySongAuthor;
  stringNames: string[];
  bars: ReturnType<typeof parseTab>['bars'];
  rowAnnotations: SongChart['rowAnnotations'];
  rowBarCounts: number[];
}

function resolvePreviewRowCounts(rowBarCounts: number[] | undefined, totalBars: number): number[] {
  if (rowBarCounts && rowBarCounts.length > 0) {
    return rowBarCounts.filter((count) => count > 0);
  }

  return Array.from(
    { length: Math.max(1, Math.ceil(totalBars / DEFAULT_BARS_PER_ROW)) },
    () => DEFAULT_BARS_PER_ROW,
  );
}

function getFreePreviewData(previewData: CommunityPreviewData): {
  data: CommunityPreviewData;
  isTruncated: boolean;
} {
  const resolvedCounts = resolvePreviewRowCounts(previewData.rowBarCounts, previewData.bars.length);
  const isTruncated = resolvedCounts.length > FREE_PREVIEW_ROW_LIMIT;

  if (!isTruncated) {
    return { data: previewData, isTruncated: false };
  }

  const limitedCounts = resolvedCounts.slice(0, FREE_PREVIEW_ROW_LIMIT);
  const shownBarCount = limitedCounts.reduce((sum, count) => sum + count, 0);

  return {
    data: {
      ...previewData,
      bars: previewData.bars.slice(0, shownBarCount),
      rowAnnotations: previewData.rowAnnotations.slice(0, limitedCounts.length),
      rowBarCounts: limitedCounts,
    },
    isTruncated: true,
  };
}

function resolveCommunitySaveId(song: CommunitySongCard) {
  return song.sourceSongId ?? song.id;
}

function resolveCommunityDetailId(song: CommunitySongCard) {
  return song.publishedSongId ?? song.id;
}

function resolveCommunityVoteIds(song: CommunitySongCard): string[] {
  const candidates = [song.id, song.publishedSongId ?? null, song.sourceSongId ?? null];
  return Array.from(new Set(candidates.filter((value): value is string => typeof value === 'string' && value.length > 0)));
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
    authorComment: song.authorComment ?? null,
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

const SONG_QUIPS = [
  'Surprisingly solid.',
  "Someone's had a go.",
  'Bit ambitious.',
  'Questionable in places.',
  'Better than it sounds.',
  'Technically a song.',
  'May require courage.',
  'Gets the job done.',
  "You'll recognise it eventually.",
  'Close enough.',
  'Bit optimistic.',
  'Needs confidence.',
  'A noble attempt.',
  'Points for effort.',
];

function getSongQuip(id: string): string {
  const code = id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return SONG_QUIPS[code % SONG_QUIPS.length];
}

function DadBandBadge() {
  return (
    <Svg width={80} height={80} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="54" fill="none" stroke="#c8a96e" strokeWidth={3} />
      <Circle cx="60" cy="60" r="44" fill="none" stroke="#c8a96e" strokeWidth={2} strokeDasharray="4 3" />
      <SvgText x="60" y="65" textAnchor="middle" fontSize={18} fontWeight="bold" letterSpacing={2} fill="#f5e6c8" fontFamily="Arial">DAD BAND</SvgText>
      <SvgText x="60" y="24" textAnchor="middle" fontSize={8} letterSpacing={1.5} fill="#c8a96e" fontFamily="Arial">COMMUNITY</SvgText>
      <SvgText x="60" y="108" textAnchor="middle" fontSize={7} letterSpacing={1.2} fill="#c8a96e" fontFamily="Arial">QUALITY NOT GUARANTEED</SvgText>
    </Svg>
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
    communitySongsRemaining,
    communitySongsSavedTotal,
    communityUsageLoaded,
    refresh,
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
  const [voteBlockedSongTitle, setVoteBlockedSongTitle] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<CommunityPreviewData | null>(null);
  const [previewRenderMode, setPreviewRenderMode] = useState<TabPreviewRenderMode>(
    capabilities.svgEnabled ? 'svg' : 'ascii',
  );
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Browse community charts and save the ones you want to play.');
  const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'MINE' | 'UNCLAIMED'>('ALL');

  const syncSavedCommunitySongs = useCallback(
    (savedSongs: Array<{ publishedSongId: string }>, catalog: CommunitySongListItem[]) => {
      const savedPublishedIdSet = new Set(
        new Set(
          savedSongs
            .map((item) => item.publishedSongId)
            .filter((value): value is string => typeof value === 'string' && value.length > 0),
        ),
      );
      const savedIdSet = new Set<string>(savedPublishedIdSet);
      catalog.forEach((song) => {
        const publishedId = song.publishedSongId ?? song.id;
        if (savedIdSet.has(publishedId)) {
          savedIdSet.add(resolveCommunitySaveId(song));
        }
      });
      setSavedCommunitySongIds(Array.from(savedIdSet));
    },
    [],
  );

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
      syncSavedCommunitySongs(savedSongs, sortedSongs);
      setCommunityCatalog(sortedSongs);
      if (releasedSongs.length === 0) {
        setStatusMessage('No community charts have been released yet.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load community charts.';
      setStatusMessage(message);
      appLog.warn('Community song hydrate failed', error);
    } finally {
      setLoadingCatalog(false);
      // Refresh subscription state independently — failure here must not
      // corrupt the catalog error message or block the catalog from rendering.
      refresh().catch((error) => {
        appLog.warn('Subscription refresh failed during community hydrate', error);
      });
    }
  }, [backendApi, refresh, syncSavedCommunitySongs]);

  useEffect(() => {
    void hydrateCommunity();
  }, [hydrateCommunity]);

  useFocusEffect(
    useCallback(() => {
      void hydrateCommunity();
      return undefined;
    }, [hydrateCommunity]),
  );

  const effectiveUnlimitedMaxCommunitySaves = 2_147_483_647;
  const planCommunitySaveLimit = capabilities.maxCommunitySaves;
  const hasUnlimitedCommunitySaves =
    communitySongsRemaining === effectiveUnlimitedMaxCommunitySaves ||
    planCommunitySaveLimit === effectiveUnlimitedMaxCommunitySaves;
  const freeSaveSlotsLeft = hasUnlimitedCommunitySaves
    ? null
    : Math.max(0, communitySongsRemaining);

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
        authorComment: communitySong.authorComment ?? null,
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
      setPreviewRenderMode(capabilities.svgEnabled ? 'svg' : 'ascii');
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
    const maxSongs = capabilities.maxSongs ?? FREE_PLAN_LIMITS.songs;

    if (tier === 'FREE' && songs.length >= maxSongs) {
      showUpgradePrompt('SONG_LIMIT');
      return;
    }

    appLog.info('Community save attempt', {
      song: selectedSong.title,
      hasCommunitySave,
      planCommunitySaveLimit,
      communitySongsSaved,
      communitySongsRemaining,
      hasUnlimitedCommunitySaves,
    });

    if (
      communityUsageLoaded &&
      !hasCommunitySave &&
      !hasUnlimitedCommunitySaves &&
      communitySongsRemaining <= 0
    ) {
      appLog.warn(
        'Community save blocked',
        {
          communitySongsSaved,
          communitySongsRemaining,
          planCommunitySaveLimit,
          hasCommunitySave,
          song: selectedSong.title,
        },
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
          appLog.info(
            'Saved community song response',
            savedResponse,
            { hasCommunitySave, communitySongsSaved, next: savedResponse.communitySongsSaved },
          );
          await refresh();
          syncSavedCommunitySongs(await backendApi.listSavedCommunitySongs(), communityCatalog);
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
          ? "You've already got this one."
          : `"${importedSong.title}" moved to your library.`;
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

    if (currentUserId && selectedSong.author?.userId === currentUserId) {
      setVoteBlockedSongTitle(selectedSong.title);
      return;
    }

    setVotingSongId(selectedSong.id);

    try {
      let nextVotes: Awaited<ReturnType<typeof backendApi.voteCommunitySongUp>> | null = null;
      let lastVoteError: unknown = null;
      const voteSongIds = resolveCommunityVoteIds(selectedSong);

      for (const voteSongId of voteSongIds) {
        try {
          nextVotes =
            selectedSong.votes.currentUserVote === direction
              ? await backendApi.clearCommunitySongVote(voteSongId)
              : direction === 'UP'
                ? await backendApi.voteCommunitySongUp(voteSongId)
                : await backendApi.voteCommunitySongDown(voteSongId);
          break;
        } catch (voteError) {
          lastVoteError = voteError;

          if (voteError instanceof BassTabApiError && (voteError.status === 400 || voteError.status === 404)) {
            continue;
          }

          throw voteError;
        }
      }

      if (!nextVotes) {
        throw (lastVoteError ?? new Error('Could not update vote.'));
      }

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

      try {
        const refreshedSongs = sortCommunitySongs(
          (await backendApi.listCommunitySongs()).map(toCommunitySongListItem),
        );
        setCommunityCatalog(refreshedSongs);
      } catch (refreshError) {
        appLog.warn('Community refresh after vote failed', refreshError);
      }
    } catch (error) {
      if (error instanceof BassTabApiError && (error.status === 400 || error.status === 404)) {
        const lowerMessage = error.message.toLowerCase();
        const noLongerAvailable =
          lowerMessage.includes('not available in community') ||
          lowerMessage.includes('not found');

        if (noLongerAvailable) {
          setStatusMessage('That song is no longer available in Community. Refreshing list.');
          void hydrateCommunity();
          return;
        }
      }

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

  const handlePreviewRenderModeChange = (mode: TabPreviewRenderMode) => {
    setPreviewRenderMode(mode);
  };

  return (
    <ScreenContainer>
      <View style={styles.navRow}>
        <AppSectionNav
          current="Import"
          onHome={() => navigation.navigate('Home')}
          onLibrary={() => navigation.navigate('Library')}
          onSetlist={() => navigation.navigate('Setlist')}
          onImport={() => navigation.navigate('Import')}
          onAICreate={() => navigation.navigate('AICreate')}
          onGoPro={() => navigation.navigate('Upgrade')}
          onAccount={() => navigation.navigate('Account')}
        />
      </View>

      {/* Dark nameplate banner */}
      <View style={styles.nameplate}>
        <View style={styles.nameplateInner}>
          <View style={styles.nameplateText}>
            <Text style={styles.nameplateTitle}>Dad Band Community 🎸</Text>
            <Text style={styles.nameplateSubtitle}>
              Borrow someone else's questionable work. Some of it's decent. Some of it… isn't.
            </Text>
            <View style={styles.warningPill}>
              <Text style={styles.warningPillText}>⚠️ Community tabs – quality not guaranteed</Text>
            </View>
          </View>
          <View style={styles.badgeSlap}>
            <DadBandBadge />
          </View>
        </View>
      </View>

      {/* Plan row — casual, not corporate */}
      <View style={styles.planRow}>
        {tier !== 'PRO' ? (
          <>
            <Text style={styles.planText}>
              {!communityUsageLoaded
                ? 'Checking community save allowance...'
                : hasUnlimitedCommunitySaves
                  ? 'Unlimited saves.'
                  : `${freeSaveSlotsLeft} save${freeSaveSlotsLeft === 1 ? '' : 's'} left on the free plan.`}
            </Text>
            <Pressable onPress={() => navigation.navigate('Upgrade')}>
              <Text style={styles.planLink}>Upgrade to Pro →</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.planText}>Pro: save everything (even the bad ones).</Text>
        )}
      </View>

      <Text style={styles.statusText}>{statusMessage}</Text>
      {communityUsageLoaded ? (
        <Text style={styles.statusText}>
          {hasUnlimitedCommunitySaves
            ? `${communitySongsSaved} saved. Unlimited plan allowance. Lifetime saves: ${communitySongsSavedTotal}.`
            : `${communitySongsSaved}/${planCommunitySaveLimit ?? 0} current saves. Lifetime saves: ${communitySongsSavedTotal}.`}
        </Text>
      ) : null}

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
            communityUsageLoaded &&
            !hasUnlimitedCommunitySaves &&
            communitySongsRemaining <= 0 &&
            !hasCommunitySave;
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
              authorComment={song.authorComment ?? null}
              voteScore={song.votes.upVotes - song.votes.downVotes}
              userVote={song.votes.currentUserVote}
              onPreview={() => {
                void handleOpenPreview(song);
              }}
              previewLabel={isPreviewLoading ? 'Loading...' : 'Preview Tab'}
              previewDisabled={isPreviewLoading || isSaving}
              onUpVote={() => {
                void handleVote(song.id, 'UP');
              }}
              onDownVote={() => {
                void handleVote(song.id, 'DOWN');
              }}
              voteDisabled={votingSongId === song.id}
              subtext={getSongQuip(song.id)}
              actionLabel={
                isOwner
                  ? song.ownershipStatus === 'ORPHANED'
                    ? 'Disowned'
                    : 'Your Song'
                  : isSaving
                    ? 'Moving...'
                    : isInLibrary
                      ? 'Already in library'
                      : limitReached
                        ? 'Upgrade for more saves'
                        : 'Steal This Tab'
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
        visible={Boolean(voteBlockedSongTitle)}
        transparent
        animationType="fade"
        onRequestClose={() => setVoteBlockedSongTitle(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.voteModalCard}>
            <Text style={styles.voteModalTitle}>Voting unavailable</Text>
            <Text style={styles.voteModalText}>
              {voteBlockedSongTitle
                ? `You can't vote on your own song: "${voteBlockedSongTitle}".`
                : 'You cannot vote on your own song.'}
            </Text>
            <View style={styles.voteModalActions}>
              <PrimaryButton
                label="OK"
                onPress={() => setVoteBlockedSongTitle(null)}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(previewData)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewData(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.previewModalCard}>
            {previewData ? (() => {
              const { data: displayPreviewData, isTruncated } =
                tier === 'PRO' ? { data: previewData, isTruncated: false } : getFreePreviewData(previewData);

              return (
                <>
                <View style={styles.previewHeader}>
              <View style={styles.previewTitleRow}>
                <Text style={styles.previewTitle}>{displayPreviewData.title}</Text>
                <View style={styles.previewRenderModeSelector}>
                  {(['ascii', 'svg'] as TabPreviewRenderMode[]).map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => handlePreviewRenderModeChange(mode)}
                      style={[
                        styles.previewRenderModeOption,
                        previewRenderMode === mode && styles.previewRenderModeOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.previewRenderModeOptionText,
                          previewRenderMode === mode && styles.previewRenderModeOptionTextActive,
                        ]}
                      >
                        {mode.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Text style={styles.previewMeta}>
                {displayPreviewData.artist} • {displayPreviewData.key} • {displayPreviewData.tuning}
              </Text>
              {displayPreviewData.authorComment?.trim() ? (
                <Text style={styles.previewComment}>{displayPreviewData.authorComment.trim()}</Text>
              ) : null}
              <AuthorChip author={displayPreviewData.author} fallbackName={displayPreviewData.artist} />
            </View>

                <ScrollView
                  style={styles.previewScroll}
                  contentContainerStyle={styles.previewScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <TabPagePreview
                    stringNames={displayPreviewData.stringNames}
                    bars={displayPreviewData.bars}
                    rowAnnotations={displayPreviewData.rowAnnotations}
                    rowBarCounts={displayPreviewData.rowBarCounts}
                    renderMode={previewRenderMode}
                    compact
                  />
                  {tier !== 'PRO' && isTruncated ? (
                    <>
                      <Text style={styles.previewUpsellNote}>
                        Showing first 2 rows only.
                      </Text>
                      <Pressable
                        onPress={() => navigation.navigate('Upgrade')}
                        style={styles.previewUpsellLinkWrap}
                      >
                        <Text style={styles.previewUpsellLink}>
                          Go Pro for full chart preview.
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
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
              );
            })() : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const NAMEPLATE_BG = '#1a120a';
const NAMEPLATE_TEXT = '#f5e6c8';
const NAMEPLATE_MUTED = '#a8957e';
const NAMEPLATE_GOLD = '#c8a96e';

const styles = StyleSheet.create({
  navRow: {
    marginBottom: 4,
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
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: palette.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  planText: {
    fontSize: 12,
    color: palette.textMuted,
  },
  planLink: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.accent,
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
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: palette.text,
    flex: 1,
  },
  previewRenderModeSelector: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  previewRenderModeOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: palette.surfaceMuted,
  },
  previewRenderModeOptionActive: {
    backgroundColor: palette.primary,
  },
  previewRenderModeOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.textMuted,
  },
  previewRenderModeOptionTextActive: {
    color: '#f8fafc',
  },
  previewMeta: {
    fontSize: 13,
    color: palette.textMuted,
  },
  previewComment: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: palette.text,
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
  previewUpsellNote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: palette.textMuted,
    fontWeight: '700',
  },
  previewUpsellLinkWrap: {
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  previewUpsellLink: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
    color: palette.accent,
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  voteModalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 18,
    gap: 12,
  },
  voteModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.text,
  },
  voteModalText: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textMuted,
  },
  voteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
