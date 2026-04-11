import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Circle, Svg, Text as SvgText } from 'react-native-svg';

import { EmptyState } from '../components/EmptyState';
import { AppSectionNav } from '../components/AppSectionNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionEditorCard } from '../components/SectionEditorCard';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { tuningOptions } from '../constants/tunings';
import { useSubscription, useUpgradePrompt } from '../features/subscription';
import { useAuth } from '../features/auth';
import { RootStackParamList } from '../navigation/types';
import { useBassTab, buildDefaultStringNames } from '../store/BassTabProvider';
import { Song, SongChart } from '../types/models';
import { formatUpdatedAt } from '../utils/date';
import { flattenSongRowsToChart, mergeChartIntoSongRows } from '../utils/songChart';
import {
  DEFAULT_BEAT_COUNT,
  MAX_BEAT_COUNT,
  MIN_BEAT_COUNT,
  getSlotsPerBar,
  normalizeBeatCount,
  parseTab,
} from '../utils/tabLayout';
import { createId } from '../utils/ids';
import { createBassTabApiFromEnv } from '../api';
import { usePublishedSongLookup } from '../hooks/usePublishedSongLookup';

type Props = NativeStackScreenProps<RootStackParamList, 'SongEditor'>;
type SaveState = 'idle' | 'saving' | 'saved';

const NAMEPLATE_BG = '#1a120a';
const NAMEPLATE_TEXT = '#f5e6c8';
const NAMEPLATE_MUTED = '#a8957e';
const NAMEPLATE_GOLD = '#c8a96e';

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

const cloneSong = (song: Song): Song => ({
  ...song,
  rows: song.rows.map((row) => ({
    ...row,
    bars: row.bars.map((bar) => ({
      ...(bar.beatCount !== undefined ? { beatCount: bar.beatCount } : {}),
      ...(bar.note !== undefined ? { note: bar.note } : {}),
      cells: Object.fromEntries(
        Object.entries(bar.cells).map(([stringName, slots]) => [stringName, [...slots]]),
      ),
    })),
    ...(row.defaultBeatCount !== undefined ? { defaultBeatCount: row.defaultBeatCount } : {}),
  })),
});

const serializeSongDraft = (song: Song): string =>
  JSON.stringify({
    title: song.title,
    artist: song.artist,
    key: song.key,
    tuning: song.tuning,
    stringNames: song.stringNames,
    rows: song.rows,
  });

const STRING_COUNT_OPTIONS = [4, 5];

