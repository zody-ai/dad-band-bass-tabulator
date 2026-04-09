import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Library: undefined;
  Setlist: undefined;
  Import: undefined;
  AICreate: undefined;
};

export type RootStackParamList = {
  AuthRestoring: undefined;
  AuthEntry: undefined;
  VerifyEmail: { token?: string } | undefined;
  ResetPassword: { token?: string } | undefined;
  Home: undefined;
  Landing: undefined;
  Welcome: undefined;
  Account: undefined;
  Upgrade: undefined;
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  SongEditor: { songId: string; isNew?: boolean };
  PerformanceView: { songId: string; sectionIndex?: number };
  SetlistPerformance: { setlistId?: string; startSongId?: string } | undefined;
  ExportSong: { songId: string };
  ExportSetlist: undefined;
  ImportDetail: { type: 'image' | 'pdf' };
  ImportPaste: undefined;
};
