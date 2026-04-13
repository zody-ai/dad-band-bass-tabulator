import { useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BassBackdrop } from '../components/BassBackdrop';
import { DadBandBrandBanner } from '../components/DadBandBrandBanner';
import { TabPagePreview } from '../components/TabPagePreview';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { SUGGESTED_BANDS, SUGGESTED_TITLES } from '../data/songSuggestions';
import { useAuth } from '../features/auth/state/useAuth';
import { useSubscription } from '../features/subscription/SubscriptionContext';
import { RootStackParamList } from '../navigation/types';
import { parseTab } from '../utils/tabLayout';

const FALLBACK_FREE = {
  maxSongs: 20,
  maxCommunitySongs: 5,
  maxAiGenerations: 15,
  maxDailyAiGenerations: 3,
} as const;
const landingTabSnippet = parseTab(
  [
    'G|----------------|----------------|',
    'D|----------------|------5-7-5-----|',
    'A|--5-----5-7-5---|--7---------5---|',
    'E|------3---------|----------------|',
  ].join('\n'),
);
const PREVIEW_KEYS = ['E', 'A', 'D', 'G', 'C#m', 'Bm', 'F#'] as const;
const PREVIEW_TUNINGS = ['Std E', 'Drop D', 'Half Step Down'] as const;
const PREVIEW_UPDATED = ['Updated 1d ago', 'Updated 2d ago', 'Updated 4d ago', 'Updated 1w ago'] as const;

type PreviewSong = {
  title: string;
  artist: string;
  key: string;
  tuning: string;
  updated: string;
};

const pickRandom = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)] ?? items[0];

const buildPreviewSongs = (count: number): PreviewSong[] => {
  const shuffledTitles = [...SUGGESTED_TITLES].sort(() => Math.random() - 0.5);
  const shuffledBands = [...SUGGESTED_BANDS].sort(() => Math.random() - 0.5);

  return Array.from({ length: count }, (_, index) => ({
    title: shuffledTitles[index % shuffledTitles.length] ?? 'Untitled Groove',
    artist: shuffledBands[index % shuffledBands.length] ?? 'The Bell Ends',
    key: pickRandom(PREVIEW_KEYS),
    tuning: pickRandom(PREVIEW_TUNINGS),
    updated: pickRandom(PREVIEW_UPDATED),
  }));
};

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;
const bassHeroImage = require('../../assets/bass.png');