export function SongEditorScreen({ navigation, route }: Props) {
  const { songId, isNew = false } = route.params;
  const { capabilities } = useSubscription();
  const { showUpgradePrompt } = useUpgradePrompt();
  const { songs, updateSong } = useBassTab();
  const backendApi = useMemo(() => createBassTabApiFromEnv(), []);
  const { lookup: publishedLookup } = usePublishedSongLookup(backendApi);
  const { authState } = useAuth();
  const currentUserId = authState.type === 'AUTHENTICATED' ? authState.user.id : null;
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [hasSavedOnce, setHasSavedOnce] = useState(!isNew);
  const [draftSong, setDraftSong] = useState<Song | null>(null);
  const [saveSignal, setSaveSignal] = useState(0);
  const [configBeatCount, setConfigBeatCount] = useState(DEFAULT_BEAT_COUNT);
  const baselineRef = useRef<string>('');
  const saveResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const song = songs.find((item) => item.id === songId);

  useEffect(() => {
    if (!song) {
      return;
    }

    console.info('[SongEditor] opening song', {
      songId: song.id,
      title: song.title,
      updatedAt: song.updatedAt,
      rows: song.rows.length,
      stringCount: song.stringCount,
      isNew,
    });

    let nextDraft: Song;
    try {
      nextDraft = cloneSong(song);
    } catch (error) {
      console.error('[SongEditor] cloneSong failed', { error, song });
      throw error;
    }
    setDraftSong(nextDraft);
    baselineRef.current = serializeSongDraft(nextDraft);
    setSaveState('idle');
    setHasSavedOnce(!isNew);
  }, [isNew, song?.id, song?.updatedAt]);

  useEffect(() => () => {
    if (saveResetTimerRef.current) {
      clearTimeout(saveResetTimerRef.current);
    }
  }, []);

  const editorSong = draftSong ?? null;

  const isDirty = editorSong
    ? serializeSongDraft(editorSong) !== baselineRef.current
    : false;
  const chart = useMemo(() => {
    if (!editorSong) {
      return null;
    }

    try {
      return flattenSongRowsToChart(editorSong);
    } catch (error) {
      console.error('[SongEditor] flattenSongRowsToChart failed', { error, song: editorSong });
      throw error;
    }
  }, [editorSong]);

  const publishedInfo = song ? publishedLookup[song.id] : undefined;
  const lockMetadata =
    Boolean(publishedInfo) &&
    publishedInfo?.ownershipStatus !== 'ORPHANED' &&
    currentUserId != null &&
    publishedInfo?.ownerUserId === currentUserId;
  const stringCountOptions = useMemo(() => {
    const options = [...STRING_COUNT_OPTIONS];
    const current = editorSong?.stringCount;

    if (current && !options.includes(current)) {
      options.push(current);
    }

    return Array.from(new Set(options)).sort((a, b) => a - b);
  }, [editorSong?.stringCount]);

  const isNewEmpty = isNew && (editorSong?.rows.length ?? 0) === 0;
  const effectiveDefaultBeatCount = isNewEmpty
    ? configBeatCount
    : normalizeBeatCount(chart?.defaultBeatCount ?? DEFAULT_BEAT_COUNT);
  const beatCountOptions = useMemo(
    () => Array.from({ length: MAX_BEAT_COUNT - MIN_BEAT_COUNT + 1 }, (_, index) => MIN_BEAT_COUNT + index),
    [],
  );

  if (!song || !editorSong || !chart) {
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
    if (field === 'stringCount') {
      const nextCount = Number(value as number);

      if (!Number.isFinite(nextCount) || nextCount < 1 || nextCount === editorSong.stringCount) {
        return;
      }

      if (
        typeof capabilities.maxStringCount === 'number' &&
        nextCount > capabilities.maxStringCount
      ) {
        showUpgradePrompt('STRING_LIMIT');
        return;
      }

      setDraftSong((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          stringCount: nextCount,
          stringNames: buildDefaultStringNames(nextCount),
        };
      });
      setSaveState('idle');
      return;
    }

    setDraftSong((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });
    setSaveState('idle');
  };

  const handleChartChange = (updates: Partial<SongChart>) => {
    setDraftSong((current) => {
      if (!current) {
        return current;
      }

      const baseChart = flattenSongRowsToChart(current);
      const mergedChart = {
        tab: updates.tab ?? baseChart.tab,
        rowAnnotations: updates.rowAnnotations ?? baseChart.rowAnnotations ?? [],
        rowBarCounts: updates.rowBarCounts ?? baseChart.rowBarCounts ?? [],
        defaultBeatCount: normalizeBeatCount(
          updates.defaultBeatCount ?? baseChart.defaultBeatCount ?? DEFAULT_BEAT_COUNT,
        ),
      };
      const parsed = parseTab(mergedChart.tab);
      const nextSongShape = mergeChartIntoSongRows(current, mergedChart);

      return {
        ...current,
        stringNames: parsed.stringNames.length > 0 ? parsed.stringNames : nextSongShape.stringNames,
        stringCount:
          (parsed.stringNames.length > 0 ? parsed.stringNames : nextSongShape.stringNames).length,
        rows: nextSongShape.rows,
      };
    });
    setSaveState('idle');
  };

  const handleDefaultBeatCountSelect = (value: number) => {
    const nextBeatCount = normalizeBeatCount(value);

    if (nextBeatCount === effectiveDefaultBeatCount) {
      return;
    }

    if (isNewEmpty) {
      setConfigBeatCount(nextBeatCount);
      return;
    }

    handleChartChange({ defaultBeatCount: nextBeatCount });
  };

  const handleStartEditing = () => {
    setDraftSong((current) => {
      if (!current || current.rows.length > 0) return current;
      const slotsPerBar = getSlotsPerBar(configBeatCount);
      return {
        ...current,
        rows: [{
          id: createId('row'),
          label: 'Intro',
          beforeText: '',
          afterText: '',
          defaultBeatCount: configBeatCount,
          bars: Array.from({ length: 4 }, () => ({
            beatCount: configBeatCount,
            cells: Object.fromEntries(
              current.stringNames.map((name) => [name, Array.from({ length: slotsPerBar }, () => '-')]),
            ),
            note: '',
          })),
        }],
      };
    });
    setSaveState('idle');
  };

  const handleSave = () => {
    if (!editorSong) {
      return;
    }

    if (!isDirty && hasSavedOnce) {
      return;
    }

    console.info('[SongEditor] handleSave', {
      songId: editorSong.id,
      isDirty,
      hasSavedOnce,
    });

    setSaveSignal((current) => current + 1);
    setSaveState('saving');

    updateSong(editorSong.id, {
      title: editorSong.title,
      artist: editorSong.artist,
      key: editorSong.key,
      tuning: editorSong.tuning,
      stringNames: editorSong.stringNames,
      rows: editorSong.rows,
    });

    baselineRef.current = serializeSongDraft(editorSong);
    setHasSavedOnce(true);
    setSaveState('saved');

    if (saveResetTimerRef.current) {
      clearTimeout(saveResetTimerRef.current);
    }

    saveResetTimerRef.current = setTimeout(() => {
      setSaveState('idle');
    }, 1400);
  };

  const handleOpenPerformance = () => {
    navigation.navigate('PerformanceView', { songId: editorSong.id });
  };

  const saveButtonLabel = !hasSavedOnce ? 'Create Song' : 'Save Changes';

  const saveStateText =
    saveState === 'saving'
      ? 'Saving changes...'
      : saveState === 'saved'
        ? 'Saved'
        : isDirty
          ? 'Unsaved changes'
          : 'All changes saved';

  return (
    <ScreenContainer scroll={false} contentStyle={styles.screen}>
      <View style={styles.navRow}>
        <AppSectionNav
          current="Library"
          onHome={() => navigation.navigate('Home')}
          onLibrary={() => navigation.navigate('MainTabs', { screen: 'Library' })}
          onSetlist={() => navigation.navigate('MainTabs', { screen: 'Setlist' })}
          onImport={() => navigation.navigate('MainTabs', { screen: 'Import' })}
          onAICreate={() => navigation.navigate('MainTabs', { screen: 'AICreate' })}
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

      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          <PrimaryButton
            label="Back to Library"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Library' })}
            variant="ghost"
            size="compact"
          />
          <PrimaryButton
            label="Open Performance"
            onPress={handleOpenPerformance}
            variant="secondary"
            size="compact"
          />
        </View>
      </View>

      <View style={styles.metaBarCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.metaBarScroll}
          contentContainerStyle={styles.metaBar}
        >
          <View style={[styles.compactMetaField, styles.metaTitleField]}>
            <Text style={styles.compactFieldLabel}>Title</Text>
            <TextInput
              value={editorSong.title}
              onChangeText={(value) => handleFieldChange('title', value)}
              style={styles.compactFieldInput}
              placeholderTextColor={palette.textMuted}
              editable={!lockMetadata}
            />
          </View>
          <View style={[styles.compactMetaField, styles.metaArtistField]}>
            <Text style={styles.compactFieldLabel}>Artist</Text>
            <TextInput
              value={editorSong.artist}
              onChangeText={(value) => handleFieldChange('artist', value)}
              style={styles.compactFieldInput}
              placeholderTextColor={palette.textMuted}
              editable={!lockMetadata}
            />
          </View>
          <View style={styles.compactMetaField}>
            <Text style={styles.compactFieldLabel}>Strings</Text>
            <View style={[styles.stringCountSelector, lockMetadata && styles.selectorDisabled]}>
              {stringCountOptions.map((option) => (
                <Pressable
                  key={`strings-${option}`}
                  disabled={lockMetadata}
                  onPress={() => handleFieldChange('stringCount', option)}
                  style={[
                    styles.stringCountPill,
                    option === editorSong.stringCount && styles.stringCountPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stringCountPillText,
                      option === editorSong.stringCount && styles.stringCountPillTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.compactMetaField}>
            <Text style={styles.compactFieldLabel}>Key</Text>
            <TextInput
              value={editorSong.key}
              onChangeText={(value) => handleFieldChange('key', value)}
              style={[styles.compactFieldInput, styles.shortFieldInput]}
              placeholderTextColor={palette.textMuted}
              editable={!lockMetadata}
            />
          </View>
          <View style={styles.compactMetaField}>
            <Text style={styles.compactFieldLabel}>Tuning</Text>
            <TextInput
              value={editorSong.tuning}
              onChangeText={(value) => handleFieldChange('tuning', value)}
              style={[styles.compactFieldInput, styles.tuningFieldInput]}
              placeholderTextColor={palette.textMuted}
              editable={!lockMetadata}
            />
            <View style={styles.tuningHintRow}>
              {tuningOptions.slice(0, 3).map((tuning) => (
                <Pressable
                  key={tuning}
                  disabled={lockMetadata}
                  onPress={() => handleFieldChange('tuning', tuning)}
                  style={styles.tuningQuickPick}
                >
                  <Text style={styles.tuningQuickPickText}>{tuning}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.compactMetaField}>
            <Text style={styles.compactFieldLabel}>Default Beats</Text>
            <View style={styles.defaultBeatSelector}>
              {beatCountOptions.map((option) => (
                <Pressable
                  key={`default-beat-${option}`}
                  onPress={() => handleDefaultBeatCountSelect(option)}
                  style={[
                    styles.defaultBeatPill,
                    option === effectiveDefaultBeatCount && styles.defaultBeatPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.defaultBeatPillText,
                      option === effectiveDefaultBeatCount && styles.defaultBeatPillTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.editorScroll}
        contentContainerStyle={styles.editorScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {isNewEmpty ? (
          <>
            <View style={styles.newSongStart}>
              <Text style={styles.newSongStartText}>
                Configure your strings, tuning, and beats per bar above, then start writing.
              </Text>
              <PrimaryButton
                label="Start Writing"
                onPress={handleStartEditing}
              />
            </View>
          </>
        ) : (
          <>
            {lockMetadata ? (
              <Text style={styles.lockedMetaText}>
                Title, artist, key, and tuning are locked while you own this song in the community. Republish after editing to push changes, or release it to edit freely.
              </Text>
            ) : null}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tab Editor</Text>
              <Text style={styles.sectionMeta}>
                Last updated {formatUpdatedAt(song.updatedAt)}
              </Text>
            </View>

            <SectionEditorCard
              key={chart.id}
              section={chart}
              index={0}
              isFirst
              isLast
              showSectionControls={false}
              saveSignal={saveSignal}
              onChange={handleChartChange}
              onMoveUp={() => {}}
              onMoveDown={() => {}}
              onDelete={() => {}}
            />
          </>
        )}
      </ScrollView>

      <View style={styles.saveDock}>
        <View style={styles.saveDockCopy}>
          <Text style={styles.saveDockTitle}>{saveStateText}</Text>
          <Text style={styles.saveDockSubtitle}>
            {isDirty
              ? 'Save now to lock this version in.'
              : 'Your latest edits are ready.'}
          </Text>
        </View>
        <PrimaryButton
          label={saveButtonLabel}
          onPress={handleSave}
          disabled={isNewEmpty || (!isDirty && hasSavedOnce)}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
    gap: 12,
  },
  navRow: {
    width: '100%',
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  navLeft: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaBarScroll: {
    maxHeight: 78,
  },
  metaBarCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingBottom: 2,
  },
  compactMetaField: {
    minWidth: 86,
  },
  metaTitleField: {
    minWidth: 210,
  },
  metaArtistField: {
    minWidth: 170,
  },
  compactFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: palette.textMuted,
    marginBottom: 3,
  },
  compactFieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  shortFieldInput: {
    width: 66,
    textAlign: 'center',
  },
  tuningFieldInput: {
    minWidth: 112,
  },
  tuningHintRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  tuningQuickPick: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f8fafc',
  },
  tuningQuickPickText: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.textMuted,
  },
  stringCountSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  stringCountPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#f8fafc',
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  stringCountPillActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryMuted,
  },
  stringCountPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textMuted,
  },
  stringCountPillTextActive: {
    color: palette.primary,
  },
  defaultBeatSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  defaultBeatPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#f8fafc',
    minWidth: 24,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  defaultBeatPillActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryMuted,
  },
  defaultBeatPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.textMuted,
  },
  defaultBeatPillTextActive: {
    color: palette.primary,
  },
  editorScroll: {
    flex: 1,
  },
  editorScrollContent: {
    gap: 14,
    paddingBottom: 20,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  sectionMeta: {
    fontSize: 13,
    color: palette.textMuted,
  },
  newSongStart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 48,
  },
  newSongStartText: {
    fontSize: 14,
    color: palette.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  lockedMetaText: {
    fontSize: 12,
    color: '#fbbf24',
    marginBottom: 6,
    marginHorizontal: 2,
  },
  saveDock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 12,
    gap: 10,
  },
  saveDockCopy: {
    gap: 2,
  },
  saveDockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.text,
  },
  saveDockSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: palette.textMuted,
  },
});
