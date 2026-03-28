import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmptyState } from '../components/EmptyState';
import { AppSectionNav } from '../components/AppSectionNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { palette } from '../constants/colors';
import { FREE_SETLIST_TITLE } from '../constants/setlist';
import { brandDisplayFontFamily } from '../constants/typography';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { Song } from '../types/models';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Setlist'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function SetlistScreen({ navigation }: Props) {
  const { songs, setlist, reorderSetlist } = useBassTab();

  const orderedSongs = useMemo(
    () =>
      setlist.songIds
        .map((songId) => songs.find((song) => song.id === songId))
        .filter(Boolean) as Song[],
    [setlist.songIds, songs],
  );

  const availableSongs = useMemo(
    () => songs.filter((song) => !setlist.songIds.includes(song.id)),
    [setlist.songIds, songs],
  );

  const moveSong = (songId: string, direction: -1 | 1) => {
    const index = setlist.songIds.findIndex((id) => id === songId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= setlist.songIds.length) {
      return;
    }

    const nextSongIds = [...setlist.songIds];
    const [movedSongId] = nextSongIds.splice(index, 1);
    nextSongIds.splice(nextIndex, 0, movedSongId);
    reorderSetlist(nextSongIds);
  };

  const removeSong = (songId: string) => {
    reorderSetlist(setlist.songIds.filter((id) => id !== songId));
  };

  const addSong = (songId: string) => {
    reorderSetlist([...setlist.songIds, songId]);
  };

  return (
    <ScreenContainer contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{FREE_SETLIST_TITLE}</Text>
          <Text style={styles.subtitle}>
            The free version keeps one running order for the whole night. Move songs fast and keep the set tight.
          </Text>
        </View>
        <AppSectionNav
          current="Setlist"
          onLibrary={() => navigation.navigate('Library')}
          onSetlist={() => navigation.navigate('Setlist')}
          onAbout={() => navigation.navigate('Welcome')}
        />
        <View style={styles.headerActions}>
          {orderedSongs.length > 0 ? (
            <PrimaryButton
              label="Export Multi-Page PDF"
              onPress={() => navigation.navigate('ExportSetlist')}
              variant="ghost"
            />
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Order</Text>
        <Text style={styles.sectionSubtitle}>
          Songs in the order the drummer will probably count in wrong.
        </Text>

        {orderedSongs.length === 0 ? (
          <EmptyState
            title="Setlist is empty"
            description="Add a song from the library section below."
          />
        ) : (
          orderedSongs.map((song, index) => (
            <View key={song.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{index + 1}</Text>
                </View>
                <View style={styles.copyBlock}>
                  <Text style={styles.songTitle}>{song.title}</Text>
                  <Text style={styles.artistText}>{song.artist}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{song.key}</Text>
                <Text style={styles.metaText}>{song.tuning}</Text>
              </View>

              <View style={styles.actions}>
                <PrimaryButton
                  label="Open"
                  onPress={() => navigation.navigate('PerformanceView', { songId: song.id })}
                  variant="ghost"
                  size="compact"
                />
                <PrimaryButton
                  label="Up"
                  onPress={() => moveSong(song.id, -1)}
                  variant="secondary"
                  size="compact"
                />
                <PrimaryButton
                  label="Down"
                  onPress={() => moveSong(song.id, 1)}
                  variant="secondary"
                  size="compact"
                />
                <PrimaryButton
                  label="Remove"
                  onPress={() => removeSong(song.id)}
                  variant="danger"
                  size="compact"
                />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add From Library</Text>
        <Text style={styles.sectionSubtitle}>
          Pull in anything you might need before the next rehearsal detour.
        </Text>

        {availableSongs.length === 0 ? (
          <EmptyState
            title="No more songs to add"
            description="Every library song is already in the setlist."
          />
        ) : (
          availableSongs.map((song) => (
            <View key={song.id} style={styles.libraryCard}>
              <View style={styles.libraryCopy}>
                <Text style={styles.libraryTitle}>{song.title}</Text>
                <Text style={styles.libraryMeta}>
                  {song.artist} • {song.key} • {song.tuning}
                </Text>
              </View>
              <PrimaryButton
                label="Add"
                onPress={() => addSong(song.id)}
                size="compact"
              />
            </View>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 28,
  },
  header: {
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerCopy: {
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
    lineHeight: 24,
    color: '#4b5563',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: palette.text,
  },
  sectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textMuted,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  orderBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: palette.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.primary,
  },
  copyBlock: {
    flex: 1,
    gap: 4,
  },
  songTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  artistText: {
    fontSize: 15,
    color: palette.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaText: {
    fontSize: 14,
    color: palette.textMuted,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  libraryCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  libraryCopy: {
    flex: 1,
    gap: 4,
  },
  libraryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  libraryMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.textMuted,
  },
});
