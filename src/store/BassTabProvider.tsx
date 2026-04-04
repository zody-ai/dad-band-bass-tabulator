import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createBassTabApiFromEnv, fromPlaylistDto, fromSongDto } from '../api';
import { FREE_SETLIST_TITLE } from '../constants/setlist';
import { tuningOptions } from '../constants/tunings';
import { seededSetlist, seededSongs } from '../data/seed';
import { useSubscription } from '../features/subscription/SubscriptionContext';
import { FREE_PLAN_LIMITS } from '../features/subscription/subscriptionLimits';
import { UpgradeGateError } from '../features/subscription/upgradePrompts';
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
  setlists?: Setlist[];
  activeSetlistId?: string;
}

interface BassTabContextValue {
  songs: Song[];
  setlist: Setlist;
  setlists: Setlist[];
  activeSetlistId: string;
  storageFileUri: string;
  createSong: (input?: SongInput) => Promise<Song>;
  createSetlist: (name?: string) => Setlist;
  setActiveSetlist: (setlistId: string) => void;
  deleteSong: (songId: string) => void;
  updateSong: (songId: string, updates: Partial<Song>) => void;
  updateSongChart: (songId: string, chart: Pick<SongChart, 'tab' | 'rowAnnotations' | 'rowBarCounts'>) => void;
  addSongToSetlist: (songId: string) => void;
  removeSongFromSetlist: (songId: string) => void;
  moveSetlistSong: (songId: string, direction: -1 | 1) => void;
  reorderSetlist: (songIds: string[]) => void;
  saveStateToFile: () => Promise<string>;
  loadStateFromFile: () => Promise<string>;
}

const BassTabContext = createContext<BassTabContextValue | undefined>(undefined);

const storageKeys = {
  songs: 'basstab:songs',
  setlist: 'basstab:setlist',
  setlists: 'basstab:setlists',
  activeSetlistId: 'basstab:active-setlist-id',
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
  name: setlist.name?.trim() || FREE_SETLIST_TITLE,
});

const sanitizeSetlistSongIds = (setlist: Setlist, knownSongIds: Set<string>): Setlist => ({
  ...setlist,
  songIds: setlist.songIds.filter((songId) => knownSongIds.has(songId)),
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
  const rows = legacySections
    .map((section: LegacySection) => {
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
    })
    .flat();

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

const parseSnapshot = (rawSnapshot: string): { songs: Song[]; setlists: Setlist[]; activeSetlistId: string } => {
  const parsed = JSON.parse(rawSnapshot) as Partial<BassTabSnapshot>;

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.songs)) {
    throw new Error('Snapshot is not a valid BassTab JSON file.');
  }

  const songs = parsed.songs.map(migrateLegacySong);
  const knownSongIds = new Set(songs.map((song) => song.id));

  const parsedSetlists = Array.isArray(parsed.setlists)
    ? parsed.setlists.filter(isSetlist)
    : parsed.setlist && isSetlist(parsed.setlist)
      ? [parsed.setlist]
      : [];

  if (parsedSetlists.length === 0) {
    throw new Error('Snapshot is missing setlist data.');
  }

  const setlists = parsedSetlists
    .map((setlist) => normalizeSetlist(sanitizeSetlistSongIds(setlist, knownSongIds)));

  const activeSetlistId =
    parsed.activeSetlistId && setlists.some((setlist) => setlist.id === parsed.activeSetlistId)
      ? parsed.activeSetlistId
      : setlists[0].id;

  return {
    songs,
    setlists,
    activeSetlistId,
  };
};

