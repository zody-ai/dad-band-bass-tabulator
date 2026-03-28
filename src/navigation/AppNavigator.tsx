import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { ImportDetailScreen } from '../screens/ImportDetailScreen';
import { ImportPasteScreen } from '../screens/ImportPasteScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { LandingScreen } from '../screens/LandingScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { LiveViewScreen } from '../screens/LiveViewScreen';
import { SetlistExportScreen } from '../screens/SetlistExportScreen';
import { SongExportScreen } from '../screens/SongExportScreen';
import { SetlistScreen } from '../screens/SetlistScreen';
import { SongEditorScreen } from '../screens/SongEditorScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="download-outline" color={color} size={size} />
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

export function AppNavigator() {
  return (
    <NavigationContainer theme={defaultTheme}>
      <Stack.Navigator
        initialRouteName={Platform.OS === 'web' ? 'Landing' : 'MainTabs'}
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
        <Stack.Screen
          name="Landing"
          component={LandingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ title: 'Dad Band Bass About' }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SongEditor"
          component={SongEditorScreen}
          options={{ title: 'Dad Band Bass Edit Song' }}
        />
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
