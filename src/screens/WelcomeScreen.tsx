import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { WelcomeExperience } from '../components/WelcomeExperience';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <WelcomeExperience
      actionLabel="Open Library"
      secondaryActionLabel="Open Setlist"
      footerText="Dad Band Bass welcome screen for the free single-setlist version."
      onPrimaryAction={() => navigation.navigate('MainTabs', { screen: 'Library' })}
      onSecondaryAction={() => navigation.navigate('MainTabs', { screen: 'Setlist' })}
    />
  );
}
