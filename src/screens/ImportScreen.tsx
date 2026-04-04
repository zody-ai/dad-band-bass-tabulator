import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { BassTabApiError, createBassTabApiFromEnv } from '../api';
import { AppSectionNav } from '../components/AppSectionNav';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { communitySongs } from '../data/communitySongs';
import {
  FREE_PLAN_LIMITS,
  resolveUpgradeTrigger,
  useSubscription,
  useUpgradePrompt,
} from '../features/subscription';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { createId } from '../utils/ids';
import { parseTab } from '../utils/tabLayout';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Import'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface CommunitySongListItem {
  id: string;
  title: string;
  artist: string;
  key: string;
  tuning: string;
  feelNote: string;
  tab?: string;
  source: 'backend' | 'seed';
}

const storageKeys = {
  savedCommunitySongIds: 'basstab:community-saved-song-ids',
};

const isCommunityAlreadySavedError = (error: unknown): boolean => {
  if (error instanceof BassTabApiError) {
    const code = error.code?.toUpperCase();

    if (code === 'COMMUNITY_ALREADY_SAVED' || code === 'COMMUNITY_SONG_ALREADY_SAVED') {
      return true;
    }

    if (error.status === 400 && /already saved/i.test(error.message)) {
      return true;
    }
  }

  if (error instanceof Error) {
    return /already saved/i.test(error.message);
  }

  return false;
};

