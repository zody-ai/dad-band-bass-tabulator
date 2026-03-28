export type RootStackParamList = {
  Landing: undefined;
  Welcome: undefined;
  MainTabs: undefined;
  SongEditor: { songId: string };
  PerformanceView: { songId: string; sectionIndex?: number };
  ExportSong: { songId: string };
  ExportSetlist: undefined;
  ImportDetail: { type: 'image' | 'pdf' };
  ImportPaste: undefined;
};

export type TabParamList = {
  Library: undefined;
  Setlist: undefined;
  Import: undefined;
};
