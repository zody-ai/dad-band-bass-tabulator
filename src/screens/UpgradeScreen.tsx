import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSubscription } from '../features/subscription';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Upgrade'>;

const benefits = [
  'Unlimited songs',
  'Unlimited setlists',
  'Performance Mode (SVG)',
  'Unlimited community song saves',
];

export function UpgradeScreen({ navigation }: Props) {
  const { tier, upgrade, isLoading, priceLabel } = useSubscription();

  const handleUpgrade = async () => {
    await upgrade();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>BassTab Pro</Text>
          <Text style={styles.heroTitle}>Play Without Limits 🎸</Text>
          <Text style={styles.heroSubtitle}>
            Keep every song tight, every setlist ready, and every chart readable on stage.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Benefits</Text>
          <View style={styles.benefitList}>
            {benefits.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <View style={styles.dot} />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <Text style={styles.price}>{priceLabel}/month</Text>
          <Text style={styles.priceNote}>Cancel anytime.</Text>
        </View>

        {tier === 'PRO' ? (
          <View style={styles.proCard}>
            <Text style={styles.proTitle}>You’re already on Pro 🎸</Text>
            <Text style={styles.proText}>Everything is unlocked for performance mode.</Text>
          </View>
        ) : null}

        <Pressable
          disabled={isLoading || tier === 'PRO'}
          onPress={() => {
            void handleUpgrade();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            (isLoading || tier === 'PRO') && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {tier === 'PRO' ? 'Pro Unlocked' : isLoading ? 'Unlocking Pro...' : `Buy Now - ${priceLabel}/month`}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonLabel}>Maybe later</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 26,
    gap: 14,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#1e293b',
    backgroundColor: '#0f172a',
    padding: 18,
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#f59e0b',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    color: '#f8fafc',
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#cbd5e1',
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  benefitList: {
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#f59e0b',
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#e2e8f0',
  },
  price: {
    fontSize: 32,
    fontWeight: '900',
    color: '#f8fafc',
  },
  priceNote: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  proCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    backgroundColor: '#1e3a8a',
    padding: 14,
    gap: 6,
  },
  proTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#dbeafe',
  },
  proText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#dbeafe',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.65,
  },
});
