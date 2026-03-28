import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BassBackdrop } from './BassBackdrop';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';

const heroBassImage = require('../../assets/bass.png');

interface WelcomeExperienceProps {
  actionLabel: string;
  footerText?: string;
  onPrimaryAction: () => void;
}

export function WelcomeExperience({
  actionLabel,
  footerText,
  onPrimaryAction,
}: WelcomeExperienceProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BassBackdrop variant="hero" />

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, isWide && styles.heroWide]}>
          <View style={styles.heroMain}>
            <View style={styles.stickerRow}>
              <BadgeSticker label="Pub Set Ready" tone="warm" />
              <BadgeSticker label="4 Strings, No Panic" tone="cool" />
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroBadgeRow}>
                <Text style={styles.eyebrow}>Dad Band Bass</Text>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeLabel}>Rehearsal-night edition</Text>
                </View>
              </View>

              <Text style={styles.title}>Hold the low end together, even when the band doesn&apos;t.</Text>
              <Text style={styles.subtitle}>
                Keep one no-nonsense setlist, tidy up bass charts fast, and get a clean stage view for pub gigs, church runs, and Saturday dad-band rehearsals.
              </Text>

              <View style={styles.vibeRow}>
                <VibePill label="Pub gigs" />
                <VibePill label="Church bass" />
                <VibePill label="Garage rehearsals" />
              </View>

              <View style={styles.miniMeter}>
                <View style={[styles.miniMeterBar, styles.miniMeterBarShort]} />
                <View style={[styles.miniMeterBar, styles.miniMeterBarTall]} />
                <View style={[styles.miniMeterBar, styles.miniMeterBarMid]} />
                <View style={[styles.miniMeterBar, styles.miniMeterBarTall]} />
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={onPrimaryAction}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryButtonLabel}>{actionLabel}</Text>
                </Pressable>
                <View style={styles.secondaryCallout}>
                  <Text style={styles.secondaryCalloutLabel}>One setlist. Quick fixes. Big pocket energy.</Text>
                </View>
              </View>
            </View>
          </View>

          <FlatBassHero compact={!isWide} />
        </View>

        <View style={styles.featureGrid}>
          <FeatureCard
            title="Gig Bag Library"
            description="Keep rehearsal-night staples, pub-set survivors, and last-minute fixes in one place."
          />
          <FeatureCard
            title="Panic-Free Stage View"
            description="Read one section at a time with manual navigation instead of trusting flaky auto-scroll on stage."
          />
          <FeatureCard
            title="Quick Tab Cleanup"
            description="Take rough bass tab, tidy it up fast, and make it readable before rehearsal or soundcheck."
          />
        </View>

        <Text style={styles.footer}>
          {footerText ??
            (Platform.OS === 'web'
              ? 'Dad Band Bass web preview for layout and workflow validation.'
              : 'Dad Band Bass')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FlatBassHero({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.flatBassPanel, compact && styles.flatBassPanelCompact]}>
      <View style={styles.flatBassGlow} />
      <View style={[styles.flatBassWrap, compact && styles.flatBassWrapCompact]}>
        <Image
          source={heroBassImage}
          resizeMode="contain"
          style={[styles.flatBassImage, compact && styles.flatBassImageCompact]}
        />
      </View>
    </View>
  );
}

function BadgeSticker({ label, tone }: { label: string; tone: 'warm' | 'cool' }) {
  return (
    <View
      style={[
        styles.sticker,
        tone === 'warm' ? styles.stickerWarm : styles.stickerCool,
      ]}
    >
      <Text
        style={[
          styles.stickerLabel,
          tone === 'warm' ? styles.stickerLabelWarm : styles.stickerLabelCool,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function VibePill({ label }: { label: string }) {
  return (
    <View style={styles.vibePill}>
      <Text style={styles.vibePillLabel}>{label}</Text>
    </View>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  page: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 28,
  },
  hero: {
    paddingTop: 8,
    maxWidth: 840,
    gap: 14,
  },
  heroWide: {
    maxWidth: 1180,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 20,
  },
  heroMain: {
    flex: 1,
    gap: 14,
  },
  stickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingLeft: 6,
  },
  sticker: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  stickerWarm: {
    backgroundColor: '#fbbf24',
    borderColor: '#92400e',
    transform: [{ rotate: '-5deg' }],
  },
  stickerCool: {
    backgroundColor: '#99f6e4',
    borderColor: '#115e59',
    transform: [{ rotate: '4deg' }],
  },
  stickerLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stickerLabelWarm: {
    color: '#78350f',
  },
  stickerLabelCool: {
    color: '#134e4a',
  },
  heroCard: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 248, 238, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.14)',
    gap: 20,
    shadowColor: '#7c2d12',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.11,
    shadowRadius: 40,
    elevation: 8,
  },
  flatBassPanel: {
    flex: 0.92,
    minHeight: 260,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 243, 228, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.08)',
    marginRight: -24,
  },
  flatBassPanelCompact: {
    flex: undefined,
    minHeight: 220,
    marginRight: 0,
  },
  flatBassWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 12,
    paddingRight: 20,
  },
  flatBassWrapCompact: {
    minHeight: 220,
    paddingRight: 12,
  },
  flatBassGlow: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(15, 118, 110, 0.08)',
  },
  flatBassImage: {
    width: 320,
    height: 380,
    marginRight: 0,
    marginTop: 8,
    transform: [{ rotate: '8deg' }],
  },
  flatBassImageCompact: {
    width: 238,
    height: 280,
    marginRight: 0,
    transform: [{ rotate: '6deg' }],
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#9a3412',
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 118, 110, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.12)',
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#115e59',
  },
  title: {
    fontSize: 52,
    lineHeight: 58,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: palette.text,
    maxWidth: 720,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 30,
    color: '#3f3f46',
    maxWidth: 640,
  },
  vibeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(120, 53, 15, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.1)',
  },
  vibePillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c2d12',
  },
  miniMeter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingTop: 2,
  },
  miniMeterBar: {
    width: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 118, 110, 0.75)',
  },
  miniMeterBarShort: {
    height: 14,
  },
  miniMeterBarMid: {
    height: 22,
  },
  miniMeterBarTall: {
    height: 30,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 20,
    paddingHorizontal: 26,
    paddingVertical: 14,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#115e59',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  primaryButtonLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f9fafb',
  },
  pressed: {
    opacity: 0.88,
  },
  secondaryCallout: {
    minHeight: 52,
    maxWidth: 340,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(120, 53, 15, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.1)',
  },
  secondaryCalloutLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#7c2d12',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  featureCard: {
    flexGrow: 1,
    flexBasis: 220,
    borderRadius: 24,
    padding: 20,
    backgroundColor: 'rgba(255, 252, 247, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(154, 52, 18, 0.12)',
    gap: 12,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: palette.text,
  },
  featureDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
  },
  footer: {
    fontSize: 14,
    color: '#6b7280',
  },
});
