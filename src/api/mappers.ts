import { Setlist, Song } from '../types/models';
import { PlaylistDto, SongChartDto, SongDto, SongMetadataDto } from './contracts';

export const toSongMetadataDto = (song: Song): SongMetadataDto => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  key: song.key,
  tuning: song.tuning,
  updatedAt: song.updatedAt,
  stringCount: song.stringCount,
  importedPublishedSongId: song.importedPublishedSongId ?? null,
});

export const toSongChartDto = (song: Song): SongChartDto => ({
  stringNames: song.stringNames,
  rows: song.rows,
});

export const toSongDto = (song: Song): SongDto => ({
  ...toSongMetadataDto(song),
  chart: toSongChartDto(song),
});

export const fromSongDto = (dto: SongDto): Song => ({
  id: dto.id,
  title: dto.title,
  artist: dto.artist,
  key: dto.key,
  tuning: dto.tuning,
  updatedAt: dto.updatedAt,
  stringCount: dto.stringCount,
  stringNames: dto.chart.stringNames,
  rows: dto.chart.rows,
  importedPublishedSongId: dto.importedPublishedSongId ?? null,
});

export const toPlaylistDto = (setlist: Setlist): PlaylistDto => ({
  id: setlist.id,
  name: setlist.name,
  updatedAt: setlist.updatedAt,
  songIds: setlist.songIds,
});

export const fromPlaylistDto = (dto: PlaylistDto): Setlist => ({
  id: dto.id,
  name: dto.name,
  updatedAt: dto.updatedAt,
  songIds: dto.songIds,
});
