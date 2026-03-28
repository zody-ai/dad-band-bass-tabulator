import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FREE_SETLIST_TITLE } from '../constants/setlist';
import { tuningOptions } from '../constants/tunings';
import { seededSetlist, seededSongs } from '../data/seed';
import { Song, SongChart, SongRow, Setlist } from '../types/models';
import { createId } from '../utils/ids';
import { loadSnapshotFile, saveSnapshotFile, stateStorageLabel } from '../utils/stateSnapshot';
import { mergeChartIntoSongRows } from '../utils/songChart';
import { parseTab } from '../utils/tabLayout';

interface SongInput {
  title?: string;
  artist?: string;
  key?: string;
  feelNote?: string;
  tuning?: string;
}

interface LegacySection {
  id: string;
  name: string;
  notes?: string;
  tab: string;
  rowAnnotations?: Array<{
    label: string;
    beforeText: string;
    afterText: string;
  }>;
  rowBarCounts?: number[];
}

interface LegacySong {
  id: string;
  title: string;
  artist: string;
  key: string;
  feelNote: string;
  tuning: string;
  updatedAt: string;
  sections?: LegacySection[];
}

interface BassTabSnapshot {
  version: 1;
  exportedAt: string;
  songs: Array<Song | LegacySong>;
  setlist: Setlist;
}

interface BassTabContextValue {
  songs: Song[];
  setlist: Setlist;
  storageFileUri: string;
  createSong: (input?: SongInput) => Song;
  deleteSong: (songId: string) => void;
  updateSong: (songId: string, updates: Partial<Song>) => void;
  updateSongChart: (songId: string, chart: Pick<SongChart, 'tab' | 'rowAnnotations' | 'rowBarCounts'>) => void;
  reorderSetlist: (songIds: string[]) => void;
  saveStateToFile: () => Promise<string>;
  loadStateFromFile: () => Promise<string>;
}

const BassTabContext = createContext<BassTabContextValue | undefined>(undefined);

const storageKeys = {
  songs: 'basstab:songs',
  setlist: 'basstab:setlist',
};

const createEmptyRow = (label = 'Intro'): SongRow => ({
  id: createId('row'),
  label,
  beforeText: '',
  afterText: '',
  bars: Array.from({ length: 4 }, () => ({
    cells: {
      G: Array.from({ length: 8 }, () => '-'),
      D: Array.from({ length: 8 }, () => '-'),
      A: Array.from({ length: 8 }, () => '-'),
      E: Array.from({ length: 8 }, () => '-'),
    },
  })),
});

const updateTimestamp = (song: Song): Song => ({
  ...song,
  updatedAt: new Date().toISOString(),
});

const isSetlist = (value: unknown): value is Setlist => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Setlist>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    Array.isArray(candidate.songIds) &&
    candidate.songIds.every((songId) => typeof songId === 'string')
  );
};

const normalizeSetlist = (setlist: Setlist): Setlist => ({
  ...setlist,
  name: FREE_SETLIST_TITLE,
});

const migrateLegacySong = (legacySong: Song | LegacySong): Song => {
  if ('rows' in legacySong && Array.isArray(legacySong.rows)) {
    return legacySong as Song;
  }

  const legacySections = (legacySong as LegacySong).sections ?? [];

  if (legacySections.length === 0) {
    return {
      id: legacySong.id,
      title: legacySong.title,
      artist: legacySong.artist,
      key: legacySong.key,
      feelNote: legacySong.feelNote,
      tuning: legacySong.tuning,
      updatedAt: legacySong.updatedAt,
      stringNames: ['G', 'D', 'A', 'E'],
      rows: [createEmptyRow()],
    };
  }

  const stringNames = parseTab(legacySections[0].tab).stringNames;
  const rows = legacySections.map((section: LegacySection) => {
    const chart = mergeChartIntoSongRows(
      { stringNames, rows: [] },
      {
        tab: section.tab,
        rowAnnotations:
          section.rowAnnotations?.map((annotation, rowIndex: number) =>
            rowIndex === 0
              ? { ...annotation, label: annotation.label || section.name }
              : annotation,
          ) ?? [{ label: section.name, beforeText: '', afterText: '' }],
        rowBarCounts: section.rowBarCounts ?? [],
      },
    );

    return chart.rows.map((row, index) => ({
      ...row,
      id: index === 0 ? section.id : createId('row'),
    }));
  }).flat();

  return {
    id: legacySong.id,
    title: legacySong.title,
    artist: legacySong.artist,
    key: legacySong.key,
    feelNote: legacySong.feelNote,
    tuning: legacySong.tuning,
    updatedAt: legacySong.updatedAt,
    stringNames,
    rows,
  };
};