export function ImportScreen({ navigation }: Props) {
  const { tier, capabilities } = useSubscription();
  const { showUpgradePrompt } = useUpgradePrompt();
  const { songs, createSong, updateSong } = useBassTab();
  const backendApi = useMemo(() => createBassTabApiFromEnv(), []);
  const [communityCatalog, setCommunityCatalog] = useState<CommunitySongListItem[]>(
    communitySongs.map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      key: song.key,
      tuning: song.tuning,
      feelNote: 'Community chart',
      tab: song.tab,
      source: 'seed',
    })),
  );
  const [savedCommunitySongIds, setSavedCommunitySongIds] = useState<string[]>([]);
  const [savingSongId, setSavingSongId] = useState<string | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(Boolean(backendApi));
  const [statusMessage, setStatusMessage] = useState('Browse community charts and save the ones you want to play.');

  useEffect(() => {
    let isMounted = true;

    const hydrateCommunity = async () => {
      try {
        if (backendApi) {
          setLoadingCatalog(true);
          const [savedSongs, releasedSongs] = await Promise.all([
            backendApi.listSavedCommunitySongs(),
            backendApi.listCommunitySongs(),
          ]);

          if (isMounted) {
            setSavedCommunitySongIds(savedSongs.map((item) => item.communitySongId));
            setCommunityCatalog(
              releasedSongs.map((song) => ({
                id: song.id,
                title: song.title,
                artist: song.artist,
                key: song.key,
                tuning: song.tuning,
                feelNote: song.feelNote,
                source: 'backend',
              })),
            );
            if (releasedSongs.length === 0) {
              setStatusMessage('No community charts have been released yet.');
            }
            setLoadingCatalog(false);
          }

          return;
        }

        const stored = await AsyncStorage.getItem(storageKeys.savedCommunitySongIds);
        const parsed = stored ? (JSON.parse(stored) as unknown) : [];

        if (!isMounted) {
          return;
        }

        if (Array.isArray(parsed)) {
          setSavedCommunitySongIds(parsed.filter((item): item is string => typeof item === 'string'));
        }
      } catch (error) {
        console.warn('Community song save hydrate failed', error);
        if (isMounted) {
          setLoadingCatalog(false);
        }
      }
    };

    void hydrateCommunity();

    return () => {
      isMounted = false;
    };
  }, [backendApi]);

  const handleSaveCommunitySong = async (communitySongId: string) => {
    const selectedSong = communityCatalog.find((song) => song.id === communitySongId);

    if (!selectedSong || savingSongId) {
      return;
    }

    const hasCommunitySave = savedCommunitySongIds.includes(selectedSong.id);
    const maxCommunitySaves = capabilities.maxCommunitySongs ?? FREE_PLAN_LIMITS.communitySaves;
    const maxSongs = capabilities.maxSongs ?? FREE_PLAN_LIMITS.songs;

    if (tier === 'FREE' && songs.length >= maxSongs) {
      showUpgradePrompt('SONG_LIMIT');
      return;
    }

    if (tier === 'FREE' && !hasCommunitySave && savedCommunitySongIds.length >= maxCommunitySaves) {
      showUpgradePrompt('COMMUNITY_SAVE');
      return;
    }

    setSavingSongId(selectedSong.id);

    try {
      let chartStringNames: string[] = [];
      let chartBars = [] as ReturnType<typeof parseTab>['bars'];

      let newlySavedToCommunity = false;

      if (backendApi) {
        if (!hasCommunitySave) {
          try {
            await backendApi.saveCommunitySong({ communitySongId: selectedSong.id });
            newlySavedToCommunity = true;
          } catch (error) {
            if (!isCommunityAlreadySavedError(error)) {
              throw error;
            }
          }
        }

        const releasedSong = await backendApi.getCommunitySong(selectedSong.id);
        const createdSong = await createSong({
          title: releasedSong.title,
          artist: releasedSong.artist,
          key: releasedSong.key,
          feelNote: releasedSong.feelNote,
          tuning: releasedSong.tuning,
        });

        updateSong(createdSong.id, {
          stringNames: releasedSong.chart.stringNames,
          rows: releasedSong.chart.rows,
          releasedToCommunity: false,
          communityReleasedAt: null,
        });

        if (!newlySavedToCommunity && hasCommunitySave) {
          setStatusMessage(`Added "${selectedSong.title}" to your library.`);
        }
      } else {
        const parsed = parseTab(selectedSong.tab ?? '');
        chartStringNames = parsed.stringNames;
        chartBars = parsed.bars;

        const createdSong = await createSong({
          title: selectedSong.title,
          artist: selectedSong.artist,
          key: selectedSong.key,
          tuning: selectedSong.tuning,
        });

        updateSong(createdSong.id, {
          key: selectedSong.key,
          tuning: selectedSong.tuning,
          stringNames: chartStringNames,
          rows: [
            {
              id: createId('row'),
              label: 'Community Row',
              beforeText: '',
              afterText: '',
              bars: chartBars,
            },
          ],
        });
      }

      const nextSavedIds = savedCommunitySongIds.includes(selectedSong.id)
        ? savedCommunitySongIds
        : [selectedSong.id, ...savedCommunitySongIds];
      setSavedCommunitySongIds(nextSavedIds);
      if (nextSavedIds !== savedCommunitySongIds) {
        setStatusMessage(`Saved "${selectedSong.title}" to your library.`);
      } else {
        setStatusMessage(`Added "${selectedSong.title}" to your library.`);
      }

      if (!backendApi) {
        await AsyncStorage.setItem(storageKeys.savedCommunitySongIds, JSON.stringify(nextSavedIds));
      }
    } catch (error) {
      const trigger = resolveUpgradeTrigger(error);

      if (trigger) {
        showUpgradePrompt(trigger);
        return;
      }

      const message = error instanceof Error ? error.message : 'Could not save this community chart.';
      setStatusMessage(message);
    } finally {
      setSavingSongId(null);
    }
  };

  const freeSaveSlotsLeft = useMemo(
    () => Math.max(0, (capabilities.maxCommunitySongs ?? FREE_PLAN_LIMITS.communitySaves) - savedCommunitySongIds.length),
    [capabilities.maxCommunitySongs, savedCommunitySongIds.length],
  );

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
          onGoPro={() => navigation.navigate('Upgrade')}
        />
      </View>

      <View style={styles.planBanner}>
        <Text style={styles.planTitle}>
          {tier === 'PRO' ? 'Pro Community Access' : 'Free Community Access'}
        </Text>
        <Text style={styles.planText}>
          {tier === 'PRO'
            ? 'You can save every community song you need.'
            : `${freeSaveSlotsLeft} of ${capabilities.maxCommunitySongs ?? FREE_PLAN_LIMITS.communitySaves} free saves left. Upgrade to unlock unlimited saves.`}
        </Text>
      </View>

      <Text style={styles.statusText}>{statusMessage}</Text>

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
        communityCatalog.map((song) => {
          const isSaving = savingSongId === song.id;

          return (
            <View key={song.id} style={styles.card}>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{song.title}</Text>
                <Text style={styles.cardMeta}>
                  {song.artist} • {song.key} • {song.tuning}
                </Text>
              </View>

              <PrimaryButton
                label={isSaving ? 'Saving...' : 'Save to Library'}
                onPress={() => {
                  void handleSaveCommunitySong(song.id);
                }}
                disabled={isSaving}
                variant="primary"
                size="compact"
              />
            </View>
          );
        })
      )}
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
  statusText: {
    fontSize: 13,
    lineHeight: 20,
    color: palette.textMuted,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
  },
  cardCopy: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  cardMeta: {
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 20,
  },
});
