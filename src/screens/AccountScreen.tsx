import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppSectionNav } from '../components/AppSectionNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { useSubscription } from '../features/subscription';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

export function AccountScreen({ navigation }: Props) {
  const { tier } = useSubscription();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Manage your BassTab plan and unlock performance upgrades.</Text>
        <AppSectionNav
          current="GoPro"
          onHome={() => navigation.navigate('Home')}
          onLibrary={() => navigation.navigate('MainTabs', { screen: 'Library' })}
          onSetlist={() => navigation.navigate('MainTabs', { screen: 'Setlist' })}
          onImport={() => navigation.navigate('MainTabs', { screen: 'Import' })}
          onGoPro={() => navigation.navigate('Upgrade')}
        />
      </View>

      <View style={[styles.subscriptionCard, tier === 'PRO' && styles.subscriptionCardPro]}>
        <Text style={styles.sectionLabel}>Subscription</Text>
        {tier === 'PRO' ? (
          <>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Text style={styles.planTitle}>You’re on Pro 🎸</Text>
            <Text style={styles.planText}>
              Unlimited songs, unlimited setlists, SVG performance mode, and full community access are unlocked.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.planTitle}>You’re on Free Plan</Text>
            <Text style={styles.planText}>
              Upgrade for unlimited songs and setlists, SVG performance mode, and full community access.
            </Text>
            <PrimaryButton
              label="Upgrade to Pro"
              onPress={() => navigation.navigate('Upgrade')}
            />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: brandDisplayFontFamily,
    letterSpacing: 0.2,
    color: palette.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#4b5563',
  },
  subscriptionCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 18,
    gap: 12,
  },
  subscriptionCardPro: {
    borderColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '700',
    color: palette.textMuted,
  },
  proBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1e3a8a',
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#dbeafe',
  },
  planTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: palette.text,
  },
  planText: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textMuted,
  },
});
