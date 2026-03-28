import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { WelcomeExperience } from '../components/WelcomeExperience';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

export function LandingScreen({ navigation }: Props) {
  return (
    <WelcomeExperience
      actionLabel="Open App"
      onPrimaryAction={() => navigation.replace('MainTabs')}
    />
  );
}
