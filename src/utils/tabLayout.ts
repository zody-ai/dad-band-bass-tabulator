const DEFAULT_STRING_NAMES = ['G', 'D', 'A', 'E'];
export const MIN_BEAT_COUNT = 2;
export const MAX_BEAT_COUNT = 6;
export const DEFAULT_BEAT_COUNT = 4;
export const SLOTS_PER_BEAT = 2;
export const SLOTS_PER_BAR = 8;
const CHARS_PER_SLOT = 2;
export const EMPTY_SLOT = '-';
const BARS_PER_ROW = 4;

export interface ParsedBar {
  cells: Record<string, string[]>;
  beatCount?: number;
}

export interface ParsedTabLayout {
  stringNames: string[];
  bars: ParsedBar[];
}

export interface TabRowAnnotation {
  label: string;
  beforeText: string;
  afterText: string;
  barNotes: string[];
}

export const normalizeBeatCount = (value?: number): number =>
  Math.max(
    MIN_BEAT_COUNT,
    Math.min(MAX_BEAT_COUNT, Math.floor(value ?? DEFAULT_BEAT_COUNT)),
  );

export const getSlotsPerBar = (beatCount?: number): number =>
  normalizeBeatCount(beatCount) * SLOTS_PER_BEAT;

export const getBarBeatCount = (bar?: Pick<ParsedBar, 'beatCount'>): number =>
  normalizeBeatCount(bar?.beatCount);

export const getBarSlotCount = (
  bar: ParsedBar | undefined,
  fallbackStringNames: string[] = [],
): number => {
  if (!bar) {
    return getSlotsPerBar();
  }

  if (typeof bar.beatCount === 'number') {
    return getSlotsPerBar(bar.beatCount);
  }

  const cellSlotCount = Object.entries(bar.cells).reduce((maxCount, [, slots]) => {
    if (!Array.isArray(slots)) {
      return maxCount;
    }

    return Math.max(maxCount, slots.length);
  }, 0);

  if (cellSlotCount > 0) {
    return cellSlotCount;
  }

  if (fallbackStringNames.length > 0) {
    const firstStringName = fallbackStringNames[0];
    return (bar.cells[firstStringName] ?? []).length || getSlotsPerBar();
  }

  return getSlotsPerBar();
};

const normalizeSlots = (slots: string[] | undefined, targetSlots: number): string[] => {
  const nextSlots = [...(slots ?? [])].slice(0, targetSlots);

  while (nextSlots.length < targetSlots) {
    nextSlots.push(EMPTY_SLOT);
  }

  return nextSlots.map(normalizeSlot);
};

const createEmptyBar = (
  stringNames: string[],
  beatCount = DEFAULT_BEAT_COUNT,
): ParsedBar => ({
  beatCount: normalizeBeatCount(beatCount),
  cells: Object.fromEntries(
    stringNames.map((stringName) => [
      stringName,
      Array.from({ length: getSlotsPerBar(beatCount) }, () => EMPTY_SLOT),
    ]),
  ),
});

const normalizeSlot = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    return EMPTY_SLOT;
  }

  return trimmed.slice(0, CHARS_PER_SLOT);
};

const inferBeatCountFromSegment = (segment: string): number => {
  const sanitized = segment.replace(/\s/g, '');

  if (!sanitized) {
    return MIN_BEAT_COUNT;
  }

  const inferredSlotCount = Math.max(1, Math.round(sanitized.length / CHARS_PER_SLOT));
  return normalizeBeatCount(Math.round(inferredSlotCount / SLOTS_PER_BEAT));
};

const segmentToSlots = (segment: string, beatCount: number): string[] => {
  const targetSlots = getSlotsPerBar(beatCount);
  const sanitized = segment.replace(/\s/g, '');

  if (!sanitized) {
    return Array.from({ length: targetSlots }, () => EMPTY_SLOT);
  }

  const chunkSize = sanitized.length <= targetSlots ? 1 : CHARS_PER_SLOT;
  const slots: string[] = [];

  for (let index = 0; index < sanitized.length && slots.length < targetSlots; index += chunkSize) {
    slots.push(normalizeSlot(sanitized.slice(index, index + chunkSize)));
  }

  while (slots.length < targetSlots) {
    slots.push(EMPTY_SLOT);
  }

  return slots;
};

const slotToSegment = (value: string): string => {
  const normalized = normalizeSlot(value);

  if (normalized === EMPTY_SLOT) {
    return '--';
  }

  return normalized.padEnd(CHARS_PER_SLOT, '-');
};

export const parseTab = (tab: string): ParsedTabLayout => {
  const lines = tab
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.includes('|'));

  if (lines.length === 0) {
    return {
      stringNames: DEFAULT_STRING_NAMES,
      bars: [createEmptyBar(DEFAULT_STRING_NAMES)],
    };
  }

  const parsedLines = lines.map((line) => {
    const [label, ...rawSegments] = line.split('|');
    const segments = rawSegments.filter((segment, index) => {
      const isLastEmpty = index === rawSegments.length - 1 && segment === '';
      return !isLastEmpty;
    });

    return {
      label: label.trim() || DEFAULT_STRING_NAMES[0],
      segments,
    };
  });

  const stringNames = parsedLines.map((line) => line.label);
  const barCount = Math.max(
    1,
    ...parsedLines.map((line) => line.segments.length),
  );
  const barBeatCounts = Array.from({ length: barCount }, (_, barIndex) =>
    parsedLines.reduce((maxBeatCount, line) => {
      const segment = line.segments[barIndex] ?? '';
      return Math.max(maxBeatCount, inferBeatCountFromSegment(segment));
    }, MIN_BEAT_COUNT),
  );

  const bars = Array.from({ length: barCount }, (_, barIndex) => {
    const beatCount = barBeatCounts[barIndex];
    const bar = createEmptyBar(stringNames, beatCount);

    parsedLines.forEach((line) => {
      bar.cells[line.label] = segmentToSlots(line.segments[barIndex] ?? '', beatCount);
    });

    return bar;
  });

  return { stringNames, bars };
};

