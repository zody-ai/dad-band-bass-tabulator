import { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
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
  const { upgrade, isLoading, priceLabel } = useSubscription();
  const transition = useRef(new Animated.Value(0)).current;
  const content = upgradePromptContent[trigger];

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
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.valueStatement}>{content.valueStatement}</Text>
          <Text style={styles.message}>{content.triggerMessage}</Text>

          <View style={styles.featureList}>
            {content.features.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <View style={styles.dot} />
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
    width: '100%',
    maxWidth: 460,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0b0b0f',
    padding: 20,
    gap: 12,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
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
    color: '#93c5fd',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#cbd5e1',
  },
  featureList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
    padding: 14,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#f59e0b',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
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
