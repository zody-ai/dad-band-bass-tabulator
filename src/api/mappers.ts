import { Setlist, Song } from '../types/models';
import { PlaylistDto, SongChartDto, SongDto, SongMetadataDto } from './contracts';

export const toSongMetadataDto = (song: Song): SongMetadataDto => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  key: song.key,
  feelNote: song.feelNote,
  tuning: song.tuning,
  updatedAt: song.updatedAt,
  releasedToCommunity: song.releasedToCommunity,
  communityReleasedAt: song.communityReleasedAt,
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
  feelNote: dto.feelNote,
  tuning: dto.tuning,
  updatedAt: dto.updatedAt,
  releasedToCommunity: dto.releasedToCommunity ?? false,
  communityReleasedAt: dto.communityReleasedAt ?? null,
  stringNames: dto.chart.stringNames,
  rows: dto.chart.rows,
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
