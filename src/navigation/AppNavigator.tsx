import { useEffect } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  LinkingOptions,
  useNavigation,
  getStateFromPath as getNativeStateFromPath,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { AuthEntryScreen } from '../features/auth/components/AuthEntryScreen';
import { ResetPasswordScreen } from '../features/auth/components/ResetPasswordScreen';
import { VerifyEmailScreen } from '../features/auth/components/VerifyEmailScreen';
import { useAuth } from '../features/auth/state/useAuth';
import { AccountScreen } from '../screens/AccountScreen';
import { AISongCreationScreen } from '../screens/AISongCreationScreen';
import { ImportDetailScreen } from '../screens/ImportDetailScreen';
import { ImportPasteScreen } from '../screens/ImportPasteScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { LandingScreen } from '../screens/LandingScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { LiveViewScreen } from '../screens/LiveViewScreen';
import { SetlistExportScreen } from '../screens/SetlistExportScreen';
import { SetlistPerformanceScreen } from '../screens/SetlistPerformanceScreen';
import { SongExportScreen } from '../screens/SongExportScreen';
import { SetlistScreen } from '../screens/SetlistScreen';
import { SongEditorScreen } from '../screens/SongEditorScreen';
import { UpgradeScreen } from '../screens/UpgradeScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { RootStackParamList, TabParamList } from './types';
import { SongEditorErrorBoundary } from '../components/SongEditorErrorBoundary';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function ProtectedRedirectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();

  useEffect(() => {
    if (authState.type === 'RESTORING_SESSION') {
      return;
    }

    if (authState.type === 'AUTHENTICATED') {
      navigation.replace('MainTabs', { screen: 'Library' });
      return;
    }

    navigation.replace('AuthEntry', {
      view: 'LOGIN',
      source: 'protected-route',
    });
  }, [authState.type, navigation]);

  return null;
}

function AuthenticatedRedirectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { authState } = useAuth();

  useEffect(() => {
    if (authState.type === 'RESTORING_SESSION') {
      return;
    }

    if (authState.type === 'AUTHENTICATED') {
      navigation.replace('MainTabs', { screen: 'Library' });
      return;
    }

    navigation.replace('AuthEntry', {
      view: 'LOGIN',
      source: 'authenticated-route',
    });
  }, [authState.type, navigation]);

  return null;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          minHeight: 70,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: palette.surface,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Setlist"
        component={SetlistScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Import"
        component={ImportScreen}
        options={{
          tabBarLabel: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="AICreate"
        component={AISongCreationScreen}
        options={{
          tabBarLabel: 'AI Create',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const defaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.background,
    card: palette.surface,
    border: palette.border,
    text: palette.text,
    primary: palette.primary,
  },
};

const webOrigin =
  typeof globalThis !== 'undefined' &&
  typeof (globalThis as { location?: { origin?: unknown } }).location?.origin === 'string'
    ? ((globalThis as { location?: { origin?: string } }).location?.origin ?? '')
    : '';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [webOrigin, 'basstab://'].filter(Boolean),
  config: {
    screens: {
      AuthEntry: 'auth',
      ResetPassword: 'auth/reset-password',
      MainTabs: {
        path: 'MainTabs',
        screens: {
          Library: 'Library',
          Setlist: 'Setlist',
          Import: 'Community',
        },
      },
      SongEditor: 'song/:songId',
      PerformanceView: 'performance/:songId',
      ExportSong: 'export/:songId',
      Landing: '',
    },
  },
  getStateFromPath: (path, options) => {
    const normalizedPath = path?.replace('/MainTabs/MainTabs/', '/MainTabs/') ?? path;
    const trimmedPath = (normalizedPath ?? '').replace(/^\/+/, '');

    if (trimmedPath.startsWith('auth/reset-password')) {
      return {
        routes: [{ name: 'ResetPassword' }],
      };
    }

    return getNativeStateFromPath(normalizedPath, options);
  },
};

export function AppNavigator() {
  const { authState } = useAuth();
  const isAuthenticated = authState.type === 'AUTHENTICATED';
  const initialRouteName: keyof RootStackParamList = 'Landing';

  return (
    <NavigationContainer theme={defaultTheme} linking={linking}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          contentStyle: { backgroundColor: palette.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: palette.background },
          headerTitleStyle: {
            color: palette.text,
            fontWeight: '700',
            fontFamily: brandDisplayFontFamily,
          },
        }}
      >
        <>
            <Stack.Screen
              name="Landing"
              component={LandingScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AuthEntry"
              component={isAuthenticated ? AuthenticatedRedirectScreen : AuthEntryScreen}
              options={{ headerShown: false }}
            />
            {isAuthenticated ? (
              <>
                <Stack.Screen
                  name="MainTabs"
                  component={MainTabs}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Welcome"
                  component={WelcomeScreen}
                  options={{
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="Home"
                  options={{ headerShown: false }}
                >
                  {(props) => (
                    <LandingScreen
                      {...(props as unknown as NativeStackScreenProps<RootStackParamList, 'Landing'>)}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="Account"
                  component={AccountScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="Upgrade"
                  component={UpgradeScreen}
                  options={{
                    title: 'Go Pro',
                    headerStyle: { backgroundColor: '#0b0b0f' },
                    headerTintColor: '#f8fafc',
                    headerTitleStyle: {
                      color: '#f8fafc',
                      fontWeight: '700',
                      fontFamily: brandDisplayFontFamily,
                    },
                    contentStyle: { backgroundColor: '#0b0b0f' },
                  }}
                />
                <Stack.Screen name="SongEditor" options={{ headerShown: false }}>
                  {(props) => (
                    <SongEditorErrorBoundary>
                      <SongEditorScreen {...props} />
                    </SongEditorErrorBoundary>
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="PerformanceView"
                  component={LiveViewScreen}
                  options={{
                    title: 'Dad Band Bass Live View',
                    headerStyle: { backgroundColor: palette.liveBackground },
                    headerTintColor: palette.liveText,
                    headerTitleStyle: {
                      color: palette.liveText,
                      fontWeight: '700',
                      fontFamily: brandDisplayFontFamily,
                    },
                    contentStyle: { backgroundColor: palette.liveBackground },
                  }}
                />
                <Stack.Screen
                  name="SetlistPerformance"
                  component={SetlistPerformanceScreen}
                  options={{
                    title: 'Setlist Performance',
                    headerStyle: { backgroundColor: palette.liveBackground },
                    headerTintColor: palette.liveText,
                    headerTitleStyle: {
                      color: palette.liveText,
                      fontWeight: '700',
                      fontFamily: brandDisplayFontFamily,
                    },
                    contentStyle: { backgroundColor: palette.liveBackground },
                  }}
                />
                <Stack.Screen
                  name="ExportSong"
                  component={SongExportScreen}
                  options={{ title: 'Dad Band Bass Export Song' }}
                />
                <Stack.Screen
                  name="ExportSetlist"
                  component={SetlistExportScreen}
                  options={{ title: 'Dad Band Bass Export Setlist' }}
                />
                <Stack.Screen
                  name="ImportDetail"
                  component={ImportDetailScreen}
                  options={{ title: 'Dad Band Bass Import Flow' }}
                />
                <Stack.Screen
                  name="ImportPaste"
                  component={ImportPasteScreen}
                  options={{ title: 'Dad Band Bass Paste Tab' }}
                />
              </>
            ) : (
              <>
                <Stack.Screen name="MainTabs" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Welcome" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Home" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Account" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Upgrade" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="SongEditor" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="PerformanceView" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="SetlistPerformance" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ExportSong" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ExportSetlist" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ImportDetail" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ImportPaste" component={ProtectedRedirectScreen} options={{ headerShown: false }} />
              </>
            )}
        </>

        <Stack.Screen
          name="VerifyEmail"
          component={VerifyEmailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ResetPassword"
          component={ResetPasswordScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