export function LandingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();

  // Breakpoints
  const isMobile = width < 520;
  const isTablet = width >= 520 && width < 920;
  const isDesktop = width >= 920;
  const isWide = width >= 1260;

  // Responsive computed values
  const pagePaddingH = isMobile ? 14 : isTablet ? 24 : isWide ? 48 : 36;
  const pageGap = isMobile ? 14 : 20;
  const sectionPadding = isMobile ? 14 : isDesktop ? 22 : 18;
  const heroCardPadding = isMobile ? 16 : isTablet ? 22 : isWide ? 32 : 28;
  const heroTitleSize = isMobile ? 30 : isTablet ? 40 : isWide ? 58 : 50;
  const heroCopySize = isMobile ? 14 : isTablet ? 16 : 17;
  const sectionTitleSize = isMobile ? 19 : isTablet ? 22 : isWide ? 28 : 26;
  const gridGap = isMobile ? 8 : 12;
  const heroImgW = isMobile ? 210 : isTablet ? 290 : isWide ? 400 : 345;
  const heroImgH = Math.round(heroImgW * 1.08);
  const heroVisualW = isWide ? 440 : 370;

  const { authState, setAuthView, clearError, clearInfo } = useAuth();
  const { capabilityDefaults } = useSubscription();
  const freeCaps = capabilityDefaults?.free;
  const maxSongs = freeCaps?.maxSongs ?? FALLBACK_FREE.maxSongs;
  const maxCommunityBorrows = freeCaps?.maxCommunitySongs ?? FALLBACK_FREE.maxCommunitySongs;
  const maxAiGenerations = freeCaps?.maxAiGenerations ?? FALLBACK_FREE.maxAiGenerations;
  const maxDailyAiGenerations = freeCaps?.maxDailyAiGenerations ?? FALLBACK_FREE.maxDailyAiGenerations;
  const isAuthenticated = authState.type === 'AUTHENTICATED';
  const previewSongs = useMemo(() => buildPreviewSongs(5), []);
  const libraryPreviewSongs = previewSongs.slice(0, 2);
  const plannedPreviewSongs = previewSongs.slice(2, 5);

  const openApp = () => {
    if (isAuthenticated) {
      navigation.navigate('MainTabs', { screen: 'Library' });
      return;
    }
    clearError();
    clearInfo();
    setAuthView('LOGIN');
    navigation.navigate('AuthEntry', { view: 'LOGIN', source: 'landing-open-app' });
  };

  const startFree = () => {
    clearError();
    clearInfo();
    setAuthView('REGISTER');
    navigation.navigate('AuthEntry', { view: 'REGISTER', source: 'landing-start-free' });
  };

  const signIn = () => {
    clearError();
    clearInfo();
    setAuthView('LOGIN');
    navigation.navigate('AuthEntry', { view: 'LOGIN', source: 'landing-sign-in' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BassBackdrop variant={isMobile ? 'subtle' : 'hero'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.page, { paddingHorizontal: pagePaddingH, gap: pageGap }]}>

          <DadBandBrandBanner
            variant="full"
            subtitle="Rehearsal-night edition"
            supportingLine="From first draft to stage view, keep your low end organised."
          />

          {/* ── Hero ── */}
          <View style={styles.heroWrap}>
            <View style={styles.heroBlobOne} />
            <View style={styles.heroBlobTwo} />
            <View style={[styles.heroCard, { padding: heroCardPadding }, isDesktop && styles.heroCardRow]}>

              <View style={[styles.heroMain, isDesktop && styles.heroMainFlex]}>
                <Text style={[styles.heroTitle, { fontSize: heroTitleSize, lineHeight: heroTitleSize * 1.08, maxWidth: isMobile ? undefined : isTablet ? 480 : 540 }]}>
                  The bass tab workspace for rehearsals, gigs, and real-life chaos.
                </Text>
                <Text style={[styles.heroCopy, { fontSize: heroCopySize, lineHeight: heroCopySize * 1.6 }]}>
                  Build clean bass charts, organise setlists, fix rough tabs fast, and keep your parts ready when the
                  count-in goes sideways.
                </Text>
                {!isMobile && (
                  <View style={styles.chaosTagRow}>
                    <ChaosTag label="Was the amp on?" />
                    <ChaosTag label="Held together by groove" />
                    <ChaosTag label="Nobody noticed, it's fine" />
                  </View>
                )}
                {isAuthenticated ? (
                  <View style={[styles.heroActions, isMobile && styles.heroActionsNarrow]}>
                    <Pressable
                      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                      onPress={openApp}
                    >
                      <Text style={styles.primaryButtonLabel}>Back to App</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={[styles.heroActions, isMobile && styles.heroActionsNarrow]}>
                      <Pressable
                        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                        onPress={startFree}
                      >
                        <Text style={styles.primaryButtonLabel}>Start Free</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                        onPress={signIn}
                      >
                        <Text style={styles.secondaryButtonLabel}>Sign In</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.reassurance}>No card. No pressure. Just bass.</Text>
                    <Pressable
                      style={({ pressed }) => [styles.openAppLink, pressed && styles.pressed]}
                      onPress={openApp}
                    >
                      <Text style={styles.openAppLinkLabel}>Already have an account? Open App</Text>
                    </Pressable>
                  </>
                )}
              </View>

              <View
                style={[
                  styles.heroVisual,
                  isDesktop
                    ? { width: heroVisualW, justifyContent: 'center', alignItems: 'flex-end', marginRight: -heroCardPadding, marginTop: -heroCardPadding, marginBottom: -heroCardPadding }
                    : styles.heroVisualStacked,
                ]}
              >
                <View style={[styles.heroVisualCard, { width: heroImgW + 16, height: heroImgH + 16 }]}>
                  <Image
                    source={bassHeroImage}
                    resizeMode="contain"
                    style={{ width: heroImgW, height: heroImgH, transform: [{ rotate: '12deg' }] }}
                  />
                </View>
              </View>

            </View>
          </View>

          {/* ── Free Tier ── */}
          <View style={[styles.section, { padding: sectionPadding }]}>
            <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleSize * 1.22 }]}>
              Free Tier That Actually Gets You Playing
            </Text>
            <View style={[styles.freeGrid, { gap: gridGap }, isMobile && styles.freeGridNarrow]}>
              <ValueCard
                value={`${maxSongs} Songs`}
                marker="Library"
                title="Your Own Library"
                body={`Keep up to ${maxSongs} songs ready for practice and rehearsal nights.`}
                tone="sand"
              />
              <ValueCard
                value={`${maxCommunityBorrows} Community Borrows`}
                marker="Community"
                title="Borrow Good Ideas"
                body={`Lift ${maxCommunityBorrows} community songs and adapt them to your own setup.`}
                tone="mint"
              />
              <ValueCard
                value={`${maxDailyAiGenerations} per day`}
                marker="AI Generator"
                title="Kickstart New Ideas"
                body={`Generate up to ${maxDailyAiGenerations} AI charts a day (${maxAiGenerations} total) when the band says "let's jam in A".`}
                tone="amber"
                featured
              />
            </View>
          </View>

          {/* ── Features ── */}
          <View style={[styles.section, { padding: sectionPadding }]}>
            <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleSize * 1.22 }]}>
              What You Can Do in BassTab
            </Text>
            <View style={[styles.featureGrid, { gap: gridGap }, isMobile && styles.featureGridNarrow]}>
              <FeatureCard
                title="Build your own library"
                body="Keep your tabs organised and ready — no digging around before rehearsal."
                tone="cream"
              />
              <FeatureCard
                title="Tidy rough tab fast"
                body="Turn rough ideas into clean, playable tabs in seconds."
                tone="mint"
              />
              <FeatureCard
                title="Run a clean stage view"
                body="Large, readable chart view when everyone wants to start now."
                tone="warm"
                featured
              />
              <FeatureCard
                title="Export a PDF backup"
                body="No signal? No problem — your charts are still ready to go."
                tone="stone"
              />
              <FeatureCard
                title="AI-generated approximations"
                body="Get a quick bass starting point when no clean tab exists, then tweak it to fit your band."
                tone="mint"
              />
              <FeatureCard
                title="Discover community tabs"
                body="Find, vote, and build on shared songs — then make them your own."
                tone="cream"
              />
            </View>
          </View>

          {/* ── Preview ── */}
          <View style={[styles.previewSection, { padding: sectionPadding }]}>
            <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleSize * 1.22 }]}>
              Quick Preview
            </Text>
            <Text style={styles.previewCopy}>This is the kind of workspace you get after sign-up.</Text>
            <View style={[styles.previewGrid, { gap: gridGap }, isMobile && styles.previewGridNarrow]}>
              <View style={styles.previewCard}>
                <View style={styles.previewPaneHeader}>
                  <Text style={styles.previewCardTitle}>Library</Text>
                  <Text style={styles.previewPaneChip}>23 songs</Text>
                </View>
                <View style={styles.previewStack}>
                  {libraryPreviewSongs.map((song) => (
                    <View key={`library-preview-${song.title}`} style={styles.previewLibraryEntry}>
                      <View style={styles.previewLibraryTitleRow}>
                        <Text style={styles.previewLibraryTitle}>{song.title}</Text>
                        <View style={styles.previewKeyBadge}>
                          <Text style={styles.previewKeyBadgeText}>{song.key}</Text>
                        </View>
                      </View>
                      <Text style={styles.previewLibraryArtist}>{song.artist}</Text>
                      <Text style={styles.previewLibraryMeta}>{song.tuning} • {song.updated}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={[styles.previewCard, styles.previewCardTilt]}>
                <Text style={styles.previewCardTitle}>Planned (subject to chaos)</Text>
                <View style={styles.previewStack}>
                  {plannedPreviewSongs.map((song, index) => (
                    <View key={`planned-preview-${song.title}`} style={styles.previewSetlistEntry}>
                      <View style={styles.previewOrderBadge}>
                        <Text style={styles.previewOrderBadgeText}>{index + 1}</Text>
                      </View>
                      <View style={styles.previewSetlistCopy}>
                        <Text style={styles.previewSetlistTitle}>{song.title}</Text>
                        <Text style={styles.previewSetlistMeta}>{song.artist} • {song.key}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <View style={[styles.previewCard, styles.previewCardTab]}>
                <Text style={[styles.previewCardTitle, styles.previewCardTitleLight]}>Tab Snippet</Text>
                <View style={styles.previewSnippetPanel}>
                  <TabPagePreview
                    renderMode="svg"
                    tone="dark"
                    compact
                    svgScaleProfile="performance"
                    barsPerRow={2}
                    stringNames={landingTabSnippet.stringNames}
                    bars={landingTabSnippet.bars}
                    rowAnnotations={[
                      {
                        label: 'Verse groove',
                        beforeText: 'Keep it tight with kick',
                        afterText: '',
                        barNotes: [],
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Final CTA ── */}
          <View style={[styles.finalCta, { padding: sectionPadding }]}>
            <Text style={[styles.finalCtaTitle, { fontSize: sectionTitleSize, lineHeight: sectionTitleSize * 1.22 }]}>
              Ready to keep your next rehearsal under control?
            </Text>
            <Text style={styles.finalCtaBody}>
              Start free, keep your low end organised, upgrade only when you need more room.
            </Text>
            {isAuthenticated ? (
              <View style={[styles.heroActions, isMobile && styles.heroActionsNarrow]}>
                <Pressable
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                  onPress={openApp}
                >
                  <Text style={styles.primaryButtonLabel}>Back to App</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={[styles.heroActions, isMobile && styles.heroActionsNarrow]}>
                  <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                    onPress={startFree}
                  >
                    <Text style={styles.primaryButtonLabel}>Start Free</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                    onPress={signIn}
                  >
                    <Text style={styles.secondaryButtonLabel}>Sign In</Text>
                  </Pressable>
                </View>
                <Text style={styles.reassurance}>No card. No pressure. Just bass.</Text>
              </>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ChaosTag({ label }: { label: string }) {
  return (
    <View style={styles.chaosTag}>
      <Text style={styles.chaosTagLabel}>{label}</Text>
    </View>
  );
}

function ValueCard({
  value,
  marker,
  title,
  body,
  tone,
  featured,
}: {
  value: string;
  marker: string;
  title: string;
  body: string;
  tone: 'sand' | 'mint' | 'amber';
  featured?: boolean;
}) {
  return (
    <View
      style={[
        styles.valueCard,
        tone === 'sand' && styles.valueCardSand,
        tone === 'mint' && styles.valueCardMint,
        tone === 'amber' && styles.valueCardAmber,
        featured && styles.valueCardFeatured,
      ]}
    >
      <View style={styles.valueMarker}>
        <Text style={styles.valueMarkerLabel}>{marker}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.valueTitle}>{title}</Text>
      <Text style={styles.valueBody}>{body}</Text>
    </View>
  );
}

function FeatureCard({
  title,
  body,
  tone,
  featured,
}: {
  title: string;
  body: string;
  tone: 'cream' | 'mint' | 'warm' | 'stone';
  featured?: boolean;
}) {
  return (
    <View
      style={[
        styles.featureCard,
        featured && styles.featureCardFeatured,
        tone === 'cream' && styles.featureCardCream,
        tone === 'mint' && styles.featureCardMint,
        tone === 'warm' && styles.featureCardWarm,
        tone === 'stone' && styles.featureCardStone,
      ]}
    >
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureBody}>{body}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 22,
    paddingBottom: 40,
    // paddingHorizontal and gap injected inline
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroWrap: {
    position: 'relative',
  },
  heroBlobOne: {
    position: 'absolute',
    right: -40,
    top: -36,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(151, 116, 69, 0.10)',
  },
  heroBlobTwo: {
    position: 'absolute',
    left: -30,
    bottom: -24,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 118, 110, 0.10)',
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#d7cfbf',
    backgroundColor: 'rgba(255, 251, 243, 0.95)',
    gap: 12,
    // padding injected inline
  },
  heroCardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 16,
  },
  heroMain: {
    gap: 10,
  },
  heroMainFlex: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: brandDisplayFontFamily,
    color: '#2b1a0b',
    // fontSize and lineHeight injected inline
  },
  heroCopy: {
    color: '#4f4233',
    // fontSize and lineHeight injected inline
  },
  chaosTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chaosTag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.18)',
    backgroundColor: 'rgba(255, 251, 243, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chaosTagLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#7c2d12',
  },
  heroVisual: {
    // layout injected inline per breakpoint
  },
  heroVisualStacked: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  heroVisualCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.16)',
    backgroundColor: 'rgba(255, 247, 234, 0.95)',
    transform: [{ rotate: '9deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // width and height injected inline
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  heroActionsNarrow: {
    flexDirection: 'column',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d4c9b4',
    backgroundColor: '#f7f2e8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#463524',
  },
  reassurance: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6c5f4f',
    fontWeight: '600',
  },
  openAppLink: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  openAppLinkLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8a7b6c',
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfd5c4',
    backgroundColor: 'rgba(255, 252, 247, 0.95)',
    gap: 14,
    // padding injected inline
  },
  sectionTitle: {
    fontFamily: brandDisplayFontFamily,
    color: '#2f2012',
    // fontSize and lineHeight injected inline
  },

  // ── Free Tier cards ───────────────────────────────────────────────────────
  freeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  freeGridNarrow: {
    flexDirection: 'column',
  },
  valueCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eadfca',
    backgroundColor: '#fffdfa',
    padding: 14,
    gap: 6,
    overflow: 'hidden',
  },
  valueCardSand: {
    backgroundColor: '#fffcf5',
  },
  valueCardMint: {
    backgroundColor: '#f4fffb',
  },
  valueCardAmber: {
    backgroundColor: '#fff9f0',
  },
  valueCardFeatured: {
    flexBasis: 260,
    backgroundColor: '#fff3d6',
    borderColor: '#c97c1e',
    borderWidth: 1.5,
  },
  valueMarker: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6c4a3',
    backgroundColor: '#fff7e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  valueMarkerLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#8a5c20',
  },
  value: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '900',
    color: '#115e59',
    backgroundColor: '#ccfbf1',
  },
  valueTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    color: '#2f2012',
  },
  valueBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5b4d3e',
  },

  // ── Feature cards ─────────────────────────────────────────────────────────
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureGridNarrow: {
    flexDirection: 'column',
  },
  featureCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7dcc7',
    backgroundColor: '#fffdfa',
    padding: 14,
    gap: 6,
  },
  featureCardFeatured: {
    flexBasis: 300,
  },
  featureCardCream: {
    backgroundColor: '#fffdf9',
  },
  featureCardMint: {
    backgroundColor: '#f3fdfa',
  },
  featureCardWarm: {
    backgroundColor: '#fff6ed',
  },
  featureCardStone: {
    backgroundColor: '#f8fafc',
  },
  featureTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: '#2f2012',
  },
  featureBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5b4d3e',
  },

  // ── Preview cards ─────────────────────────────────────────────────────────
  previewSection: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d8d4cb',
    backgroundColor: '#f7f6f2',
    gap: 10,
    // padding injected inline
  },
  previewCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5d5b57',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewGridNarrow: {
    flexDirection: 'column',
  },
  previewCard: {
    flexGrow: 1,
    flexBasis: 210,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d4d4d4',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  previewPaneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewPaneChip: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  previewCardTilt: {
    transform: [{ rotate: '-2deg' }],
  },
  previewCardTab: {
    flexBasis: 260,
    backgroundColor: '#0f172a',
    borderColor: '#1e40af',
    borderWidth: 1.5,
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  previewCardTitleLight: {
    color: '#e2e8f0',
  },
  previewCardTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 2,
  },
  previewStack: {
    gap: 8,
  },
  previewLibraryEntry: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe5f0',
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 3,
  },
  previewLibraryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewLibraryTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewKeyBadge: {
    minWidth: 26,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
  },
  previewKeyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  previewLibraryArtist: {
    fontSize: 12,
    lineHeight: 16,
    color: '#334155',
    fontWeight: '600',
  },
  previewLibraryMeta: {
    fontSize: 11,
    lineHeight: 16,
    color: '#64748b',
  },
  previewSetlistEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 11,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  previewOrderBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  previewOrderBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  previewSetlistCopy: {
    flex: 1,
    gap: 1,
  },
  previewSetlistTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewSetlistMeta: {
    fontSize: 11,
    lineHeight: 15,
    color: '#64748b',
  },
  previewSnippetPanel: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#020617',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  // ── Final CTA ─────────────────────────────────────────────────────────────
  finalCta: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#decdb0',
    backgroundColor: '#fff6e9',
    gap: 12,
    // padding injected inline
  },
  finalCtaTitle: {
    fontFamily: brandDisplayFontFamily,
    color: '#2f2012',
    // fontSize and lineHeight injected inline
  },
  finalCtaBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5b4d3e',
  },
  pressed: {
    opacity: 0.86,
  },
});
