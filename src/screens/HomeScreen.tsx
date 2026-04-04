import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { WelcomeExperience } from '../components/WelcomeExperience';
import { useSubscription } from '../features/subscription';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { tier, priceLabel } = useSubscription();
  const isPro = tier === 'PRO';

  return (
    <WelcomeExperience
      actionLabel="Open App"
      secondaryActionLabel={isPro ? 'Open Account' : 'Go Pro'}
      onPrimaryAction={() => navigation.navigate('MainTabs', { screen: 'Library' })}
      onSecondaryAction={() => navigation.navigate(isPro ? 'Account' : 'Upgrade')}
      subscriptionPromo={{
        title: isPro ? 'Pro Unlocked for Every Gig' : 'Play Without Limits',
        subtitle: isPro
          ? 'You have full performance access across library, setlists, and export.'
          : 'Unlock stage-ready tools built for rehearsals, pub gigs, and no-signal venues.',
        priceLabel,
        benefits: [
          'Unlimited songs and setlists',
          'SVG Performance Mode',
          'PDF export for offline gigs',
          'Unlimited community saves',
        ],
        ctaLabel: isPro ? 'Open Account' : `Go Pro - ${priceLabel}/month`,
        onCta: () => navigation.navigate(isPro ? 'Account' : 'Upgrade'),
        note: isPro ? 'Your plan is active.' : 'No Internet at GIG - export your tabs to your device.',
      }}
    />
  );
}
