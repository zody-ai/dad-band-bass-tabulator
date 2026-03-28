import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Library: undefined;
  Setlist: undefined;
  Import: undefined;
};

export type RootStackParamList = {
  Landing: undefined;
  Welcome: undefined;
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  SongEditor: { songId: string };
  PerformanceView: { songId: string; sectionIndex?: number };
  ExportSong: { songId: string };
  ExportSetlist: undefined;
  ImportDetail: { type: 'image' | 'pdf' };
  ImportPaste: undefined;
};