export const renderTab = (stringNames: string[], bars: ParsedBar[]): string =>
  stringNames
    .map((stringName) => {
      const renderedBars = bars
        .map((bar) => {
          const targetSlots = getBarSlotCount(bar, stringNames);
          return normalizeSlots(bar.cells[stringName], targetSlots)
            .map(slotToSegment)
            .join('');
        })
        .map((segment) => `|${segment}`)
        .join('');

      return `${stringName}${renderedBars}|`;
    })
    .join('\n');

const joinRenderedBars = (segments: string[]) =>
  segments.map((segment, index) => (index === 0 ? segment : segment.slice(1))).join('');

const getBeatGuide = (beatCount: number): string => {
  let guide = '|';

  for (let beat = 1; beat <= beatCount; beat += 1) {
    guide += `${beat} & `;
  }

  return guide;
};

const getBarTextWidth = (bar: ParsedBar): number =>
  getBarSlotCount(bar) * CHARS_PER_SLOT;

const buildBarNoteGuide = (rowBars: ParsedBar[], barNotes: string[] = []) =>
  joinRenderedBars(
    rowBars.map((bar, index) => {
      const barTextWidth = getBarTextWidth(bar);
      return `|${(barNotes[index] ?? '').slice(0, barTextWidth).padEnd(barTextWidth, ' ')}|`;
    }),
  );

export const buildTabPagePreview = (
  stringNames: string[],
  bars: ParsedBar[],
  rowAnnotations: TabRowAnnotation[] = [],
  barsPerRow = BARS_PER_ROW,
): string => {
  const rows: string[] = [];

  for (let index = 0; index < bars.length; index += barsPerRow) {
    const rowBars = bars.slice(index, index + barsPerRow);
    const rowIndex = Math.floor(index / barsPerRow);
    const annotation = rowAnnotations[rowIndex];

    if (annotation?.label?.trim()) {
      rows.push(`{${annotation.label.trim()}}`);
    }

    if (annotation?.beforeText?.trim()) {
      rows.push(`[${annotation.beforeText.trim()}]`);
    }

    if (annotation?.barNotes?.some((note) => note.length > 0)) {
      rows.push(buildBarNoteGuide(rowBars, annotation.barNotes.slice(0, rowBars.length)));
    }

    rows.push(`  ${joinRenderedBars(rowBars.map((bar) => getBeatGuide(getBarBeatCount(bar))))}`);

    stringNames.forEach((stringName) => {
      const renderedSegments = rowBars
        .map((bar) =>
          `|${normalizeSlots(
            bar.cells[stringName],
            getBarSlotCount(bar, stringNames),
          )
            .map(slotToSegment)
            .join('')}|`,
        );

      rows.push(`${stringName} ${joinRenderedBars(renderedSegments)}`);
    });

    if (annotation?.afterText?.trim()) {
      rows.push(`[${annotation.afterText.trim()}]`);
    }

    if (index + barsPerRow < bars.length) {
      rows.push('');
    }
  }

  return rows.join('\n');
};

export const updateBarCell = (
  bars: ParsedBar[],
  barIndex: number,
  stringName: string,
  slotIndex: number,
  value: string,
): ParsedBar[] =>
  bars.map((bar, currentBarIndex) => {
    if (currentBarIndex !== barIndex) {
      return bar;
    }

    return {
      cells: {
        ...bar.cells,
        [stringName]: (bar.cells[stringName] ?? []).map((slot, currentSlotIndex) =>
          currentSlotIndex === slotIndex ? normalizeSlot(value) : slot,
        ),
      },
    };
  });

export const insertBar = (
  bars: ParsedBar[],
  index: number,
  stringNames: string[],
  sourceBar?: ParsedBar,
  beatCount = DEFAULT_BEAT_COUNT,
): ParsedBar[] => {
  const nextBar =
    sourceBar ??
    createEmptyBar(stringNames, beatCount);
  const normalizedBeatCount = getBarBeatCount(nextBar);
  const targetSlots = getSlotsPerBar(normalizedBeatCount);

  return [
    ...bars.slice(0, index),
    {
      beatCount: normalizedBeatCount,
      cells: Object.fromEntries(
        stringNames.map((stringName) => [
          stringName,
          normalizeSlots(nextBar.cells[stringName], targetSlots),
        ]),
      ),
    },
    ...bars.slice(index),
  ];
};

export const removeBar = (bars: ParsedBar[], index: number, stringNames: string[]): ParsedBar[] => {
  if (bars.length === 1) {
    return [createEmptyBar(stringNames)];
  }

  return bars.filter((_, currentIndex) => currentIndex !== index);
};

export const getRowCount = (bars: ParsedBar[], barsPerRow = BARS_PER_ROW): number =>
  Math.max(1, Math.ceil(bars.length / barsPerRow));
