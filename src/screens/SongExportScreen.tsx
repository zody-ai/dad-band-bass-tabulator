import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabPagePreview } from '../components/TabPagePreview';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { RootStackParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { flattenSongRowsToChart } from '../utils/songChart';
import { parseTab } from '../utils/tabLayout';
import { useWebPrintStyles } from '../utils/useWebPrintStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'ExportSong'>;

const printCss = `
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  @media print {
    html, body {
      background: white !important;
    }

    body * {
      visibility: hidden !important;
    }

    #song-export-print-root,
    #song-export-print-root * {
      visibility: visible !important;
    }

    #song-export-print-root {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: white !important;
      box-shadow: none !important;
    }
  }
`;

export function SongExportScreen({ route }: Props) {
  const { songId } = route.params;
  const { songs } = useBassTab();
  const song = songs.find((item) => item.id === songId);
  useWebPrintStyles('song-export-print-styles', printCss);

  if (!song) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Song unavailable</Text>
          <Text style={styles.emptyText}>
            This chart could not be found in the local session.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const chart = flattenSongRowsToChart(song);
  const { stringNames, bars } = parseTab(chart.tab);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toolbar}>
          <View style={styles.toolbarCopy}>
            <Text style={styles.toolbarTitle}>Dad Band Bass Export Song</Text>
            <Text style={styles.toolbarSubtitle}>
              No signal at the gig? Save this chart as a PDF and keep it on your device.
            </Text>
          </View>

          {Platform.OS === 'web' ? (
            <Pressable
              onPress={() => {
                if (typeof window !== 'undefined') {
                  window.print();
                }
              }}
              style={({ pressed }) => [styles.printButton, pressed && styles.pressed]}
            >
              <Text style={styles.printButtonLabel}>Print / Save PDF</Text>
            </Pressable>
          ) : null}
        </View>

        <View nativeID="song-export-print-root" style={styles.pageSheet}>
          <View style={styles.pageHeader}>
            <View style={styles.pageTitleBlock}>
              <Text style={styles.songTitle}>{song.title}</Text>
              <Text style={styles.songSubtitle}>{song.artist}</Text>
            </View>

            <View style={styles.metaGrid}>
              <MetaPill label="Key" value={song.key} />
              <MetaPill label="Tuning" value={song.tuning} />
            </View>
          </View>

          <View style={styles.chartBody}>
            <TabPagePreview
              stringNames={stringNames}
              bars={bars}
              rowAnnotations={chart.rowAnnotations ?? []}
              rowBarCounts={chart.rowBarCounts}
              tone="light"
              compact
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ece7df',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 10,
  },
  toolbar: {
    width: '100%',
    maxWidth: 820,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  toolbarCopy: {
    flex: 1,
    gap: 4,
  },
  toolbarTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: '#111827',
  },
  toolbarSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
  },
  printButton: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  pageSheet: {
    width: '100%',
    maxWidth: 820,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    gap: 14,
  },
  pageHeader: {
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    paddingBottom: 12,
  },
  pageTitleBlock: {
    gap: 4,
  },
  songTitle: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: '#111827',
  },
  songSubtitle: {
    fontSize: 16,
    color: '#4b5563',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f5f5f4',
    gap: 2,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  chartBody: {
    gap: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  emptyText: {
    fontSize: 17,
    lineHeight: 25,
    color: '#4b5563',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
