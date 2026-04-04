import 'react-native-gesture-handler';

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/features/auth';
import { SubscriptionProvider, UpgradePromptProvider } from './src/features/subscription';
import { AppNavigator } from './src/navigation/AppNavigator';
import { BassTabProvider } from './src/store/BassTabProvider';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <BassTabProvider>
              <UpgradePromptProvider>
                <StatusBar style="light" />
                <AppNavigator />
              </UpgradePromptProvider>
            </BassTabProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
