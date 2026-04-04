export interface TabRowAnnotation {
  label: string;
  beforeText: string;
  afterText: string;
}

export interface SongBar {
  cells: Record<string, string[]>;
}

export interface SongRow {
  id: string;
  label: string;
  beforeText: string;
  afterText: string;
  bars: SongBar[];
}

export interface SongChart {
  id: string;
  name?: string;
  tab: string;
  rowAnnotations: TabRowAnnotation[];
  rowBarCounts: number[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  feelNote: string;
  tuning: string;
  updatedAt: string;
  releasedToCommunity?: boolean;
  communityReleasedAt?: string | null;
  stringNames: string[];
  rows: SongRow[];
}

export interface SetlistSong {
  songId: string;
  order: number;
}

export interface Setlist {
  id: string;
  name: string;
  updatedAt: string;
  songIds: string[];
}
