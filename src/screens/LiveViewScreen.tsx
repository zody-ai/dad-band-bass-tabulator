import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabPagePreview } from '../components/TabPagePreview';
import { palette } from '../constants/colors';
import { RootStackParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { flattenSongRowsToChart } from '../utils/songChart';
import { parseTab } from '../utils/tabLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'PerformanceView'>;

export function LiveViewScreen({ route }: Props) {
  const { songId } = route.params;
  const { songs } = useBassTab();
  const { width } = useWindowDimensions();
  const isPhone = width < 760;
  const isTablet = width >= 760 && width < 1100;
  const useCompactPreview = width < 960;
  const horizontalPadding = isPhone ? 12 : 20;
  const availableCanvasWidth = Math.max(320, width - horizontalPadding * 2);
  const canvasWidth = isPhone
    ? Math.max(620, availableCanvasWidth)
    : Math.min(Math.max(720, availableCanvasWidth), 980);
  const song = songs.find((item) => item.id === songId);
  const chart = useMemo(
    () => (song ? flattenSongRowsToChart(song) : undefined),
    [song],
  );
  const tabPreview = useMemo(() => {
    if (!chart) {
      return null;
    }

    const { stringNames, bars } = parseTab(chart.tab);

    return (
      <TabPagePreview
        stringNames={stringNames}
        bars={bars}
        rowAnnotations={chart.rowAnnotations ?? []}
        rowBarCounts={chart.rowBarCounts}
        tone="dark"
        compact={useCompactPreview}
      />
    );
  }, [chart, useCompactPreview]);

  if (!song || !chart) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.songTitle}>Song unavailable</Text>
          <Text style={styles.emptyText}>
            The requested chart is not in the local session.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, isPhone && styles.headerNarrow]}>
        <Text style={[styles.songTitle, isPhone && styles.songTitleNarrow]}>{song.title}</Text>
        <Text style={[styles.subtitle, isPhone && styles.subtitleNarrow]}>
          {song.artist} • {song.key} • {song.tuning}
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, isPhone && styles.contentContainerNarrow]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.pageSheet, isPhone && styles.pageSheetPhone]}>
          <View
            style={[
              styles.pageMeta,
              isPhone ? styles.pageMetaPhone : { width: Math.min(canvasWidth, availableCanvasWidth) },
            ]}
          >
            <Text style={styles.pageHeading}>Performance Chart</Text>
            <Text style={styles.pageSubheading}>
              {isPhone
                ? 'Scroll sideways for the full chart'
                : isTablet
                  ? 'Tablet stage view with a wider reading layout'
                  : 'Full song, A4 reading layout'}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={isPhone || isTablet}
            contentContainerStyle={[
              styles.canvasScroller,
              isPhone && styles.canvasScrollerPhone,
              !isPhone && styles.canvasScrollerWide,
            ]}
          >
            <View
              style={[
                styles.pageCanvas,
                isPhone && styles.pageCanvasNarrow,
                { width: canvasWidth, maxWidth: canvasWidth },
              ]}
            >
              {tabPreview}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.liveBackground,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 4,
  },
  headerNarrow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  songTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.liveText,
  },
  songTitleNarrow: {
    fontSize: 26,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: palette.liveMuted,
  },
  subtitleNarrow: {
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  contentContainerNarrow: {
    paddingHorizontal: 12,
    paddingBottom: 18,
  },
  pageSheet: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  pageSheetPhone: {
    alignItems: 'stretch',
  },
  pageMeta: {
    maxWidth: '100%',
    gap: 4,
  },
  pageMetaPhone: {
    width: '100%',
  },
  pageHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.liveAccent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pageSubheading: {
    fontSize: 14,
    color: palette.liveMuted,
  },
  pageCanvas: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  pageCanvasNarrow: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  canvasScroller: {
    minWidth: '100%',
  },
  canvasScrollerPhone: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  canvasScrollerWide: {
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 22,
    lineHeight: 32,
    color: palette.liveText,
    textAlign: 'center',
  },
});
