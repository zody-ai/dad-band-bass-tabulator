import { useState } from 'react';
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
const headlinePool = [
  'Hold the low end together, even when the band doesn\'t.',
  'Keep the bass part steady while everything else gets creative.',
  'Tidy the tab, lock the groove, survive the rehearsal.',
  'For nights when the chart is rough and the count-in is worse.',
  'Because somebody in the band has to know what comes next.',
];
const vibePillPool = [
  'Pub gigs',
  'Questionable endings',
  'Garage rehearsals',
  'One too many intros',
  'Bass face included',
  'Singer picked the wrong key',
  'Tempo discussions pending',
  'Played it right eventually',
  'That count-in was ambitious',
  'Held together by groove',
];

interface WelcomeExperienceProps {
  actionLabel: string;
  secondaryActionLabel?: string;
  footerText?: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  subscriptionPromo?: {
    title: string;
    subtitle: string;
    priceLabel?: string;
    benefits: string[];
    ctaLabel: string;
    onCta: () => void;
    note?: string;
  };
}

export function WelcomeExperience({
  actionLabel,
  secondaryActionLabel,
  footerText,
  onPrimaryAction,
  onSecondaryAction,
  subscriptionPromo,
}: WelcomeExperienceProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const isNarrow = width < 760;
  const [headline] = useState(() => {
    const index = Math.floor(Math.random() * headlinePool.length);
    return headlinePool[index];
  });
  const [vibePills] = useState(() => {
    const shuffled = [...vibePillPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <BassBackdrop variant={isNarrow ? 'subtle' : 'hero'} />

      <ScrollView
        contentContainerStyle={[styles.page, isNarrow && styles.pageNarrow]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, isWide && styles.heroWide]}>
          <View style={styles.heroMain}>
            {!isNarrow ? (
              <View style={styles.stickerRow}>
                <BadgeSticker label="Pub Set Ready" tone="warm" />
                <BadgeSticker label="4 Strings, No Panic" tone="cool" />
              </View>
            ) : null}

            <View style={[styles.heroCard, isNarrow && styles.heroCardNarrow]}>
              <View style={styles.heroBadgeRow}>
                <Text style={styles.eyebrow}>Dad Band Bass</Text>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeLabel}>Rehearsal-night edition</Text>
                </View>
              </View>

              <Text style={[styles.title, isNarrow && styles.titleNarrow]}>
                {headline}
              </Text>
              <Text style={[styles.subtitle, isNarrow && styles.subtitleNarrow]}>
                Build rehearsal-ready setlists, tidy up bass charts fast, and keep a clean stage view for pub gigs, church runs, and Saturday band rehearsals.
              </Text>

              <View style={styles.vibeRow}>
                {vibePills.map((label: string) => (
                  <VibePill key={label} label={label} />
                ))}
              </View>

              <View style={styles.miniMeter}>
                <View style={[styles.miniMeterBar, styles.miniMeterBarShort]} />
                <View style={[styles.miniMeterBar, styles.miniMeterBarTall]} />
                <View style={[styles.miniMeterBar, styles.miniMeterBarMid]} />
                <View style={[styles.miniMeterBar, styles.miniMeterBarTall]} />
              </View>

              <View style={[styles.actions, isNarrow && styles.actionsNarrow]}>
                <Pressable
                  onPress={onPrimaryAction}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    isNarrow && styles.primaryButtonNarrow,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonLabel}>{actionLabel}</Text>
                </Pressable>
                {secondaryActionLabel && onSecondaryAction ? (
                  <Pressable
                    onPress={onSecondaryAction}
                    style={({ pressed }) => [
                      styles.secondaryActionButton,
                      isNarrow && styles.secondaryActionButtonNarrow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.secondaryActionButtonLabel}>{secondaryActionLabel}</Text>
                  </Pressable>
                ) : null}
              </View>

            </View>
          </View>

          {!isNarrow ? <FlatBassHero compact={!isWide} /> : null}
        </View>

        {isNarrow ? <FlatBassHero compact /> : null}

        <View style={[styles.featureGrid, isNarrow && styles.featureGridNarrow]}>
          <FeatureCard
            title="Gig Bag Library"
            description="Keep rehearsal-night staples, pub-set survivors, and last-minute fixes in one place."
          />
          <FeatureCard
            title="Panic-Free Stage View"
            description="Read one section at a time with manual navigation instead of trusting flaky auto-scroll on stage."
          />
          <FeatureCard
            title="Offline PDF Backup"
            description="No signal at the gig? Export a PDF before you leave and keep the chart on your device."
            pillLabel="Pro only"
          />
          <FeatureCard
            title="Quick Tab Cleanup"
            description="Take rough bass tab, tidy it up fast, and make it readable before rehearsal or soundcheck."
          />
        </View>

        {subscriptionPromo ? (
          <View style={[styles.proCard, isNarrow && styles.proCardNarrow]}>
            <View style={styles.proHeader}>
              <Text style={styles.proEyebrow}>Go Pro</Text>
              <Text style={styles.proTitle}>{subscriptionPromo.title}</Text>
              <Text style={styles.proSubtitle}>{subscriptionPromo.subtitle}</Text>
            </View>

            <View style={styles.proBenefits}>
              {subscriptionPromo.benefits.map((benefit) => (
                <View key={benefit} style={styles.proBenefitPill}>
                  <Text style={styles.proBenefitLabel}>{benefit}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.proActions, isNarrow && styles.proActionsNarrow]}>
              <Pressable
                onPress={subscriptionPromo.onCta}
                style={({ pressed }) => [
                  styles.proCtaButton,
                  isNarrow && styles.proCtaButtonNarrow,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.proCtaLabel}>{subscriptionPromo.ctaLabel}</Text>
              </Pressable>
              <Text style={styles.proPriceText}>
                {subscriptionPromo.priceLabel
                  ? `${subscriptionPromo.priceLabel}/month`
                  : '£4.99/month'}
              </Text>
            </View>

            {subscriptionPromo.note ? (
              <Text style={styles.proNote}>{subscriptionPromo.note}</Text>
            ) : null}
          </View>
        ) : null}

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
  pillLabel,
}: {
  title: string;
  description: string;
  pillLabel?: string;
}) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
      {pillLabel ? (
        <View style={styles.featurePill}>
          <Text style={styles.featurePillLabel}>{pillLabel}</Text>
        </View>
      ) : null}
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
  pageNarrow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 18,
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
  heroCardNarrow: {
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: 24,
    gap: 16,
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
    minHeight: 180,
    borderRadius: 24,
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
    minHeight: 180,
    paddingLeft: 12,
    paddingRight: 12,
    alignItems: 'center',
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
    width: 220,
    height: 200,
    marginRight: 0,
    marginTop: 0,
    transform: [{ rotate: '3deg' }],
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
  titleNarrow: {
    fontSize: 38,
    lineHeight: 42,
    maxWidth: undefined,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 30,
    color: '#3f3f46',
    maxWidth: 640,
  },
  subtitleNarrow: {
    fontSize: 18,
    lineHeight: 27,
    maxWidth: undefined,
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
  actionsNarrow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
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
  primaryButtonNarrow: {
    width: '100%',
  },
  primaryButtonLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f9fafb',
  },
  secondaryActionButton: {
    minHeight: 52,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionButtonNarrow: {
    width: '100%',
  },
  secondaryActionButtonLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7c2d12',
  },
  pressed: {
    opacity: 0.88,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  featureGridNarrow: {
    flexDirection: 'column',
    gap: 12,
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
  featurePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0f172a',
  },
  featurePillLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#bfdbfe',
  },
  proCard: {
    borderRadius: 28,
    padding: 20,
    gap: 14,
    backgroundColor: '#0b0b0f',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 6,
  },
  proCardNarrow: {
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  proHeader: {
    gap: 4,
  },
  proEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#7dd3fc',
  },
  proTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    color: '#f8fafc',
  },
  proSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#cbd5e1',
  },
  proBenefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  proBenefitPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.35)',
  },
  proBenefitLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e0f2fe',
  },
  proActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  proActionsNarrow: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  proCtaButton: {
    minHeight: 50,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proCtaButtonNarrow: {
    width: '100%',
  },
  proCtaLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
  },
  proPriceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  proNote: {
    fontSize: 13,
    lineHeight: 20,
    color: '#93c5fd',
  },
  footer: {
    fontSize: 14,
    color: '#6b7280',
  },
});
