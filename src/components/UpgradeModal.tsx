import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { upgradePromptContent } from '../features/subscription/upgradePrompts';
import { useSubscription } from '../features/subscription/SubscriptionContext';
import { UpgradeTrigger } from '../features/subscription/subscriptionTypes';

interface UpgradeModalProps {
  trigger: UpgradeTrigger;
  onClose: () => void;
}

export function UpgradeModal({ trigger, onClose }: UpgradeModalProps) {
  const { width } = useWindowDimensions();
  const { upgrade, isLoading, priceLabel } = useSubscription();
  const transition = useRef(new Animated.Value(0)).current;
  const content = upgradePromptContent[trigger];
  const useTwoColumns = width > 460;

  useEffect(() => {
    Animated.timing(transition, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [transition]);

  const closeWithAnimation = () => {
    Animated.timing(transition, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  };

  const handleUpgrade = async () => {
    await upgrade();
    closeWithAnimation();
  };

  return (
    <Modal transparent animationType="none" visible onRequestClose={closeWithAnimation}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeWithAnimation} />
        <Animated.View
          style={[
            styles.card,
            {
              opacity: transition,
              transform: [
                {
                  translateY: transition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.heroGlowWarm} />
          <View style={styles.heroGlowCool} />
          <View style={styles.headerRow}>
            <Text style={styles.eyebrow}>BassTab Pro</Text>
            <View style={styles.priceMeta}>
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>{priceLabel}/month</Text>
              </View>
              <Text style={styles.priceQuip}>Cost of a beer 🍺</Text>
            </View>
          </View>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.valueStatement}>{content.valueStatement}</Text>
          <View style={styles.messagePill}>
            <Text style={styles.message}>{content.triggerMessage}</Text>
          </View>

          <View style={[styles.featureList, useTwoColumns && styles.featureListGrid]}>
            {content.features.map((feature, index) => (
              <View key={feature} style={[styles.featureRow, useTwoColumns && styles.featureRowTwoCol]}>
                <View style={styles.featureBadge}>
                  <Text style={styles.featureBadgeText}>{index + 1}</Text>
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              isLoading && styles.disabled,
            ]}
            disabled={isLoading}
            onPress={() => {
              void handleUpgrade();
            }}
          >
            <Text style={styles.primaryButtonLabel}>
              {isLoading ? 'Unlocking Pro...' : `Buy Now - ${priceLabel}/month`}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={closeWithAnimation}
          >
            <Text style={styles.secondaryButtonLabel}>Continue with Free</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 15, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    overflow: 'hidden',
    width: '100%',
    maxWidth: 520,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#111827',
    padding: 20,
    gap: 12,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  heroGlowWarm: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.24)',
    top: -62,
    right: -50,
  },
  heroGlowCool: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 211, 238, 0.14)',
    bottom: -50,
    left: -24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#f59e0b',
  },
  priceBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  priceMeta: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: '60%',
  },
  priceQuip: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#fbbf24',
  },
  title: {
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '900',
    color: '#f8fafc',
  },
  valueStatement: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    color: '#7dd3fc',
  },
  messagePill: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#cbd5e1',
  },
  featureList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  featureListGrid: {
    justifyContent: 'space-between',
  },
  featureRow: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  featureRowTwoCol: {
    width: '48.5%',
  },
  featureBadge: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  featureBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: '#e2e8f0',
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.72,
  },
});
