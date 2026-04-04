import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionEditorCard } from '../components/SectionEditorCard';
import { SongMetaFields } from '../components/SongMetaFields';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { useSubscription } from '../features/subscription';
import { RootStackParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { Song } from '../types/models';
import { formatUpdatedAt } from '../utils/date';
import { flattenSongRowsToChart } from '../utils/songChart';

type Props = NativeStackScreenProps<RootStackParamList, 'SongEditor'>;

export function SongEditorScreen({ navigation, route }: Props) {
  const { songId } = route.params;
  const { tier } = useSubscription();
  const { songs, updateSong, updateSongChart } = useBassTab();

  const song = songs.find((item) => item.id === songId);

  if (!song) {
    return (
      <ScreenContainer contentStyle={styles.centered}>
        <EmptyState
          title="Song missing"
          description="This chart could not be found in the local store."
        />
      </ScreenContainer>
    );
  }

  const handleFieldChange = <K extends keyof Song>(field: K, value: Song[K]) => {
    updateSong(song.id, { [field]: value } as Partial<Song>);
  };

  const chart = flattenSongRowsToChart(song);

  const handleChartChange = (updates: Partial<typeof chart>) => {
    updateSongChart(song.id, {
      tab: updates.tab ?? chart.tab,
      rowAnnotations: updates.rowAnnotations ?? chart.rowAnnotations ?? [],
      rowBarCounts: updates.rowBarCounts ?? chart.rowBarCounts ?? [],
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.headingBlock}>
          <Text style={styles.title}>Dad Band Bass Song Editor</Text>
          <Text style={styles.subtitle}>
            Tidy your chart, shape the bars, and get it ready for rehearsal.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <PrimaryButton
            label="Tab Library"
            onPress={() => navigation.navigate('MainTabs')}
            variant="ghost"
          />
          <PrimaryButton
            label="Open Performance View"
            onPress={() => navigation.navigate('PerformanceView', { songId: song.id })}
            variant="secondary"
          />
          <PrimaryButton
            label={tier === 'PRO' ? 'Export Song PDF' : 'Export Song PDF (PRO)'}
            onPress={() => navigation.navigate('ExportSong', { songId: song.id })}
            variant="ghost"
          />
        </View>
      </View>

      <SongMetaFields song={song} onFieldChange={handleFieldChange} />

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Fast Tab Editor</Text>
          <Text style={styles.sectionSubtitle}>
            Edit one row at a time. New rows start with 4 bars and can be resized from 1 to 8.
          </Text>
          <Text style={styles.sectionMeta}>
            Last updated {formatUpdatedAt(song.updatedAt)}
          </Text>
        </View>
      </View>

      <SectionEditorCard
        key={chart.id}
        section={chart}
        index={0}
        isFirst
        isLast
        showSectionControls={false}
        onChange={handleChartChange}
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onDelete={() => {}}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    gap: 16,
  },
  headingBlock: {
    gap: 6,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    color: palette.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: palette.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.textMuted,
    marginTop: 4,
  },
  sectionMeta: {
    fontSize: 13,
    color: palette.textMuted,
    marginTop: 4,
  },
});
