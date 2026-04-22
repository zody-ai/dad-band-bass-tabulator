import { Setlist, Song, SongBar, SongBarEvent, SongRow } from '../types/models';
import { createId } from '../utils/ids';
import { isInstructionBar, normalizeBarForEditor } from '../utils/songBars';
import {
  PlaylistDto,
  SongChartBarDto,
  SongChartCellDto,
  SongChartDto,
  SongChartEventDto,
  SongChartInstructionDto,
  SongChartRowDto,
  SongDto,
  SongMetadataDto,
} from './contracts';

const EMPTY_SEGMENT = '--';
const LEGACY_INSTRUCTION_NOTE_PREFIX = '[[BTI1]]';

type LegacyInstructionPayload = {
  text: string;
  note?: string;
};

const toNullableText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSegment = (value: string | undefined): string => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : EMPTY_SEGMENT;
};

const normalizeSegmentsToPulseLength = (segments: string[], pulseCount: number): string[] => {
  const next = segments.slice(0, pulseCount).map((segment) => normalizeSegment(segment));

  while (next.length < pulseCount) {
    next.push(EMPTY_SEGMENT);
  }

  return next;
};

const getEventPulseCount = (event: SongBarEvent): number =>
  Math.max(
    1,
    event.pulseLabels.length,
    ...Object.values(event.cells).map((eventCells) => eventCells?.[0]?.segments.length ?? 0),
  );

const buildLegacyCellsFromEvents = (
  stringNames: string[],
  events: SongChartEventDto[],
): Record<string, string[]> => {
  const cells: Record<string, string[]> = Object.fromEntries(
    stringNames.map((stringName) => [stringName, []]),
  );

  for (const event of events) {
    const pulseCount = Math.max(1, event.pulseLabels.length);
    for (const stringName of stringNames) {
      const sourceSegments = event.cells[stringName]?.[0]?.segments ?? [];
      for (let pulseIndex = 0; pulseIndex < pulseCount; pulseIndex += 1) {
        cells[stringName].push(normalizeSegment(sourceSegments[pulseIndex]));
      }
    }
  }

  return cells;
};

const toChartEventFromLegacyCells = (
  stringNames: string[],
  barCells: Record<string, string[]>,
): SongChartEventDto[] => {
  const slotCount = Math.max(0, ...stringNames.map((stringName) => barCells[stringName]?.length ?? 0));
  const eventCount = Math.max(1, Math.ceil(slotCount / 2));

  return Array.from({ length: eventCount }, (_, eventIndex) => {
    const start = eventIndex * 2;
    const end = Math.min(start + 2, slotCount);
    const pulseLabels = [String(eventIndex + 1), '&'].slice(0, Math.max(1, end - start));
    const cells: Record<string, SongChartCellDto[]> = Object.fromEntries(
      stringNames.map((stringName) => {
        const segments = normalizeSegmentsToPulseLength((barCells[stringName] ?? []).slice(start, end), pulseLabels.length);
        const isEmpty = segments.every((segment) => segment === EMPTY_SEGMENT);
        return [
          stringName,
          isEmpty
            ? []
            : [{ text: segments.join(''), segments }],
        ];
      }),
    );

    return {
      id: createId('evt'),
      order: eventIndex + 1,
      timingText: `${eventIndex + 1}&`,
      beatStart: eventIndex + 1,
      beatEnd: eventIndex + 1,
      pulseLabels,
      cells,
    };
  });
};

const toChartEvents = (
  stringNames: string[],
  bar: SongRow['bars'][number],
): SongChartEventDto[] => {
  const barEvents = Array.isArray((bar as SongBar).events) ? ((bar as SongBar).events ?? []) : [];

  if (barEvents.length === 0) {
    return toChartEventFromLegacyCells(stringNames, bar.cells);
  }

  return barEvents.map((event, index) => {
    const pulseCount = getEventPulseCount(event);
    const pulseLabels = Array.from({ length: pulseCount }, (_, pulseIndex) =>
      event.pulseLabels[pulseIndex] ?? '',
    );
    const cells: Record<string, SongChartCellDto[]> = Object.fromEntries(
      stringNames.map((stringName) => {
        const sourceCells = event.cells[stringName] ?? [];
        return [
          stringName,
          sourceCells.map((cell) => {
            const segments = normalizeSegmentsToPulseLength(cell.segments ?? [], pulseLabels.length);
            return {
              text: typeof cell.text === 'string' ? cell.text : segments.join(''),
              segments,
            };
          }),
        ];
      }),
    );

    return {
      id: typeof event.id === 'string' ? event.id : createId('evt'),
      order: typeof event.order === 'number' ? event.order : index + 1,
      timingText: toNullableText(event.timingText),
      beatStart: typeof event.beatStart === 'number' ? event.beatStart : null,
      beatEnd: typeof event.beatEnd === 'number' ? event.beatEnd : null,
      pulseLabels,
      cells,
    };
  });
};

const toInstructionDto = (bar: SongBar): SongChartInstructionDto | null => {
  if (!isInstructionBar(bar)) {
    return null;
  }

  return {
    kind: 'TEXT',
    text: bar.instruction.text,
  };
};

