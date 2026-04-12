import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { TabPagePreview, TabPreviewRenderMode } from '../components/TabPagePreview';
import { palette } from '../constants/colors';
import { useSubscription, useUpgradePrompt } from '../features/subscription';
import { RootStackParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { Song, SongChart } from '../types/models';
import { flattenSongRowsToChart } from '../utils/songChart';
import { ParsedBar, parseTab } from '../utils/tabLayout';

type Props = NativeStackScreenProps<RootStackParamList, 'SetlistPerformance'>;
type PerformanceTone = 'light' | 'dark';

interface PerformancePage {
  bars: ParsedBar[];
  rowAnnotations: SongChart['rowAnnotations'];
  rowBarCounts: number[];
}

interface PerformanceItem {
  song: Song;
  stringNames: string[];
  pages: PerformancePage[];
}

const buildPages = (chart: SongChart, bars: ParsedBar[]): PerformancePage[] => {
  const counts = (chart.rowBarCounts ?? []).filter((count) => count > 0);

  if (counts.length === 0) {
    return [
      {
        bars,
        rowAnnotations: chart.rowAnnotations ?? [],
        rowBarCounts: [Math.max(1, bars.length)],
      },
    ];
  }

  let cursor = 0;
  const pages: PerformancePage[] = counts.map((count, rowIndex) => {
    const nextCount = Math.max(1, count);
    const nextBars = bars.slice(cursor, cursor + nextCount);
    const annotation = chart.rowAnnotations[rowIndex];

    cursor += nextCount;

    return {
      bars: nextBars,
      rowAnnotations: annotation ? [annotation] : [],
      rowBarCounts: [Math.max(1, nextBars.length || nextCount)],
    };
  });

  if (cursor < bars.length) {
    const remainderBars = bars.slice(cursor);
    pages.push({
      bars: remainderBars,
      rowAnnotations: [],
      rowBarCounts: [Math.max(1, remainderBars.length)],
    });
  }

  return pages.length > 0
    ? pages
    : [
      {
        bars,
        rowAnnotations: chart.rowAnnotations ?? [],
        rowBarCounts: [Math.max(1, bars.length)],
      },
    ];
};

export function SetlistPerformanceScreen({ route }: Props) {
  const { setlistId, startSongId } = route.params ?? {};
  const { capabilities } = useSubscription();
  const { showUpgradePrompt } = useUpgradePrompt();
  const { width } = useWindowDimensions();
  const { songs, setlists, activeSetlistId } = useBassTab();
  const [renderMode, setRenderMode] = useState<TabPreviewRenderMode>('ascii');
  const [tone, setTone] = useState<PerformanceTone>('dark');
  const hasAutoSelectedSvgModeRef = useRef(false);
  const [songIndex, setSongIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const appliedStartSongIdRef = useRef<string | null>(null);

  const selectedSetlist =
    setlists.find((item) => item.id === setlistId) ??
    setlists.find((item) => item.id === activeSetlistId) ??
    setlists[0];

  const orderedSongs = useMemo(
    () =>
      (selectedSetlist?.songIds ?? [])
        .map((songId) => songs.find((song) => song.id === songId))
        .filter(Boolean) as Song[],
    [selectedSetlist?.songIds, songs],
  );

  const performanceItems = useMemo<PerformanceItem[]>(() => {
    return orderedSongs.map((song) => {
      const chart = flattenSongRowsToChart(song);
      const parsed = parseTab(chart.tab);
      return {
        song,
        stringNames: parsed.stringNames.length > 0 ? parsed.stringNames : song.stringNames,
        pages: buildPages(chart, parsed.bars),
      };
    });
  }, [orderedSongs]);

  useEffect(() => {
    if (!startSongId || performanceItems.length === 0) {
      return;
    }

    if (appliedStartSongIdRef.current === startSongId) {
      return;
    }

    const nextSongIndex = performanceItems.findIndex((item) => item.song.id === startSongId);
    if (nextSongIndex >= 0 && nextSongIndex !== songIndex) {
      setSongIndex(nextSongIndex);
      setPageIndex(0);
    }
    appliedStartSongIdRef.current = startSongId;
  }, [performanceItems, songIndex, startSongId]);

  useEffect(() => {
    if (performanceItems.length === 0) {
      if (songIndex !== 0) {
        setSongIndex(0);
      }
      if (pageIndex !== 0) {
        setPageIndex(0);
      }
      return;
    }

    if (songIndex > performanceItems.length - 1) {
      setSongIndex(performanceItems.length - 1);
      setPageIndex(0);
    }
  }, [pageIndex, performanceItems.length, songIndex]);

  const safeSongIndex =
    performanceItems.length === 0
      ? 0
      : Math.min(songIndex, performanceItems.length - 1);
  const currentItem = performanceItems[safeSongIndex];
  const totalSongs = performanceItems.length;
  const pages = currentItem?.pages ?? [];
  const safePageIndex = pages.length === 0 ? 0 : Math.min(pageIndex, pages.length - 1);
  const currentPage = pages[safePageIndex];

  useEffect(() => {
    if (pages.length === 0) {
      if (pageIndex !== 0) {
        setPageIndex(0);
      }
      return;
    }

    if (pageIndex > pages.length - 1) {
      setPageIndex(pages.length - 1);
    }
  }, [pageIndex, pages.length]);

  const isPhone = width < 760;
  const useCompactPreview = width < 960;
  const horizontalPadding = isPhone ? 12 : 20;
  const availableCanvasWidth = Math.max(320, width - horizontalPadding * 2);
  const canvasWidth = isPhone
    ? Math.max(620, availableCanvasWidth)
    : Math.min(Math.max(720, availableCanvasWidth), 980);
  const canvasHorizontalPadding = isPhone ? 14 : 24;
  const svgViewportWidth = Math.max(240, canvasWidth - canvasHorizontalPadding * 2);

  const handleRenderModeChange = (mode: TabPreviewRenderMode) => {
    if (mode === 'svg' && !capabilities.svgEnabled) {
      showUpgradePrompt('SVG_MODE');
      return;
    }

    setRenderMode(mode);
  };
  const handleToneChange = (nextTone: PerformanceTone) => {
    setTone(nextTone);
  };

  useEffect(() => {
    if (hasAutoSelectedSvgModeRef.current) {
      return;
    }

    if (!capabilities.svgEnabled) {
      return;
    }

    hasAutoSelectedSvgModeRef.current = true;
    setRenderMode('svg');
  }, [capabilities.svgEnabled]);

  const handleNextPage = () => {
    if (!currentItem) {
      return;
    }

    if (safePageIndex < currentItem.pages.length - 1) {
      setPageIndex(safePageIndex + 1);
      return;
    }

    if (safeSongIndex < totalSongs - 1) {
      setSongIndex(safeSongIndex + 1);
      setPageIndex(0);
    }
  };

  const handlePrevPage = () => {
    if (!currentItem) {
      return;
    }

    if (safePageIndex > 0) {
      setPageIndex(safePageIndex - 1);
      return;
    }

    if (safeSongIndex > 0) {
      const previousSongIndex = safeSongIndex - 1;
      const previousPageCount = performanceItems[previousSongIndex]?.pages.length ?? 1;
      setSongIndex(previousSongIndex);
      setPageIndex(Math.max(0, previousPageCount - 1));
    }
  };

  const handleNextSong = () => {
    if (safeSongIndex >= totalSongs - 1) {
      return;
    }

    setSongIndex(safeSongIndex + 1);
    setPageIndex(0);
  };

  const handlePrevSong = () => {
    if (safeSongIndex <= 0) {
      return;
    }

    setSongIndex(safeSongIndex - 1);
    setPageIndex(0);
  };

  if (!selectedSetlist || performanceItems.length === 0 || !currentItem || !currentPage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.songTitle}>Setlist is empty</Text>
          <Text style={styles.emptyText}>
            Add songs to a setlist first, then use Play Setlist.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.header, isPhone && styles.headerNarrow]}>
        <Text style={[styles.setlistTitle, isPhone && styles.setlistTitleNarrow]}>
          {selectedSetlist.name}
        </Text>
        <View style={styles.titleRow}>
          <Text style={[styles.songTitle, isPhone && styles.songTitleNarrow]} numberOfLines={1}>
            {currentItem.song.title}
          </Text>
          <View style={styles.titleControls}>
            <View style={styles.renderModeSelector}>
              {(['ascii', 'svg'] as TabPreviewRenderMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => handleRenderModeChange(mode)}
                  style={[
                    styles.renderModeOption,
                    renderMode === mode && styles.renderModeOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.renderModeOptionText,
                      renderMode === mode && styles.renderModeOptionTextActive,
                    ]}
                  >
                    {mode === 'svg' && !capabilities.svgEnabled ? 'SVG PRO' : mode.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.renderModeSelector}>
              {(['light', 'dark'] as PerformanceTone[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => handleToneChange(value)}
                  style={[
                    styles.renderModeOption,
                    styles.toneModeOption,
                    tone === value && styles.renderModeOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.renderModeOptionText,
                      tone === value && styles.renderModeOptionTextActive,
                    ]}
                  >
                    {isPhone ? (value === 'light' ? 'LT' : 'DK') : value.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <Text style={[styles.subtitle, isPhone && styles.subtitleNarrow]}>
          {currentItem.song.artist} • {currentItem.song.key} • {currentItem.song.tuning}
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
            <Text style={styles.pageSubheading}>
              Song {safeSongIndex + 1}/{totalSongs} • Page {safePageIndex + 1}/{pages.length}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={isPhone}
            contentContainerStyle={[styles.canvasScroller, isPhone && styles.canvasScrollerPhone]}
          >
            <View
              style={[
                styles.pageCanvas,
                isPhone && styles.pageCanvasNarrow,
                tone === 'light' ? styles.pageCanvasLight : styles.pageCanvasDark,
                { width: canvasWidth, maxWidth: canvasWidth },
              ]}
            >
              <TabPagePreview
                stringNames={currentItem.stringNames}
                bars={currentPage.bars}
                rowAnnotations={currentPage.rowAnnotations}
                rowBarCounts={currentPage.rowBarCounts}
                tone={tone}
                compact={useCompactPreview}
                renderMode={renderMode}
                svgScaleProfile="performance"
                svgViewportWidth={svgViewportWidth}
              />
            </View>
          </ScrollView>

          <View style={[styles.controlsCard, isPhone && styles.controlsCardPhone]}>
            <View style={styles.controlsRow}>
              <PrimaryButton
                label="Prev Page"
                onPress={handlePrevPage}
                variant="ghost"
                size="compact"
                disabled={safeSongIndex === 0 && safePageIndex === 0}
              />
              <PrimaryButton
                label="Next Page"
                onPress={handleNextPage}
                variant="secondary"
                size="compact"
                disabled={safeSongIndex === totalSongs - 1 && safePageIndex === pages.length - 1}
              />
            </View>
            <View style={styles.controlsRow}>
              <PrimaryButton
                label="Prev Song"
                onPress={handlePrevSong}
                variant="ghost"
                size="compact"
                disabled={safeSongIndex === 0}
              />
              <PrimaryButton
                label="Next Song"
                onPress={handleNextSong}
                variant="secondary"
                size="compact"
                disabled={safeSongIndex >= totalSongs - 1}
              />
            </View>
          </View>
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
    paddingTop: 0,
    paddingBottom: 4,
    gap: 1,
  },
  headerNarrow: {
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  setlistTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    color: palette.liveAccent,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  setlistTitleNarrow: {
    fontSize: 11,
    lineHeight: 14,
  },
  songTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: palette.liveText,
    flex: 1,
    minWidth: 0,
  },
  songTitleNarrow: {
    fontSize: 21,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    color: palette.liveMuted,
  },
  subtitleNarrow: {
    fontSize: 12,
    lineHeight: 16,
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
    gap: 6,
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
  pageSubheading: {
    fontSize: 13,
    color: palette.liveMuted,
  },
  renderModeControl: {
    gap: 4,
    marginTop: 4,
  },
  renderModeSelector: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  titleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  renderModeOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
  },
  renderModeOptionActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#1e293b',
  },
  renderModeOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  renderModeOptionTextActive: {
    color: '#dbeafe',
  },
  toneModeOption: {
    minWidth: 34,
    alignItems: 'center',
  },
  canvasScroller: {
    minWidth: '100%',
    justifyContent: 'center',
  },
  canvasScrollerPhone: {
    justifyContent: 'flex-start',
  },
  pageCanvas: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
  },
  pageCanvasDark: {
    backgroundColor: '#0b1120',
    borderColor: '#1f2937',
  },
  pageCanvasLight: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  pageCanvasNarrow: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  controlsCard: {
    width: '100%',
    maxWidth: 980,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    padding: 10,
    gap: 8,
  },
  controlsCardPhone: {
    padding: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    lineHeight: 26,
    color: palette.liveText,
    textAlign: 'center',
  },
});
