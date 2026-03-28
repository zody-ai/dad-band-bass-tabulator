import { FREE_SETLIST_TITLE } from '../constants/setlist';
import { Setlist, Song, SongRow } from '../types/models';
import { parseTab } from '../utils/tabLayout';

const buildRow = (id: string, label: string, tab: string): SongRow => ({
  id,
  label,
  beforeText: '',
  afterText: '',
  bars: parseTab(tab).bars,
});

export const seededSongs: Song[] = [
  {
    id: 'song-midnight-train',
    title: 'Midnight Train',
    artist: 'Northline',
    key: 'A',
    feelNote: 'Mid-tempo pocket',
    tuning: 'Standard (E A D G)',
    updatedAt: '2026-03-26T18:30:00.000Z',
    stringNames: ['G', 'D', 'A', 'E'],
    rows: [
      buildRow(
        'row-midnight-intro',
        'Intro',
        'G|----------------|\nD|----------------|\nA|--5-5---5/7--7--|\nE|0-----0---------|',
      ),
      buildRow(
        'row-midnight-verse',
        'Verse',
        'G|----------------|\nD|----------------|\nA|7-7-7-7--5-5-5-5|\nE|----------------|',
      ),
      buildRow(
        'row-midnight-chorus',
        'Chorus',
        'G|----------------|\nD|----------------|\nA|7---7---9---5---|\nE|0---0---0---0---|',
      ),
    ],
  },
  {
    id: 'song-dockside',
    title: 'Dockside Lights',
    artist: 'The Harbors',
    key: 'E',
    feelNote: 'Driving with space',
    tuning: 'Drop D (D A D G)',
    updatedAt: '2026-03-24T08:15:00.000Z',
    stringNames: ['G', 'D', 'A', 'D'],
    rows: [
      buildRow(
        'row-dockside-intro',
        'Intro',
        'G|----------------|\nD|----------------|\nA|----------------|\nD|0-0-3-5---------|',
      ),
      buildRow(
        'row-dockside-verse',
        'Verse',
        'G|----------------|\nD|----------------|\nA|2---2---5---5---|\nD|0---0---3---3---|',
      ),
      buildRow(
        'row-dockside-bridge',
        'Bridge',
        'G|----------------|\nD|7---7---9---9---|\nA|----------------|\nD|----------------|',
      ),
    ],
  },
  {
    id: 'song-glass-river',
    title: 'Glass River',
    artist: 'Ivy Arcade',
    key: 'D',
    feelNote: 'Laid back ballad',
    tuning: 'Standard (E A D G)',
    updatedAt: '2026-03-20T21:05:00.000Z',
    stringNames: ['G', 'D', 'A', 'E'],
    rows: [
      buildRow(
        'row-glass-verse',
        'Verse',
        'G|----------------|\nD|--------7-------|\nA|5---5-------5---|\nE|----------------|',
      ),
      buildRow(
        'row-glass-chorus',
        'Chorus',
        'G|----------------|\nD|7---7---9---7---|\nA|5---5---7---5---|\nE|----------------|',
      ),
      buildRow(
        'row-glass-outro',
        'Outro',
        'G|----------------|\nD|----------------|\nA|5---5-----------|\nE|----3---1---0---|',
      ),
    ],
  },
];

export const seededSetlist: Setlist = {
  id: 'setlist-main',
  name: FREE_SETLIST_TITLE,
  updatedAt: '2026-03-26T19:00:00.000Z',
  songIds: ['song-midnight-train', 'song-dockside', 'song-glass-river'],
};
