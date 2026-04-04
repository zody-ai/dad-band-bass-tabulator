import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Library: undefined;
  Setlist: undefined;
  Import: undefined;
};

export type RootStackParamList = {
  AuthRestoring: undefined;
  AuthEntry: undefined;
  AuthCallback: { token?: string } | undefined;
  Home: undefined;
  Landing: undefined;
  Welcome: undefined;
  Account: undefined;
  Upgrade: undefined;
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  SongEditor: { songId: string };
  PerformanceView: { songId: string; sectionIndex?: number };
  ExportSong: { songId: string };
  ExportSetlist: undefined;
  ImportDetail: { type: 'image' | 'pdf' };
  ImportPaste: undefined;
};
