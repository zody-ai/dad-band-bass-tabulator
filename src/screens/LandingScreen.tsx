import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Line, Svg, Text as SvgText } from 'react-native-svg';

import { BassBackdrop } from '../components/BassBackdrop';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { useAuth } from '../features/auth/state/useAuth';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;
const bassHeroImage = require('../../assets/bass.png');

export function LandingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 760;
  const isWide = width >= 1080;
  const { authState, setAuthView, clearError, clearInfo } = useAuth();
  const isAuthenticated = authState.type === 'AUTHENTICATED';

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
      <BassBackdrop variant={isNarrow ? 'subtle' : 'hero'} />
      <ScrollView
        contentContainerStyle={[styles.page, isNarrow && styles.pageNarrow]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroBlobOne} />
          <View style={styles.heroBlobTwo} />
          <View style={[styles.heroCard, isWide && styles.heroCardWide]}>
            <View style={styles.heroMain}>
              <Text style={styles.eyebrow}>Dad Band Bass — rehearsal-night edition</Text>
              <View style={styles.badgeStrip}>
                <BadgeSticker label="PUB SET READY" tone="warm" rotation="-4deg" />
                <BadgeSticker label="4 STRINGS, NO PANIC" tone="cool" rotation="3deg" />
                <BadgeSticker label="REHEARSAL-NIGHT EDITION" tone="neutral" rotation="-2deg" />
              </View>

              <Text style={styles.heroTitle}>The bass tab workspace for rehearsals, gigs, and real-life chaos.</Text>
              <Text style={styles.heroCopy}>
                Build clean bass charts, organise setlists, fix rough tabs fast, and keep your parts ready when the
                count-in goes sideways.
              </Text>

              <View style={styles.chaosTagRow}>
                <ChaosTag label="Was the amp on?" />
                <ChaosTag label="Held together by groove" />
                <ChaosTag label="Nobody noticed, it's fine" />
              </View>

              <View style={[styles.heroActions, isNarrow && styles.heroActionsNarrow]}>
                <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={startFree}>
                  <Text style={styles.primaryButtonLabel}>Start Free</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={signIn}>
                  <Text style={styles.secondaryButtonLabel}>Sign In</Text>
                </Pressable>
              </View>
              <Text style={styles.reassurance}>No card. No pressure. Just bass.</Text>
              <Pressable style={({ pressed }) => [styles.openAppLink, pressed && styles.pressed]} onPress={openApp}>
                <Text style={styles.openAppLinkLabel}>
                  {isAuthenticated ? 'Open App' : 'Already have an account? Open App'}
                </Text>
              </Pressable>
            </View>

            <View style={[styles.heroVisual, isNarrow && styles.heroVisualNarrow]}>
              <View style={styles.heroVisualCard}>
                <Image source={bassHeroImage} resizeMode="contain" style={styles.heroVisualImage} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Free Tier That Actually Gets You Playing</Text>
          <View style={[styles.freeGrid, isNarrow && styles.freeGridNarrow]}>
            <ValueCard
              value="10 Songs"
              marker="LIB"
              title="Your Own Library"
              body="Keep up to ten songs ready for practice and rehearsal nights."
              tone="sand"
            />
            <ValueCard
              value="2 Community Saves"
              marker="COM"
              title="Borrow Good Ideas"
              body="Copy two community songs and adapt them to your own setup."
              tone="mint"
            />
            <ValueCard
              value="2 AI Songs"
              marker="AI"
              title="Kickstart New Ideas"
              body="Generate two starter charts when the band says “let's jam in A”."
              tone="amber"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What You Can Do in BassTab</Text>
          <View style={[styles.featureGrid, isNarrow && styles.featureGridNarrow]}>
            <FeatureCard
              title="Build your own library"
              body="Keep your rehearsed versions, not random screenshots from chat."
              tone="cream"
            />
            <FeatureCard
              title="Tidy rough tab fast"
              body="Clean up messy lines before rehearsal instead of decoding on the fly."
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
              body="Carry a print-friendly fallback for low-signal venues."
              tone="stone"
            />
            <FeatureCard
              title="AI-generated approximations"
              body="Get a quick bass starting point when no clean tab exists, then tweak it to fit your band."
              tone="mint"
            />
            <FeatureCard
              title="Discover community tabs"
              body="Find shared songs and make them your own in minutes."
              tone="cream"
            />
          </View>
        </View>

        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Quick Preview</Text>
          <Text style={styles.previewCopy}>This is the kind of workspace you get after sign-up.</Text>
          <View style={[styles.previewGrid, isNarrow && styles.previewGridNarrow]}>
            <View style={styles.previewCard}>
              <Text style={styles.previewCardTitle}>Library</Text>
              <Text style={styles.previewLine}>• Hysteria (Rehearsal Cut)</Text>
              <Text style={styles.previewLine}>• Longview (Dropped intro fixed)</Text>
              <Text style={styles.previewLine}>• Valerie (Wedding set version)</Text>
            </View>
            <View style={[styles.previewCard, styles.previewCardTilt]}>
              <Text style={styles.previewCardTitle}>Setlist: Friday Pub</Text>
              <Text style={styles.previewLine}>1. Superstition</Text>
              <Text style={styles.previewLine}>2. Mr. Brightside</Text>
              <Text style={styles.previewLine}>3. Use Somebody</Text>
            </View>
            <View style={styles.previewCard}>
              <Text style={styles.previewCardTitle}>Tab Snippet</Text>
              <View style={styles.previewSnippetPanel}>
                <Svg viewBox="0 0 280 96" width="100%" height={96}>
                  <Line x1="34" y1="16" x2="262" y2="16" stroke="#64748b" strokeWidth="1.25" />
                  <Line x1="34" y1="36" x2="262" y2="36" stroke="#64748b" strokeWidth="1.25" />
                  <Line x1="34" y1="56" x2="262" y2="56" stroke="#64748b" strokeWidth="1.25" />
                  <Line x1="34" y1="76" x2="262" y2="76" stroke="#64748b" strokeWidth="1.25" />

                  <SvgText x="10" y="20" fill="#94a3b8" fontSize="11" fontWeight="700">G</SvgText>
                  <SvgText x="10" y="40" fill="#94a3b8" fontSize="11" fontWeight="700">D</SvgText>
                  <SvgText x="10" y="60" fill="#94a3b8" fontSize="11" fontWeight="700">A</SvgText>
                  <SvgText x="10" y="80" fill="#94a3b8" fontSize="11" fontWeight="700">E</SvgText>

                  <Line x1="34" y1="16" x2="34" y2="76" stroke="#64748b" strokeWidth="1.5" />
                  <Line x1="92" y1="16" x2="92" y2="76" stroke="#64748b" strokeWidth="1.5" />
                  <Line x1="150" y1="16" x2="150" y2="76" stroke="#64748b" strokeWidth="1.5" />
                  <Line x1="208" y1="16" x2="208" y2="76" stroke="#64748b" strokeWidth="1.5" />
                  <Line x1="262" y1="16" x2="262" y2="76" stroke="#64748b" strokeWidth="1.5" />

                  <SvgText x="62" y="60" fill="#e0f2fe" fontSize="15" fontWeight="800" textAnchor="middle">5</SvgText>
                  <SvgText x="80" y="40" fill="#e0f2fe" fontSize="15" fontWeight="800" textAnchor="middle">7</SvgText>
                  <SvgText x="120" y="40" fill="#e0f2fe" fontSize="15" fontWeight="800" textAnchor="middle">5</SvgText>
                  <SvgText x="138" y="60" fill="#e0f2fe" fontSize="15" fontWeight="800" textAnchor="middle">7</SvgText>
                  <SvgText x="176" y="80" fill="#e0f2fe" fontSize="15" fontWeight="800" textAnchor="middle">3</SvgText>
                  <SvgText x="194" y="60" fill="#e0f2fe" fontSize="15" fontWeight="800" textAnchor="middle">5</SvgText>
                  <SvgText x="228" y="40" fill="#e0f2fe" fontSize="15" fontWeight="800" textAnchor="middle">7</SvgText>
                </Svg>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.finalCta}>
          <Text style={styles.finalCtaTitle}>Ready to keep your next rehearsal under control?</Text>
          <Text style={styles.finalCtaBody}>Start free, keep your low end organised, upgrade only when you need more room.</Text>
          <View style={[styles.heroActions, isNarrow && styles.heroActionsNarrow]}>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={startFree}>
              <Text style={styles.primaryButtonLabel}>Start Free</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={signIn}>
              <Text style={styles.secondaryButtonLabel}>Sign In</Text>
            </Pressable>
          </View>
          <Text style={styles.reassurance}>No card. No pressure. Just bass.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BadgeSticker({
  label,
  tone,
  rotation,
}: {
  label: string;
  tone: 'warm' | 'cool' | 'neutral';
  rotation: string;
}) {
  return (
    <View
      style={[
        styles.badgeSticker,
        tone === 'warm' && styles.badgeStickerWarm,
        tone === 'cool' && styles.badgeStickerCool,
        tone === 'neutral' && styles.badgeStickerNeutral,
        { transform: [{ rotate: rotation }] },
      ]}
    >
      <Text style={styles.badgeStickerLabel}>{label}</Text>
    </View>
  );
}

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
}: {
  value: string;
  marker: string;
  title: string;
  body: string;
  tone: 'sand' | 'mint' | 'amber';
}) {
  return (
    <View
      style={[
        styles.valueCard,
        tone === 'sand' && styles.valueCardSand,
        tone === 'mint' && styles.valueCardMint,
        tone === 'amber' && styles.valueCardAmber,
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  page: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 28,
    gap: 18,
  },
  pageNarrow: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 14,
  },
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
    padding: 20,
    gap: 12,
  },
  heroCardWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  heroMain: {
    flex: 1,
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
    color: '#8a5c20',
  },
  badgeStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeSticker: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeStickerWarm: {
    borderColor: '#92400e',
    backgroundColor: '#fde68a',
  },
  badgeStickerCool: {
    borderColor: '#115e59',
    backgroundColor: '#99f6e4',
  },
  badgeStickerNeutral: {
    borderColor: '#cbd5e1',
    backgroundColor: '#eef2ff',
  },
  badgeStickerLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: '#2b1a0b',
  },
  heroTitle: {
    fontSize: 44,
    lineHeight: 48,
    fontFamily: brandDisplayFontFamily,
    color: '#2b1a0b',
  },
  heroCopy: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4f4233',
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
    width: 290,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  heroVisualNarrow: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  heroVisualCard: {
    width: 250,
    height: 260,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.16)',
    backgroundColor: 'rgba(255, 247, 234, 0.95)',
    transform: [{ rotate: '6deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroVisualImage: {
    width: 230,
    height: 240,
    transform: [{ rotate: '8deg' }],
  },
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
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d4c9b4',
    backgroundColor: '#f7f2e8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
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
    paddingVertical: 4,
  },
  openAppLinkLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f766e',
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dfd5c4',
    backgroundColor: 'rgba(255, 252, 247, 0.95)',
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 23,
    lineHeight: 29,
    fontFamily: brandDisplayFontFamily,
    color: '#2f2012',
  },
  freeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  freeGridNarrow: {
    flexDirection: 'column',
  },
  valueCard: {
    flexGrow: 1,
    flexBasis: 210,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eadfca',
    backgroundColor: '#fffdfa',
    padding: 12,
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
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    padding: 12,
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
  previewSection: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d8d4cb',
    backgroundColor: '#f7f6f2',
    padding: 16,
    gap: 10,
  },
  previewCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5d5b57',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
  previewCardTilt: {
    transform: [{ rotate: '-2deg' }],
  },
  previewCardTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 2,
  },
  previewLine: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4b5563',
  },
  previewSnippetPanel: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  finalCta: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#decdb0',
    backgroundColor: '#fff6e9',
    padding: 16,
    gap: 10,
  },
  finalCtaTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: brandDisplayFontFamily,
    color: '#2f2012',
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