export function BassTabProvider({ children }: PropsWithChildren) {
  const [songs, setSongs] = useState<Song[]>(seededSongs);
  const [setlists, setSetlists] = useState<Setlist[]>([normalizeSetlist(seededSetlist)]);
  const [activeSetlistId, setActiveSetlistId] = useState(seededSetlist.id);
  const [hasHydrated, setHasHydrated] = useState(false);
  const { tier, capabilities } = useSubscription();
  const backendBaseUrl = process.env.EXPO_PUBLIC_BASSTAB_API_URL?.trim();
  const backendApi = useMemo(() => createBassTabApiFromEnv(), []);
  const backendStorageLabel = 'BassTab backend';

  const setlist = useMemo(
    () => setlists.find((item) => item.id === activeSetlistId) ?? setlists[0] ?? normalizeSetlist(seededSetlist),
    [activeSetlistId, setlists],
  );

  useEffect(() => {
    if (setlists.length > 0 && !setlists.some((item) => item.id === activeSetlistId)) {
      setActiveSetlistId(setlists[0].id);
    }
  }, [activeSetlistId, setlists]);

  const hydrateFromBackend = async () => {
    if (!backendApi) {
      throw new Error('BassTab backend is not configured.');
    }

    const [songsMetadata, playlistDto] = await Promise.all([
      backendApi.listSongs(),
      backendApi.getPlaylist(),
    ]);
    const songDtos = await Promise.all(
      songsMetadata.map((songMetadata) => backendApi.getSong(songMetadata.id)),
    );
    const nextSongs = songDtos.map(fromSongDto);
    const knownSongIds = new Set(nextSongs.map((song) => song.id));
    const playlist = fromPlaylistDto(playlistDto);
    const normalizedPlaylist = normalizeSetlist(sanitizeSetlistSongIds(playlist, knownSongIds));

    setSongs(nextSongs);
    setSetlists([normalizedPlaylist]);
    setActiveSetlistId(normalizedPlaylist.id);
  };

  useEffect(() => {
    if (backendApi) {
      console.info(`[BassTab] backend mode enabled: ${backendBaseUrl}`);

      if (backendBaseUrl && /localhost|127\.0\.0\.1/.test(backendBaseUrl)) {
        console.warn(
          '[BassTab] backend URL uses localhost/127.0.0.1. On real devices this points to the device itself.',
        );
      }
    } else {
      console.warn('[BassTab] backend mode disabled. EXPO_PUBLIC_BASSTAB_API_URL is not set.');
    }
  }, [backendApi, backendBaseUrl]);

  useEffect(() => {
    let isMounted = true;

    const hydrateFromStorage = async () => {
      try {
        const [storedSongs, storedSetlists, storedLegacySetlist, storedActiveSetlistId] = await Promise.all([
          AsyncStorage.getItem(storageKeys.songs),
          AsyncStorage.getItem(storageKeys.setlists),
          AsyncStorage.getItem(storageKeys.setlist),
          AsyncStorage.getItem(storageKeys.activeSetlistId),
        ]);

        const parsedSongs = storedSongs ? (JSON.parse(storedSongs) as Array<Song | LegacySong>) : null;
        const nextSongs = parsedSongs && Array.isArray(parsedSongs)
          ? parsedSongs.map(migrateLegacySong)
          : seededSongs;
        const knownSongIds = new Set(nextSongs.map((song) => song.id));

        const parsedSetlists = storedSetlists
          ? (JSON.parse(storedSetlists) as unknown[])
          : null;
        const parsedLegacySetlist = storedLegacySetlist
          ? (JSON.parse(storedLegacySetlist) as unknown)
          : null;

        const nextSetlists = Array.isArray(parsedSetlists) && parsedSetlists.every(isSetlist)
          ? parsedSetlists
          : parsedLegacySetlist && isSetlist(parsedLegacySetlist)
            ? [parsedLegacySetlist]
            : [seededSetlist];

        if (!isMounted) {
          return;
        }

        setSongs(nextSongs);

        const normalizedSetlists = nextSetlists.map((storedSetlist) =>
          normalizeSetlist(sanitizeSetlistSongIds(storedSetlist, knownSongIds)));

        setSetlists(normalizedSetlists);

        if (
          storedActiveSetlistId &&
          normalizedSetlists.some((storedSetlist) => storedSetlist.id === storedActiveSetlistId)
        ) {
          setActiveSetlistId(storedActiveSetlistId);
        } else {
          setActiveSetlistId(normalizedSetlists[0].id);
        }
      } catch (error) {
        console.warn('BassTab storage hydrate failed', error);
      }
    };

    const hydrate = async () => {
      try {
        if (backendApi) {
          await hydrateFromBackend();
        } else {
          await hydrateFromStorage();
        }
      } catch (error) {
        console.warn('BassTab backend hydrate failed', error);
        await hydrateFromStorage();
      } finally {
        if (isMounted) {
          setHasHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, [backendApi]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const persist = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(storageKeys.songs, JSON.stringify(songs)),
          AsyncStorage.setItem(storageKeys.setlists, JSON.stringify(setlists)),
          AsyncStorage.setItem(storageKeys.activeSetlistId, activeSetlistId),
          AsyncStorage.setItem(storageKeys.setlist, JSON.stringify(setlist)),
        ]);
      } catch (error) {
        console.warn('BassTab storage persist failed', error);
      }
    };

    void persist();
  }, [activeSetlistId, hasHydrated, setlist, setlists, songs]);

  const createSong = async (input?: SongInput): Promise<Song> => {
    const maxSongs = capabilities.maxSongs ?? FREE_PLAN_LIMITS.songs;

    if (!backendApi && tier === 'FREE' && songs.length >= maxSongs) {
      throw new UpgradeGateError(
        'SONG_LIMIT',
        'You’ve reached 10 songs. Upgrade to keep building your library.',
      );
    }

    const draftSong: Song = {
      id: createId('song'),
      title: input?.title ?? 'Untitled Song',
      artist: input?.artist ?? 'Unknown Artist',
      key: input?.key ?? 'E',
      feelNote: input?.feelNote ?? 'Mid-tempo pocket',
      tuning: input?.tuning ?? tuningOptions[0],
      updatedAt: new Date().toISOString(),
      stringNames: ['G', 'D', 'A', 'E'],
      rows: [createEmptyRow('Intro')],
    };

    if (!backendApi) {
      setSongs((current) => [draftSong, ...current]);
      return draftSong;
    }

    const createdSong = fromSongDto(
      await backendApi.createSong({
        title: draftSong.title,
        artist: draftSong.artist,
        key: draftSong.key,
        feelNote: draftSong.feelNote,
        tuning: draftSong.tuning,
        chart: {
          stringNames: draftSong.stringNames,
          rows: draftSong.rows,
        },
      }),
    );

    setSongs((current) => [createdSong, ...current.filter((song) => song.id !== createdSong.id)]);

    return createdSong;
  };

  const createSetlist = (name?: string): Setlist => {
    const maxSetlists = capabilities.maxSetlists ?? FREE_PLAN_LIMITS.setlists;

    if (!backendApi && tier === 'FREE' && setlists.length >= maxSetlists) {
      throw new UpgradeGateError(
        'SETLIST_LIMIT',
        'Upgrade to create unlimited setlists for gigs and rehearsals.',
      );
    }

    const label = name?.trim();
    const nextSetlist: Setlist = {
      id: createId('setlist'),
      name: label && label.length > 0 ? label : `Setlist ${setlists.length + 1}`,
      songIds: [],
      updatedAt: new Date().toISOString(),
    };

    setSetlists((current) => [...current, nextSetlist]);
    setActiveSetlistId(nextSetlist.id);

    return nextSetlist;
  };

  const setActiveSetlist = (setlistId: string) => {
    if (!setlists.some((item) => item.id === setlistId)) {
      return;
    }

    setActiveSetlistId(setlistId);
  };

  const deleteSong = (songId: string) => {
    let nextActiveSongIds: string[] = [];

    setSongs((current) => current.filter((song) => song.id !== songId));
    setSetlists((current) =>
      current.map((currentSetlist) => {
        const nextSongIds = currentSetlist.songIds.filter((id) => id !== songId);

        if (currentSetlist.id === activeSetlistId) {
          nextActiveSongIds = nextSongIds;
        }

        return {
          ...currentSetlist,
          songIds: nextSongIds,
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    if (!backendApi) {
      return;
    }

    void (async () => {
      try {
        await backendApi.deleteSong(songId);
        await backendApi.replacePlaylistOrder({ songIds: nextActiveSongIds });
      } catch (error) {
        console.warn('BassTab backend deleteSong failed', error);
      }
    })();
  };

  const updateSong = (songId: string, updates: Partial<Song>) => {
    const syncState = { nextSongForSync: null as Song | null };

    setSongs((current) =>
      current.map((song) =>
        song.id === songId
          ? (() => {
            const nextSong = updateTimestamp({ ...song, ...updates });
            syncState.nextSongForSync = nextSong;
            return nextSong;
          })()
          : song,
      ),
    );

    const nextSongForSync = syncState.nextSongForSync;

    if (!nextSongForSync || !backendApi) {
      return;
    }

    const metadataPayload = {
      ...(updates.title !== undefined ? { title: updates.title } : {}),
      ...(updates.artist !== undefined ? { artist: updates.artist } : {}),
      ...(updates.key !== undefined ? { key: updates.key } : {}),
      ...(updates.feelNote !== undefined ? { feelNote: updates.feelNote } : {}),
      ...(updates.tuning !== undefined ? { tuning: updates.tuning } : {}),
    };
    const hasMetadataUpdate = Object.keys(metadataPayload).length > 0;
    const hasChartUpdate = updates.stringNames !== undefined || updates.rows !== undefined;

    void (async () => {
      try {
        if (hasMetadataUpdate) {
          await backendApi.updateSongMetadata(songId, metadataPayload);
        }

        if (hasChartUpdate) {
          await backendApi.replaceSongChart(songId, {
            chart: {
              stringNames: nextSongForSync.stringNames,
              rows: nextSongForSync.rows,
            },
          });
        }
      } catch (error) {
        console.warn('BassTab backend updateSong failed', error);
      }
    })();
  };

  const updateSongChart = (
    songId: string,
    chart: Pick<SongChart, 'tab' | 'rowAnnotations' | 'rowBarCounts'>,
  ) => {
    const syncState = { nextSongForSync: null as Song | null };

    setSongs((current) =>
      current.map((song) => {
        if (song.id !== songId) {
          return song;
        }

        const nextSongShape = mergeChartIntoSongRows(song, chart);
        const nextSong = updateTimestamp({
          ...song,
          ...nextSongShape,
        });
        syncState.nextSongForSync = nextSong;
        return nextSong;
      }),
    );

    const nextSongForSync = syncState.nextSongForSync;

    if (!nextSongForSync || !backendApi) {
      return;
    }

    void backendApi
      .replaceSongChart(songId, {
        chart: {
          stringNames: nextSongForSync.stringNames,
          rows: nextSongForSync.rows,
        },
      })
      .catch((error) => {
        console.warn('BassTab backend updateSongChart failed', error);
      });
  };

  const syncSetlistOrder = (songIds: string[], action: string, targetSetlistId = activeSetlistId) => {
    const availableSongIds = new Set(songs.map((song) => song.id));
    const uniqueSongIds: string[] = [];

    for (const songId of songIds) {
      if (!availableSongIds.has(songId) || uniqueSongIds.includes(songId)) {
        continue;
      }

      uniqueSongIds.push(songId);
    }

    setSetlists((current) =>
      current.map((currentSetlist) =>
        currentSetlist.id === targetSetlistId
          ? {
            ...currentSetlist,
            songIds: uniqueSongIds,
            updatedAt: new Date().toISOString(),
          }
          : currentSetlist,
      ),
    );

    if (!backendApi || targetSetlistId !== activeSetlistId) {
      return;
    }

    void backendApi
      .replacePlaylistOrder({ songIds: uniqueSongIds })
      .then((playlistDto) => {
        const playlist = normalizeSetlist(fromPlaylistDto(playlistDto));

        setSetlists((current) =>
          current.map((currentSetlist) =>
            currentSetlist.id === activeSetlistId ? playlist : currentSetlist,
          ),
        );
      })
      .catch((error) => {
        console.warn(`BassTab backend ${action} failed`, error);
      });
  };

  const reorderSetlist = (songIds: string[]) => {
    syncSetlistOrder(songIds, 'reorderSetlist');
  };

  const addSongToSetlist = (songId: string) => {
    if (setlist.songIds.includes(songId)) {
      return;
    }

    syncSetlistOrder([...setlist.songIds, songId], 'addSongToSetlist');
  };

  const removeSongFromSetlist = (songId: string) => {
    if (!setlist.songIds.includes(songId)) {
      return;
    }

    syncSetlistOrder(
      setlist.songIds.filter((existingSongId) => existingSongId !== songId),
      'removeSongFromSetlist',
    );
  };

  const moveSetlistSong = (songId: string, direction: -1 | 1) => {
    const currentIndex = setlist.songIds.findIndex((existingSongId) => existingSongId === songId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= setlist.songIds.length) {
      return;
    }

    const nextSongIds = [...setlist.songIds];
    const [movedSongId] = nextSongIds.splice(currentIndex, 1);
    nextSongIds.splice(nextIndex, 0, movedSongId);

    syncSetlistOrder(nextSongIds, 'moveSetlistSong');
  };

  const saveStateToFile = async () => {
    if (backendApi) {
      const remoteSongs = await backendApi.listSongs();
      const remoteSongIds = new Set(remoteSongs.map((song) => song.id));
      const createdByLocalId = new Map<string, Song>();

      for (const song of songs) {
        if (remoteSongIds.has(song.id)) {
          await backendApi.updateSongMetadata(song.id, {
            title: song.title,
            artist: song.artist,
            key: song.key,
            feelNote: song.feelNote,
            tuning: song.tuning,
          });
          await backendApi.replaceSongChart(song.id, {
            chart: {
              stringNames: song.stringNames,
              rows: song.rows,
            },
          });
          continue;
        }

        const createdSong = fromSongDto(
          await backendApi.createSong({
            title: song.title,
            artist: song.artist,
            key: song.key,
            feelNote: song.feelNote,
            tuning: song.tuning,
            chart: {
              stringNames: song.stringNames,
              rows: song.rows,
            },
          }),
        );
        createdByLocalId.set(song.id, createdSong);
      }

      const mapSongId = (songId: string) => createdByLocalId.get(songId)?.id ?? songId;
      const nextSongs = songs.map((song) => createdByLocalId.get(song.id) ?? song);
      const nextSetlists = setlists.map((currentSetlist) => ({
        ...currentSetlist,
        songIds: currentSetlist.songIds.map(mapSongId),
        updatedAt: new Date().toISOString(),
      }));
      const activeSetlistForSync =
        nextSetlists.find((currentSetlist) => currentSetlist.id === activeSetlistId) ??
        nextSetlists[0] ??
        normalizeSetlist(seededSetlist);

      await backendApi.replacePlaylistOrder({ songIds: activeSetlistForSync.songIds });

      if (createdByLocalId.size > 0) {
        setSongs(nextSongs);
        setSetlists(nextSetlists);
      }

      return backendStorageLabel;
    }

    const snapshot: BassTabSnapshot = {
      version: 1,
      exportedAt: new Date().toISOString(),
      songs,
      setlist,
      setlists,
      activeSetlistId,
    };

    return saveSnapshotFile(snapshot);
  };

  const loadStateFromFile = async () => {
    if (backendApi) {
      await hydrateFromBackend();
      return backendStorageLabel;
    }

    const nextState = parseSnapshot(await loadSnapshotFile());

    setSongs(nextState.songs);
    setSetlists(nextState.setlists);
    setActiveSetlistId(nextState.activeSetlistId);

    return stateStorageLabel;
  };

  const value = useMemo(
    () => ({
      songs,
      setlist,
      setlists,
      activeSetlistId,
      storageFileUri: stateStorageLabel,
      createSong,
      createSetlist,
      setActiveSetlist,
      deleteSong,
      updateSong,
      updateSongChart,
      addSongToSetlist,
      removeSongFromSetlist,
      moveSetlistSong,
      reorderSetlist,
      saveStateToFile,
      loadStateFromFile,
    }),
    [activeSetlistId, setlist, setlists, songs],
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
