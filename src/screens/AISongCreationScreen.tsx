import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Circle, Svg, Text as SvgText } from 'react-native-svg';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppSectionNav } from '../components/AppSectionNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { TabPagePreview } from '../components/TabPagePreview';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { SUGGESTED_BANDS, SUGGESTED_TITLES } from '../data/songSuggestions';
import { resolveUpgradeTrigger, useSubscription, useUpgradePrompt } from '../features/subscription';
import { BassTabApiError } from '../api';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { createBassTabApiFromEnv } from '../api';
import { ParsedBar } from '../utils/tabLayout';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'AICreate'>,
  NativeStackScreenProps<RootStackParamList>
>;

type GenerateState = 'idle' | 'generating' | 'error';

const LOADING_QUIPS = [
  'Warming up the callused fingers…',
  'Consulting the dad band archives…',
  'Probably overusing open strings…',
  'Arguing about the set list…',
  'Checking if anyone knows the bridge…',
  'Tuning up (third attempt)…',
  'Pretending we rehearsed this…',
  'Digging through the chord book…',
  'Capo on the wrong fret again…',
  'Blaming it on the amp settings…',
];

const GHOST_STRING_NAMES = ['G', 'D', 'A', 'E'];

// Three patterns of controlled chaos. Musical in spirit, questionable in practice.
const GHOST_PATTERNS: ParsedBar[][] = [
  // Pattern A: "Open String Panic" — low frets, lots of open strings, vaguely bass-like
  [
    { beatCount: 4, cells: { G: ['-', '-', '5', '-', '-', '-', '7', '-'], D: ['0', '-', '-', '-', '5', '-', '-', '-'], A: ['-', '-', '-', '3', '-', '-', '-', '5'], E: ['-', '0', '-', '-', '-', '3', '-', '-'] } },
    { beatCount: 4, cells: { G: ['-', '-', '7', '-', '-', '-', '5', '-'], D: ['0', '-', '-', '-', '7', '-', '-', '-'], A: ['-', '-', '-', '5', '-', '-', '-', '3'], E: ['-', '0', '-', '-', '-', '5', '-', '-'] } },
    { beatCount: 4, cells: { G: ['5', '-', '-', '-', '7', '-', '-', '-'], D: ['-', '-', '5', '-', '-', '-', '0', '-'], A: ['-', '3', '-', '-', '-', '5', '-', '-'], E: ['0', '-', '-', '-', '3', '-', '-', '0'] } },
    { beatCount: 4, cells: { G: ['-', '-', '5', '-', '7', '-', '-', '-'], D: ['0', '-', '-', '-', '-', '5', '-', '-'], A: ['-', '-', '3', '-', '-', '-', '5', '-'], E: ['-', '0', '-', '3', '-', '-', '-', '0'] } },
  ],
  // Pattern B: "Upper Register Regret" — frets 12–19, tapped feel, too many notes up high
  [
    { beatCount: 4, cells: { G: ['12', '-', '15', '-', '12', '-', '17', '-'], D: ['-', '14', '-', '-', '-', '14', '-', '12'], A: ['12', '-', '-', '16', '-', '-', '12', '-'], E: ['-', '-', '12', '-', '-', '15', '-', '-'] } },
    { beatCount: 4, cells: { G: ['17', '-', '-', '12', '15', '-', '-', '-'], D: ['-', '12', '-', '-', '-', '16', '-', '-'], A: ['-', '-', '14', '-', '12', '-', '-', '17'], E: ['12', '-', '-', '-', '-', '12', '15', '-'] } },
    { beatCount: 4, cells: { G: ['15', '-', '12', '-', '-', '19', '-', '12'], D: ['-', '-', '-', '12', '17', '-', '-', '-'], A: ['12', '16', '-', '-', '-', '-', '14', '-'], E: ['-', '-', '15', '-', '12', '-', '-', '12'] } },
    { beatCount: 4, cells: { G: ['12', '-', '17', '-', '12', '-', '15', '-'], D: ['14', '-', '-', '12', '-', '19', '-', '-'], A: ['-', '12', '-', '-', '16', '-', '-', '12'], E: ['-', '-', '-', '15', '-', '-', '12', '-'] } },
  ],
  // Pattern C: "Pentatonic Catastrophe" — 0–9 range, almost-musical intervals, wrong strings
  [
    { beatCount: 4, cells: { G: ['-', '7', '-', '5', '-', '7', '-', '9'], D: ['5', '-', '-', '-', '7', '-', '5', '-'], A: ['-', '-', '5', '-', '-', '3', '-', '-'], E: ['0', '-', '-', '-', '0', '-', '-', '5'] } },
    { beatCount: 4, cells: { G: ['9', '-', '7', '-', '5', '-', '-', '7'], D: ['-', '5', '-', '-', '-', '7', '-', '-'], A: ['3', '-', '-', '5', '-', '-', '3', '-'], E: ['-', '-', '0', '-', '5', '-', '-', '0'] } },
    { beatCount: 4, cells: { G: ['-', '5', '7', '-', '-', '9', '-', '-'], D: ['7', '-', '-', '-', '5', '-', '7', '-'], A: ['-', '-', '-', '3', '-', '-', '-', '5'], E: ['0', '-', '5', '-', '-', '0', '-', '-'] } },
    { beatCount: 4, cells: { G: ['7', '-', '-', '9', '-', '7', '5', '-'], D: ['-', '5', '-', '-', '7', '-', '-', '5'], A: ['-', '-', '3', '-', '-', '-', '5', '-'], E: ['0', '-', '-', '-', '0', '5', '-', '-'] } },
  ],
];

