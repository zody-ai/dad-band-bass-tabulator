import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Circle, Svg, Text as SvgText } from 'react-native-svg';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppSectionNav } from '../components/AppSectionNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { resolveUpgradeTrigger, useSubscription, useUpgradePrompt } from '../features/subscription';
import { BassTabApiError } from '../api';
import { RootStackParamList, TabParamList } from '../navigation/types';
import { useBassTab } from '../store/BassTabProvider';
import { createBassTabApiFromEnv } from '../api';

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
  const { tier } = useSubscription();
  const { showUpgradePrompt } = useUpgradePrompt();
  const { importSongFromDto } = useBassTab();
  const backendApi = useMemo(() => createBassTabApiFromEnv(), []);

  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [generateState, setGenerateState] = useState<GenerateState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lessTerribleMode, setLessTerribleMode] = useState(false);
  const [quipIndex, setQuipIndex] = useState(0);
  const quipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleGenerate = async () => {
    if (!canGenerate) return;

    if (!backendApi) {
      setErrorMessage('AI generation requires an active connection.');
      setGenerateState('error');
      return;
    }

    setGenerateState('generating');
    setErrorMessage('');

    try {
      const dto = await backendApi.aiGenerateSong({
        artist: artist.trim(),
        title: title.trim(),
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
              <Text style={styles.planText}>Free plan — limited generations. </Text>
              <Pressable onPress={() => navigation.navigate('Upgrade')}>
                <Text style={styles.planLink}>Upgrade to Pro →</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.planRow}>
              <Text style={styles.planText}>Pro — high daily limit included.</Text>
            </View>
          )}

          {/* Inputs */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Who are we pretending to be?</Text>
            <TextInput
              value={artist}
              onChangeText={setArtist}
              placeholder="Nirvana (but worse)"
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
              placeholder="Moody garage riff"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              autoCapitalize="words"
              editable={generateState !== 'generating'}
            />
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
            <View style={styles.ghostPreview}>
              <Text style={styles.ghostLine}>{'──────────────────'}</Text>
              <Text style={styles.ghostTab}>{'G|----------------'}</Text>
              <Text style={styles.ghostTab}>{'D|----------------'}</Text>
              <Text style={styles.ghostTab}>{'A|----------------'}</Text>
              <Text style={styles.ghostTab}>{'E|----------------'}</Text>
              <Text style={styles.ghostLine}>{'──────────────────'}</Text>
              <Text style={styles.ghostCaption}>Your questionable masterpiece will appear here</Text>
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
                label="🎸 Generate Something Questionable"
                onPress={() => { void handleGenerate(); }}
                disabled={!canGenerate}
              />
              <Text style={styles.microcopy}>
                AI tabs are a starting point. Your ears are still the boss.
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
  ghostPreview: {
    borderWidth: 1,
    borderColor: palette.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
    opacity: 0.45,
  },
  ghostLine: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: palette.textMuted,
    letterSpacing: 1,
  },
  ghostTab: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: palette.text,
    letterSpacing: 0.5,
  },
  ghostCaption: {
    fontSize: 11,
    color: palette.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 6,
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