const parseSnapshot = (rawSnapshot: string): { songs: Song[]; setlist: Setlist } => {
  const parsed = JSON.parse(rawSnapshot) as Partial<BassTabSnapshot>;

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.songs) || !isSetlist(parsed.setlist)) {
    throw new Error('Snapshot is not a valid BassTab JSON file.');
  }

  const songs = parsed.songs.map(migrateLegacySong);
  const knownSongIds = new Set(songs.map((song) => song.id));

  return {
    songs,
    setlist: normalizeSetlist({
      ...parsed.setlist,
      songIds: parsed.setlist.songIds.filter((songId) => knownSongIds.has(songId)),
    }),
  };
};

export function BassTabProvider({ children }: PropsWithChildren) {
  const [songs, setSongs] = useState<Song[]>(seededSongs);
  const [setlist, setSetlist] = useState<Setlist>(seededSetlist);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // AsyncStorage is currently just the app-local persistence layer.
    // It preserves data across reloads/restarts, but it is not a sync engine or
    // the long-term source of truth once a backend exists.
    let isMounted = true;

    const hydrate = async () => {
      try {
        const [storedSongs, storedSetlist] = await Promise.all([
          AsyncStorage.getItem(storageKeys.songs),
          AsyncStorage.getItem(storageKeys.setlist),
        ]);

        const parsedSongs = storedSongs ? (JSON.parse(storedSongs) as Array<Song | LegacySong>) : null;
        const parsedSetlist = storedSetlist ? (JSON.parse(storedSetlist) as Setlist) : null;

        if (!isMounted) {
          return;
        }

        if (parsedSongs && Array.isArray(parsedSongs)) {
          setSongs(parsedSongs.map(migrateLegacySong));
        }

        if (parsedSetlist) {
          setSetlist(normalizeSetlist(parsedSetlist));
        }
      } catch (error) {
        console.warn('BassTab storage hydrate failed', error);
      } finally {
        if (isMounted) {
          setHasHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const persist = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(storageKeys.songs, JSON.stringify(songs)),
          AsyncStorage.setItem(storageKeys.setlist, JSON.stringify(setlist)),
        ]);
      } catch (error) {
        console.warn('BassTab storage persist failed', error);
      }
    };

    persist();
  }, [hasHydrated, setlist, songs]);

  const createSong = (input?: SongInput) => {
    const newSong: Song = {
      id: createId('song'),
      title: input?.title ?? 'Untitled Song',
      artist: input?.artist ?? 'Unknown Artist',
      key: input?.key ?? 'C',
      feelNote: input?.feelNote ?? 'Mid-tempo pocket',
      tuning: input?.tuning ?? tuningOptions[0],
      updatedAt: new Date().toISOString(),
      stringNames: ['G', 'D', 'A', 'E'],
      rows: [createEmptyRow('Intro')],
    };

    setSongs((current) => [newSong, ...current]);

    return newSong;
  };

  const deleteSong = (songId: string) => {
    setSongs((current) => current.filter((song) => song.id !== songId));
    setSetlist((current) => ({
      ...current,
      name: FREE_SETLIST_TITLE,
      songIds: current.songIds.filter((id) => id !== songId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateSong = (songId: string, updates: Partial<Song>) => {
    setSongs((current) =>
      current.map((song) =>
        song.id === songId ? updateTimestamp({ ...song, ...updates }) : song,
      ),
    );
  };

  const updateSongChart = (
    songId: string,
    chart: Pick<SongChart, 'tab' | 'rowAnnotations' | 'rowBarCounts'>,
  ) => {
    setSongs((current) =>
      current.map((song) => {
        if (song.id !== songId) {
          return song;
        }

        const nextSongShape = mergeChartIntoSongRows(song, chart);
        return updateTimestamp({
          ...song,
          ...nextSongShape,
        });
      }),
    );
  };

  const reorderSetlist = (songIds: string[]) => {
    setSetlist((current) => ({
      ...current,
      name: FREE_SETLIST_TITLE,
      songIds,
      updatedAt: new Date().toISOString(),
    }));
  };

  const saveStateToFile = async () => {
    const snapshot: BassTabSnapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      songs,
      setlist,
    };

    return saveSnapshotFile(snapshot);
  };

  const loadStateFromFile = async () => {
    const nextState = parseSnapshot(await loadSnapshotFile());

    setSongs(nextState.songs);
    setSetlist(normalizeSetlist(nextState.setlist));

    return stateStorageLabel;
  };

  const value = useMemo(
    () => ({
      songs,
      setlist,
      storageFileUri: stateStorageLabel,
      createSong,
      deleteSong,
      updateSong,
      updateSongChart,
      reorderSetlist,
      saveStateToFile,
      loadStateFromFile,
    }),
    [setlist, songs],
  );

  return (
    <BassTabContext.Provider value={value}>{children}</BassTabContext.Provider>
  );
}

export const useBassTab = () => {
  const context = useContext(BassTabContext);

  if (!context) {
    throw new Error('useBassTab must be used within a BassTabProvider');
  }

  return context;
};