const GHOST_COMMENTS = [
  'We got a bit carried away here.',
  'This felt right at the time.',
  'Probably easier than it looks.',
  'Confidence exceeded ability.',
];

function DadBandBadge() {
  return (
    <Svg width={92} height={92} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="54" fill="none" stroke="#c8a96e" strokeWidth={3} />
      <Circle cx="60" cy="60" r="44" fill="none" stroke="#c8a96e" strokeWidth={2} strokeDasharray="4 3" />
      <SvgText
        x="60"
        y="65"
        textAnchor="middle"
        fontSize={18}
        fontWeight="bold"
        letterSpacing={2}
        fill="#f5e6c8"
        fontFamily="Arial"
      >
        DAD BAND
      </SvgText>
      <SvgText
        x="60"
        y="24"
        textAnchor="middle"
        fontSize={8}
        letterSpacing={1.5}
        fill="#c8a96e"
        fontFamily="Arial"
      >
        AI GENERATED
      </SvgText>
      <SvgText
        x="60"
        y="108"
        textAnchor="middle"
        fontSize={7}
        letterSpacing={1.2}
        fill="#c8a96e"
        fontFamily="Arial"
      >
        MOSTLY QUESTIONABLE
      </SvgText>
    </Svg>
  );
}

export function AISongCreationScreen({ navigation }: Props) {
  const { tier, capabilities } = useSubscription();
  const { showUpgradePrompt } = useUpgradePrompt();
  const { songs, importSongFromDto } = useBassTab();
  const backendApi = useMemo(() => createBassTabApiFromEnv(), []);

  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [influenceLine, setInfluenceLine] = useState('');
  const [generateState, setGenerateState] = useState<GenerateState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lessTerribleMode, setLessTerribleMode] = useState(false);
  const [quipIndex, setQuipIndex] = useState(0);
  const [suggestedBandIndex, setSuggestedBandIndex] = useState(
    () => Math.floor(Math.random() * SUGGESTED_BANDS.length),
  );
  const [suggestedTitleIndex, setSuggestedTitleIndex] = useState(
    () => Math.floor(Math.random() * SUGGESTED_TITLES.length),
  );
  const [ghostPatternIndex, setGhostPatternIndex] = useState(() => Math.floor(Math.random() * GHOST_PATTERNS.length));
  const [ghostCommentIndex, setGhostCommentIndex] = useState(() => Math.floor(Math.random() * GHOST_COMMENTS.length));
  const quipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const suggestedBand = SUGGESTED_BANDS[suggestedBandIndex] ?? 'Nirvana';
  const suggestedTitle = SUGGESTED_TITLES[suggestedTitleIndex] ?? 'Moody garage riff';

  useFocusEffect(
    useCallback(() => {
      setSuggestedBandIndex(Math.floor(Math.random() * SUGGESTED_BANDS.length));
      setSuggestedTitleIndex(Math.floor(Math.random() * SUGGESTED_TITLES.length));
      setGhostPatternIndex(Math.floor(Math.random() * GHOST_PATTERNS.length));
      setGhostCommentIndex(Math.floor(Math.random() * GHOST_COMMENTS.length));

      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: 530, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 530, useNativeDriver: true }),
        ]),
      );
      blink.start();
      return () => blink.stop();
    }, []),
  );

  useEffect(() => {
    if (generateState === 'generating') {
      setQuipIndex(Math.floor(Math.random() * LOADING_QUIPS.length));
      quipTimerRef.current = setInterval(() => {
        setQuipIndex((i) => (i + 1) % LOADING_QUIPS.length);
      }, 2200);
    } else {
      if (quipTimerRef.current) {
        clearInterval(quipTimerRef.current);
        quipTimerRef.current = null;
      }
    }
    return () => {
      if (quipTimerRef.current) {
        clearInterval(quipTimerRef.current);
        quipTimerRef.current = null;
      }
    };
  }, [generateState]);

  const canGenerate =
    artist.trim().length > 0 && title.trim().length > 0 && generateState !== 'generating';
  const isProTier = tier === 'PRO';
  const maxSongs = capabilities.maxSongs;
  const hasSongLimit = tier === 'FREE' && maxSongs !== null;
  const remainingSongSlots = hasSongLimit ? Math.max(maxSongs - songs.length, 0) : null;
  const isLibraryFull = hasSongLimit && remainingSongSlots === 0;
  const dailyAiLimit = capabilities.maxDailyAiGenerations;
  const totalAiLimit = capabilities.maxAiGenerations;

  const handleGenerate = async () => {
    if (!canGenerate) return;

    if (isLibraryFull) {
      setGenerateState('idle');
      setErrorMessage('Dad Band storage is full. Upgrade to Pro so this tune has somewhere to live.');
      showUpgradePrompt('SONG_LIMIT');
      return;
    }

    if (!backendApi) {
      setErrorMessage('AI generation requires an active connection.');
      setGenerateState('error');
      return;
    }

    setGenerateState('generating');
    setErrorMessage('');

    try {
      const trimmedInfluenceLine = influenceLine.trim();
      const dto = await backendApi.aiGenerateSong({
        artist: artist.trim(),
        title: title.trim(),
        ...(trimmedInfluenceLine.length > 0 ? { influenceLine: trimmedInfluenceLine } : {}),
      });

      const song = importSongFromDto(dto);
      navigation.navigate('SongEditor', { songId: song.id, isNew: false });
    } catch (error) {
      const trigger = resolveUpgradeTrigger(error);

      if (trigger) {
        setGenerateState('idle');
        showUpgradePrompt(trigger);
        return;
      }

      if (error instanceof BassTabApiError && error.code === 'AI_GENERATE_DAILY_LIMIT') {
        setErrorMessage('Daily generation limit reached. Try again tomorrow.');
        setGenerateState('error');
        return;
      }

      if (error instanceof BassTabApiError && error.code === 'AI_GENERATE_LOCKED') {
        setErrorMessage('Custom AI influence line requires Pro.');
        setGenerateState('error');
        showUpgradePrompt('AI_GENERATE');
        return;
      }

      const message = error instanceof Error ? error.message : 'Could not generate tab.';
      setErrorMessage(message);
      setGenerateState('error');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.navRow}>
        <AppSectionNav
          current="AICreate"
          onHome={() => navigation.navigate('Home')}
          onLibrary={() => navigation.navigate('Library')}
          onSetlist={() => navigation.navigate('Setlist')}
          onImport={() => navigation.navigate('Import')}
          onAICreate={() => navigation.navigate('AICreate')}
          onGoPro={() => navigation.navigate('Upgrade')}
          onAccount={() => navigation.navigate('Account')}
        />
      </View>

      {/* Amp-style card: dark nameplate header + cream control face */}
      <View style={styles.card}>

        {/* ── Dark nameplate strip ── */}
        <View style={styles.nameplate}>
          <View style={styles.nameplateInner}>
            <View style={styles.nameplateText}>
              <Text style={styles.nameplateTitle}>Dad Band AI Song Generator 🎸</Text>
              <Text style={styles.nameplateSubtitle}>
                We'll give it a go. Might be decent. Might be absolute nonsense.
              </Text>
              <View style={styles.experimentalPill}>
                <Text style={styles.experimentalPillText}>⚠️ Experimental – results may be questionable</Text>
              </View>
            </View>
            <View style={styles.badgeSlap}>
              <DadBandBadge />
            </View>
          </View>
        </View>

        {/* ── Cream control face ── */}
        <View style={styles.face}>

          {/* Plan info */}
          {tier !== 'PRO' ? (
            <View style={styles.planRow}>
              <Text style={styles.planText}>
                {isLibraryFull
                  ? 'Free plan — library full. No room for new AI tracks. '
                  : `Free plan — ${dailyAiLimit != null ? `${dailyAiLimit}/day` : 'limited'} AI generations${totalAiLimit != null ? ` (${totalAiLimit} total)` : ''}${
                    typeof remainingSongSlots === 'number'
                      ? `, ${remainingSongSlots} song slot${remainingSongSlots === 1 ? '' : 's'} left`
                      : ''
                  }. `}
              </Text>
              <Pressable onPress={() => navigation.navigate('Upgrade')}>
                <Text style={styles.planLink}>{isLibraryFull ? 'Go Pro for unlimited songs →' : 'Upgrade to Pro →'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.planRow}>
              <Text style={styles.planText}>Pro — {dailyAiLimit != null ? `${dailyAiLimit} AI generations per day` : 'unlimited AI generation'} included.</Text>
            </View>
          )}

          {/* Inputs */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Who are we pretending to be?</Text>
            <TextInput
              value={artist}
              onChangeText={setArtist}
              placeholder={`${suggestedBand} (but worse)`}
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              autoCapitalize="words"
              editable={generateState !== 'generating'}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Song (it will sound nothing like!)</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={suggestedTitle}
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              autoCapitalize="words"
              editable={generateState !== 'generating'}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Influence line (Pro)</Text>
            <TextInput
              value={influenceLine}
              onChangeText={setInfluenceLine}
              placeholder="Think Black Sabbath groove with Cure atmosphere..."
              placeholderTextColor={palette.textMuted}
              style={[styles.input, !isProTier && styles.inputLocked]}
              editable={generateState !== 'generating' && isProTier}
              maxLength={500}
            />
            {!isProTier ? (
              <Pressable onPress={() => showUpgradePrompt('AI_GENERATE')}>
                <Text style={styles.proLockHint}>Custom AI influence line requires Pro.</Text>
              </Pressable>
            ) : (
              <Text style={styles.characterHint}>{influenceLine.length}/500</Text>
            )}
          </View>

          {/* Toggle */}
          <View style={styles.toggleRow}>
            <Switch
              value={lessTerribleMode}
              onValueChange={setLessTerribleMode}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor="#fff"
            />
            <Text style={styles.toggleLabel}>Make it slightly less terrible</Text>
            {lessTerribleMode ? (
              <Text style={styles.toggleHint}>(no promises)</Text>
            ) : null}
          </View>

          <View style={styles.rule} />

          {/* Ghost preview — only shown while idle */}
          {generateState === 'idle' ? (
            <View style={styles.ghostCard}>
              <View style={styles.ghostCardHeader}>
                <Text style={styles.ghostCardTitle}>COULD BE SOMETHING LIKE THIS… (ON A GOOD DAY)</Text>
                <Animated.Text style={[styles.ghostCursor, { opacity: cursorOpacity }]}>▌</Animated.Text>
              </View>
              <View style={styles.ghostPreview}>
                <TabPagePreview
                  stringNames={GHOST_STRING_NAMES}
                  bars={GHOST_PATTERNS[ghostPatternIndex]}
                  renderMode={capabilities.svgEnabled ? 'svg' : 'ascii'}
                  svgScaleProfile="standard"
                />
              </View>
              <Text style={styles.ghostComment}>{GHOST_COMMENTS[ghostCommentIndex]}</Text>
            </View>
          ) : null}

          {/* CTA */}
          {generateState === 'generating' ? (
            <View style={styles.generatingRow}>
              <ActivityIndicator color={palette.primary} size="small" />
              <Text style={styles.generatingQuip}>{LOADING_QUIPS[quipIndex]}</Text>
            </View>
          ) : (
            <>
              <PrimaryButton
                label={isLibraryFull ? '🧱 Library Full — Go Pro' : '🎸 Generate Something Questionable'}
                onPress={() => { void handleGenerate(); }}
                disabled={!canGenerate || isLibraryFull}
              />
              <Text style={styles.microcopy}>
                {isLibraryFull
                  ? 'You nailed the free limit. Time to go Pro and keep the riffs coming.'
                  : 'AI tabs are a starting point. Your ears are still the boss.'}
              </Text>
            </>
          )}

          {generateState === 'error' && errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}

const NAMEPLATE_BG = '#1a120a';
const NAMEPLATE_TEXT = '#f5e6c8';
const NAMEPLATE_MUTED = '#a8957e';
const NAMEPLATE_GOLD = '#c8a96e';

const styles = StyleSheet.create({
  navRow: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#c8a96e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  // Dark nameplate at top
  nameplate: {
    backgroundColor: NAMEPLATE_BG,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: NAMEPLATE_GOLD,
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
  badgeSlap: {
    transform: [{ rotate: '-10deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 5,
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
  experimentalPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2e1f0a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7a5520',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  experimentalPillText: {
    fontSize: 11,
    color: '#d4a04a',
    fontWeight: '600',
  },

  // Cream control face
  face: {
    backgroundColor: palette.surface,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: palette.text,
  },
  inputLocked: {
    opacity: 0.65,
  },
  proLockHint: {
    fontSize: 12,
    color: palette.accent,
    fontWeight: '700',
  },
  characterHint: {
    fontSize: 11,
    color: palette.textMuted,
    textAlign: 'right',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 13,
    color: palette.textMuted,
    flex: 1,
  },
  toggleHint: {
    fontSize: 11,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
  rule: {
    height: 1,
    backgroundColor: palette.border,
  },
  ghostCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    overflow: 'hidden',
  },
  ghostCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ghostCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  ghostCursor: {
    fontSize: 13,
    color: palette.primary,
    lineHeight: 16,
  },
  ghostPreview: {
    opacity: 0.75,
  },
  ghostComment: {
    fontSize: 12,
    color: palette.textMuted,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.background,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  generatingQuip: {
    fontSize: 13,
    color: palette.textMuted,
    flex: 1,
    fontStyle: 'italic',
  },
  microcopy: {
    fontSize: 11,
    color: palette.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: -4,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: palette.danger,
    lineHeight: 18,
  },
});