const encodeLegacyInstructionPayload = (payload: LegacyInstructionPayload): string =>
  `${LEGACY_INSTRUCTION_NOTE_PREFIX}${JSON.stringify(payload)}`;

const decodeLegacyInstructionPayload = (note: string | null | undefined): LegacyInstructionPayload | null => {
  if (typeof note !== 'string' || !note.startsWith(LEGACY_INSTRUCTION_NOTE_PREFIX)) {
    return null;
  }

  const raw = note.slice(LEGACY_INSTRUCTION_NOTE_PREFIX.length);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const text = typeof record.text === 'string' ? record.text : '';
    const noteValue = typeof record.note === 'string' ? record.note : undefined;
    return { text, ...(noteValue !== undefined ? { note: noteValue } : {}) };
  } catch (_error) {
    return null;
  }
};

const toChartBarDto = (stringNames: string[], bar: SongBar): SongChartBarDto => {
  const id = typeof bar.id === 'string' ? bar.id : createId('bar');

  if (isInstructionBar(bar)) {
    const instruction = toInstructionDto(bar) ?? { kind: 'TEXT', text: '' };
    const legacyCells: Record<string, string[]> = Object.fromEntries(
      stringNames.map((stringName) => [stringName, []]),
    );

    // Compatibility mode for legacy backend chart validators that only accept event-backed bars.
    return {
      id,
      type: 'PLAYABLE',
      note: encodeLegacyInstructionPayload({
        text: instruction.text,
        ...(toNullableText(bar.note) ? { note: toNullableText(bar.note) ?? undefined } : {}),
      }),
      events: toChartEventFromLegacyCells(stringNames, legacyCells),
    };
  }

  return {
    id,
    type: 'PLAYABLE',
    note: toNullableText(bar.note),
    events: toChartEvents(stringNames, bar),
  };
};

export const toSongMetadataDto = (song: Song): SongMetadataDto => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  authorComment: toNullableText(song.authorComment),
  key: toNullableText(song.key),
  tuning: toNullableText(song.tuning),
  updatedAt: song.updatedAt,
  stringCount: song.stringCount,
  importedPublishedSongId: song.importedPublishedSongId ?? null,
});

export const toSongChartDto = (song: Pick<Song, 'stringNames' | 'rows'>): SongChartDto => ({
  schemaVersion: 2,
  stringNames: [...song.stringNames],
  rows: song.rows.map((row): SongChartRowDto => ({
    id: row.id,
    label: toNullableText(row.label),
    beforeText: toNullableText(row.beforeText),
    afterText: toNullableText(row.afterText),
    bars: row.bars.map((bar) => toChartBarDto(song.stringNames, bar)),
  })),
});

export const toSongDto = (song: Song): SongDto => ({
  ...toSongMetadataDto(song),
  chart: toSongChartDto(song),
});

const fromSongChartRowDto = (
  stringNames: string[],
  row: SongChartRowDto,
): SongRow => ({
  id: row.id,
  label: row.label ?? '',
  beforeText: row.beforeText ?? '',
  afterText: row.afterText ?? '',
  bars: row.bars.map((bar) => ({
    ...(normalizeBarForEditor(
      bar.type === 'INSTRUCTION'
        ? {
            id: bar.id,
            type: 'INSTRUCTION',
            note: row.bars.length > 0 && bar.note !== null ? bar.note : undefined,
            instruction: {
              ...(bar.instruction as Record<string, unknown>),
              kind: 'TEXT',
              text: bar.instruction.text,
            },
            cells: Object.fromEntries(stringNames.map((stringName) => [stringName, []])),
          }
        : (() => {
            const decodedInstruction = decodeLegacyInstructionPayload(bar.note);
            if (decodedInstruction) {
              return {
                id: bar.id,
                type: 'INSTRUCTION' as const,
                note: decodedInstruction.note,
                instruction: {
                  kind: 'TEXT' as const,
                  text: decodedInstruction.text,
                },
                cells: Object.fromEntries(stringNames.map((stringName) => [stringName, []])),
              };
            }

            return {
              id: bar.id,
              type: 'PLAYABLE' as const,
              note: row.bars.length > 0 && bar.note !== null ? bar.note : undefined,
              events: (bar.events ?? []).map((event) => ({
                id: event.id,
                order: event.order,
                timingText: event.timingText ?? undefined,
                beatStart: event.beatStart ?? undefined,
                beatEnd: event.beatEnd ?? undefined,
                pulseLabels: [...event.pulseLabels],
                cells: Object.fromEntries(
                  stringNames.map((stringName) => [stringName, [...(event.cells[stringName] ?? [])]]),
                ),
              })),
              cells: buildLegacyCellsFromEvents(stringNames, bar.events ?? []),
            };
          })(),
      stringNames,
    )),
  })),
});

export const fromSongDto = (dto: SongDto): Song => ({
  id: dto.id,
  title: dto.title,
  artist: dto.artist,
  authorComment: dto.authorComment ?? null,
  key: dto.key ?? '',
  tuning: dto.tuning ?? '',
  updatedAt: dto.updatedAt,
  stringCount: dto.stringCount,
  stringNames: dto.chart.stringNames,
  rows: dto.chart.rows.map((row) => fromSongChartRowDto(dto.chart.stringNames, row)),
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
