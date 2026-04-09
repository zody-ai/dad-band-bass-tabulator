export interface TabRowAnnotation {
  label: string;
  beforeText: string;
  afterText: string;
  barNotes: string[];
}

export interface SongBar {
  cells: Record<string, string[]>;
  note?: string;
  beatCount?: number;
}

export interface SongRow {
  id: string;
  label: string;
  beforeText: string;
  afterText: string;
  defaultBeatCount?: number;
  bars: SongBar[];
}

export interface SongChart {
  id: string;
  name?: string;
  tab: string;
  rowAnnotations: TabRowAnnotation[];
  rowBarCounts: number[];
  defaultBeatCount?: number;
}

export type PublishedSongStatus = 'PUBLISHED' | 'UNLISTED' | 'MODERATION_HIDDEN';
export type OwnershipStatus = 'ACTIVE' | 'ORPHANED';

export type CommunitySongAuthor = {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};

export type CommunitySongVoteDirection = 'UP' | 'DOWN';

export type CommunitySongVotes = {
  upVotes: number;
  downVotes: number;
  currentUserVote: CommunitySongVoteDirection | null;
};

export type CommunitySongCard = {
  id: string;
  publishedSongId?: string | null;
  sourceSongId?: string | null;
  title: string;
  artist: string;
  key?: string | null;
  tuning?: string | null;
  author?: CommunitySongAuthor;
  votes: CommunitySongVotes;
  publishedAt: string;
  updatedAt: string;
  stringCount?: number | null;
  version?: number | null;
  ownershipStatus?: OwnershipStatus | null;
};

export type CommunitySongDetail = CommunitySongCard & {
  chart: SongChart;
  status?: PublishedSongStatus;
  sourceSongId?: string;
};

export interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  tuning: string;
  updatedAt: string;
  stringNames: string[];
  stringCount: number;
  rows: SongRow[];
  importedPublishedSongId?: string | null;
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
