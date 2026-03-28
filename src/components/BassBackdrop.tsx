import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { palette } from '../constants/colors';

interface BassBackdropProps {
  variant?: 'hero' | 'subtle';
}

export function BassBackdrop({ variant = 'subtle' }: BassBackdropProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 760;

  if (variant === 'hero') {
    return (
      <View pointerEvents="none" style={styles.layer}>
        <View style={[styles.wash, styles.heroWashTop]} />
        <View style={[styles.wash, styles.heroWashBottom]} />
        <View style={[styles.stageStripe, styles.stageStripeA]} />
        <View style={[styles.stageStripe, styles.stageStripeB]} />
        <View style={[styles.doodleRing, styles.doodleRingA]} />
        <View style={[styles.doodleRing, styles.doodleRingB]} />

        <View
          style={[
            styles.bass,
            styles.heroBassA,
            isCompact && styles.heroBassACompact,
          ]}
        >
          <View style={[styles.bassBody, styles.bassBodyWarm]} />
          <View style={[styles.bassNeck, styles.bassNeckDark]} />
          <View style={[styles.bassHead, styles.bassHeadDark]} />
          <View style={styles.stringGroup}>
            <View style={[styles.stringLine, styles.stringLineDark]} />
            <View style={[styles.stringLine, styles.stringLineDark]} />
            <View style={[styles.stringLine, styles.stringLineDark]} />
            <View style={[styles.stringLine, styles.stringLineDark]} />
          </View>
        </View>

        <View
          style={[
            styles.bass,
            styles.heroBassB,
            isCompact && styles.heroBassBCompact,
          ]}
        >
          <View style={[styles.bassBody, styles.bassBodyTeal]} />
          <View style={[styles.bassNeck, styles.bassNeckMuted]} />
          <View style={[styles.bassHead, styles.bassHeadMuted]} />
          <View style={styles.stringGroup}>
            <View style={[styles.stringLine, styles.stringLineMuted]} />
            <View style={[styles.stringLine, styles.stringLineMuted]} />
            <View style={[styles.stringLine, styles.stringLineMuted]} />
            <View style={[styles.stringLine, styles.stringLineMuted]} />
          </View>
        </View>

        <View style={[styles.fretboardAccent, styles.fretboardAccentA]} />
        <View style={[styles.fretboardAccent, styles.fretboardAccentB]} />
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={styles.layer}>
      <View style={[styles.wash, styles.subtleWashTop]} />
      <View style={[styles.wash, styles.subtleWashBottom]} />

      <View style={[styles.bass, styles.subtleBassLeft, isCompact && styles.subtleBassLeftCompact]}>
        <View style={[styles.bassBody, styles.bassBodyFaint]} />
        <View style={[styles.bassNeck, styles.bassNeckFaint]} />
        <View style={[styles.bassHead, styles.bassHeadFaint]} />
        <View style={styles.stringGroup}>
          <View style={[styles.stringLine, styles.stringLineFaint]} />
          <View style={[styles.stringLine, styles.stringLineFaint]} />
          <View style={[styles.stringLine, styles.stringLineFaint]} />
          <View style={[styles.stringLine, styles.stringLineFaint]} />
        </View>
      </View>

      <View
        style={[
          styles.bass,
          styles.subtleBassRight,
          isCompact && styles.subtleBassRightCompact,
        ]}
      >
        <View style={[styles.bassBody, styles.bassBodyGhost]} />
        <View style={[styles.bassNeck, styles.bassNeckGhost]} />
        <View style={[styles.bassHead, styles.bassHeadGhost]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  wash: {
    position: 'absolute',
    borderRadius: 999,
  },
  heroWashTop: {
    top: -120,
    right: -40,
    width: 360,
    height: 360,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
  },
  heroWashBottom: {
    bottom: -180,
    left: -40,
    width: 420,
    height: 420,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
  },
  subtleWashTop: {
    top: -120,
    right: -120,
    width: 280,
    height: 280,
    backgroundColor: 'rgba(217, 119, 6, 0.07)',
  },
  subtleWashBottom: {
    bottom: -160,
    left: -100,
    width: 240,
    height: 240,
    backgroundColor: 'rgba(13, 148, 136, 0.06)',
  },
  stageStripe: {
    position: 'absolute',
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
  },
  stageStripeA: {
    top: 96,
    left: 36,
    width: 160,
    transform: [{ rotate: '-12deg' }],
  },
  stageStripeB: {
    bottom: 124,
    right: 64,
    width: 210,
    transform: [{ rotate: '18deg' }],
  },
  doodleRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(120, 53, 15, 0.16)',
  },
  doodleRingA: {
    top: 132,
    left: 74,
    width: 56,
    height: 56,
  },
  doodleRingB: {
    bottom: 88,
    right: 120,
    width: 72,
    height: 72,
    borderColor: 'rgba(15, 118, 110, 0.16)',
  },
  bass: {
    position: 'absolute',
    alignItems: 'center',
  },
  heroBassA: {
    top: 52,
    right: -8,
    transform: [{ rotate: '24deg' }],
  },
  heroBassACompact: {
    top: 12,
    right: -46,
    transform: [{ rotate: '30deg' }, { scale: 0.82 }],
  },
  heroBassB: {
    bottom: -28,
    left: -8,
    transform: [{ rotate: '-18deg' }],
  },
  heroBassBCompact: {
    bottom: -82,
    left: -62,
    transform: [{ rotate: '-22deg' }, { scale: 0.88 }],
  },
  subtleBassLeft: {
    top: 120,
    left: -26,
    opacity: 0.55,
    transform: [{ rotate: '-16deg' }, { scale: 0.88 }],
  },
  subtleBassLeftCompact: {
    top: 180,
    left: -56,
    transform: [{ rotate: '-20deg' }, { scale: 0.72 }],
  },
  subtleBassRight: {
    top: 40,
    right: -54,
    opacity: 0.38,
    transform: [{ rotate: '18deg' }, { scale: 0.92 }],
  },
  subtleBassRightCompact: {
    top: 28,
    right: -92,
    transform: [{ rotate: '24deg' }, { scale: 0.7 }],
  },
  bassBody: {
    width: 130,
    height: 176,
    borderRadius: 72,
  },
  bassBodyWarm: {
    backgroundColor: 'rgba(120, 53, 15, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(120, 53, 15, 0.12)',
  },
  bassBodyTeal: {
    backgroundColor: 'rgba(15, 118, 110, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(15, 118, 110, 0.1)',
  },
  bassBodyFaint: {
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.12)',
  },
  bassBodyGhost: {
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.04)',
  },
  bassNeck: {
    width: 20,
    height: 240,
    marginTop: -10,
    borderRadius: 10,
  },
  bassNeckDark: {
    backgroundColor: 'rgba(28, 25, 23, 0.14)',
  },
  bassNeckMuted: {
    backgroundColor: 'rgba(15, 23, 42, 0.1)',
  },
  bassNeckFaint: {
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
  },
  bassNeckGhost: {
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  bassHead: {
    width: 38,
    height: 54,
    marginTop: -4,
    borderRadius: 18,
  },
  bassHeadDark: {
    backgroundColor: 'rgba(28, 25, 23, 0.16)',
  },
  bassHeadMuted: {
    backgroundColor: 'rgba(15, 23, 42, 0.11)',
  },
  bassHeadFaint: {
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  bassHeadGhost: {
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
  },
  stringGroup: {
    position: 'absolute',
    top: 142,
    width: 112,
    gap: 5,
  },
  stringLine: {
    height: 2,
    borderRadius: 999,
  },
  stringLineDark: {
    backgroundColor: 'rgba(28, 25, 23, 0.2)',
  },
  stringLineMuted: {
    backgroundColor: 'rgba(15, 23, 42, 0.14)',
  },
  stringLineFaint: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  stringLineGhost: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
  },
  fretboardAccent: {
    position: 'absolute',
    height: 2,
    borderRadius: 999,
    backgroundColor: palette.surface,
    opacity: 0.46,
  },
  fretboardAccentA: {
    top: 188,
    right: 140,
    width: 220,
    transform: [{ rotate: '24deg' }],
  },
  fretboardAccentB: {
    bottom: 132,
    left: 80,
    width: 180,
    transform: [{ rotate: '-18deg' }],
  },
});
