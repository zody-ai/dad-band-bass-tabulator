import { Fragment } from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { palette } from '../constants/colors';
import {
  ParsedBar,
  TabRowAnnotation,
  EMPTY_SLOT,
  getBarBeatCount,
  getBarSlotCount,
} from '../utils/tabLayout';
import { getNoteRenderStyle, isEmptySlotValue, isNumericTabValue } from '../utils/tabPreviewTimeline';

export type TabPreviewRenderMode = 'ascii' | 'svg';
export type TabPreviewSvgScaleProfile = 'standard' | 'performance';

interface TabPreviewContentProps {
  stringNames: string[];
  bars: ParsedBar[];
  rowAnnotations?: TabRowAnnotation[];
  rowBarCounts?: number[];
  barsPerRow?: number;
  tone?: 'light' | 'dark';
  compact?: boolean;
  svgScaleProfile?: TabPreviewSvgScaleProfile;
  svgViewportWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export interface TabPagePreviewProps extends TabPreviewContentProps {
  renderMode?: TabPreviewRenderMode;
}

interface AnnotationFormat {
  text: string;
}

interface Segment {
  text: string;
  bold?: boolean;
  underline?: boolean;
}

const monoFontFamily =
  Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) ?? 'monospace';
const slotToSegment = (value: string): string => {
  if (!value || isEmptySlotValue(value)) {
    return '--';
  }

  return value.padEnd(2, '-').slice(0, 2);
};

const joinRenderedBars = (segments: string[]) =>
  segments.map((segment, index) => (index === 0 ? segment : segment.slice(1))).join('');

const renderAsciiBarNotes = (rowBars: ParsedBar[], barNotes: string[], prefixChars: number) => {
  if (!barNotes.some((note) => note.length > 0)) {
    return '';
  }

  const prefix = prefixChars > 0 ? ' '.repeat(prefixChars) : '';
  const rendered = joinRenderedBars(
    rowBars.map((bar, index) => {
      const slots = getBarSlotCount(bar);
      const barTextWidth = slots * 2;
      return `|${(barNotes[index] ?? '').slice(0, barTextWidth).padEnd(barTextWidth, ' ')}|`;
    }),
  );

  return `${prefix}${rendered}`;
};

const buildAsciiBeatGuideSegment = (bar: ParsedBar): string => {
  const beatCount = getBarBeatCount(bar);
  let body = '|';

  for (let beat = 1; beat <= beatCount; beat += 1) {
    body += `${beat} & `;
  }

  return body + '|';
};

const parseAnnotationLayout = (value: string): AnnotationFormat => {
  let remainder = value;

  // Backward compatibility: strip old control tokens.
  while (remainder.startsWith('[')) {
    const controlMatch = remainder.match(/^\[(left|center|right|bar:\d+)\]\s*/i);

    if (!controlMatch) {
      break;
    }

    remainder = remainder.slice(controlMatch[0].length);
  }

  return { text: remainder };
};

const parseSegments = (value: string): Segment[] => {
  const segments: Segment[] = [];
  const pattern = /(<b>[\s\S]*?<\/b>|<u>[\s\S]*?<\/u>|\*\*[^*]+\*\*|__[^_]+__)/gi;
  let lastIndex = 0;

  value.replace(pattern, (match, _group, offset) => {
    if (offset > lastIndex) {
      segments.push({ text: value.slice(lastIndex, offset) });
    }

    const lowerMatch = match.toLowerCase();

    if (lowerMatch.startsWith('<b>') && lowerMatch.endsWith('</b>')) {
      segments.push({ text: match.slice(3, -4), bold: true });
    } else if (lowerMatch.startsWith('<u>') && lowerMatch.endsWith('</u>')) {
      segments.push({ text: match.slice(3, -4), underline: true });
    } else if (match.startsWith('**')) {
      segments.push({ text: match.slice(2, -2), bold: true });
    } else {
      segments.push({ text: match.slice(2, -2), underline: true });
    }

    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < value.length) {
    segments.push({ text: value.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text: value }];
};

const resolveRowBarCounts = (
  bars: ParsedBar[],
  rowBarCounts?: number[],
  barsPerRow = 4,
) =>
  rowBarCounts && rowBarCounts.length > 0
    ? rowBarCounts.filter((count) => count > 0)
    : Array.from({ length: Math.max(1, Math.ceil(bars.length / barsPerRow)) }, () => barsPerRow);

export function TabPagePreview({ renderMode = 'ascii', ...contentProps }: TabPagePreviewProps) {
  return renderMode === 'svg' ? (
    <SvgTabPagePreview {...contentProps} />
  ) : (
    <AsciiTabPagePreview {...contentProps} />
  );
}

const renderStem = (
  stemX: number,
  baseY: number,
  accentColor: string,
  keyPrefix: string,
  stemHeight: number,
) => {
  const stemTop = baseY - stemHeight;

  return (
    <Line
      key={`${keyPrefix}-${stemX}-${baseY}`}
      x1={stemX}
      x2={stemX}
      y1={baseY}
      y2={stemTop}
      stroke={accentColor}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
  );
};

const renderNoteMarker = (stemX: number, fretY: number, accentColor: string, stemHeight: number) =>
  renderStem(stemX, fretY, accentColor, 'note-marker', stemHeight);

const renderHoldTail = (stemX: number, circleTopY: number, accentColor: string, stemHeight: number) =>
  renderStem(stemX, circleTopY, accentColor, 'hold-tail', stemHeight);

const renderQuaverFlag = (stemX: number, stemTop: number, accentColor: string) => (
  <Line
    key={`quaver-flag-${stemX}-${stemTop}`}
    x1={stemX}
    x2={stemX + SVG_FLAG_WIDTH}
    y1={stemTop}
    y2={stemTop}
    stroke={accentColor}
    strokeWidth={1.4}
    strokeLinecap="round"
  />
);

function AsciiTabPagePreview({
  stringNames,
  bars,
  rowAnnotations = [],
  rowBarCounts,
  barsPerRow = 4,
  tone = 'light',
  compact = false,
  style,
}: TabPreviewContentProps) {
  const isDark = tone === 'dark';
  const labelWidth = Math.max(1, ...stringNames.map((stringName) => stringName.length));
  const barStartColumns = labelWidth + 1;
  const resolvedRowBarCounts = resolveRowBarCounts(bars, rowBarCounts, barsPerRow);
  let barCursor = 0;

  return (
    <View style={[styles.preview, style]}>
      {resolvedRowBarCounts.map((barCount, rowIndex) => {
        const rowBars = bars.slice(barCursor, barCursor + barCount);
        const annotation = rowAnnotations[rowIndex];
        barCursor += barCount;

        return (
          <View key={`preview-row-${rowIndex}`} style={styles.rowBlock}>
            {annotation?.label?.trim() ? (
              <Text
                style={[
                  compact ? styles.compactBlockLabel : styles.blockLabel,
                  isDark ? styles.darkMetaText : styles.lightMetaText,
                ]}
              >
                {annotation.label.trim()}
              </Text>
            ) : null}

            {annotation?.beforeText?.trim() ? (
              <AnnotationLine
                value={annotation.beforeText}
                compact={compact}
                dark={isDark}
                mode="ascii"
                prefixChars={barStartColumns}
              />
            ) : null}

            {annotation?.barNotes?.some((note) => note.length > 0) ? (
              <Text
                style={[
                  compact ? styles.compactTabText : styles.tabText,
                  isDark ? styles.darkAnnotationText : styles.lightAnnotationText,
                ]}
              >
                {renderAsciiBarNotes(rowBars, annotation.barNotes.slice(0, rowBars.length), barStartColumns)}
              </Text>
            ) : null}

            <Text
              style={[
                compact ? styles.compactTabText : styles.tabText,
                isDark ? styles.darkTabText : styles.lightTabText,
              ]}
            >
              {`${' '.repeat(barStartColumns)}${joinRenderedBars(rowBars.map((bar) => buildAsciiBeatGuideSegment(bar)))}`}
            </Text>

            {stringNames.map((stringName) => (
              <Text
                key={`preview-row-${rowIndex}-${stringName}`}
                style={[
                  compact ? styles.compactTabText : styles.tabText,
                  isDark ? styles.darkTabText : styles.lightTabText,
                ]}
              >
                {`${stringName.padEnd(labelWidth)} ${joinRenderedBars(
                  rowBars.map((bar) =>
                    `|${(bar.cells[stringName] ?? Array.from({ length: getBarSlotCount(bar) }, () => EMPTY_SLOT))
                      .map(slotToSegment)
                      .join('')}|`,
                  ),
                )}`}
              </Text>
            ))}

            {annotation?.afterText?.trim() ? (
              <AnnotationLine
                value={annotation.afterText}
                compact={compact}
                dark={isDark}
                mode="ascii"
                prefixChars={barStartColumns}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const SVG_LINE_STROKE = 1;
const SVG_BAR_STROKE = 1.4;
const SVG_HOLD4_RADIUS = 12;
const SVG_HOLD2_RADIUS = 9;
const SVG_CIRCLE_OFFSET = 5;
const SVG_FLAG_WIDTH = 10;
const SVG_FLAG_HEIGHT = 8;
const SVG_STEM_X_OFFSET = 5;
const SVG_SHORT_BEAT_STEM_LEFT_ADJUST = 3;
const SVG_SHORT_BEAT_STEM_Y_OFFSET = 10;
const SVG_FRET_TEXT_Y_OFFSET = 4;

const SVG_SCALE_PROFILES: Record<
  TabPreviewSvgScaleProfile,
  {
    slotWidth: number;
    slotGap: number;
    rowGap: number;
    rowPadding: number;
    notationTopInset: number;
    labelColumnWidth: number;
    stringSpacing: number;
    minRowWidth: number;
    minRowHeight: number;
    minSlotAdvance: number;
    fretFontSize: number;
    noteMargin: number;
    stemHeight: number;
    annotationFontSize: number;
    annotationLineHeight: number;
    compactAnnotationFontSize: number;
    compactAnnotationLineHeight: number;
    labelFontSize: number;
    labelLineHeight: number;
    compactLabelFontSize: number;
    barNoteFontSize: number;
    barNoteLineHeight: number;
    compactBarNoteFontSize: number;
    compactBarNoteLineHeight: number;
  }
> = {
  standard: {
    slotWidth: 22,
    slotGap: 5,
    rowGap: 10,
    rowPadding: 12,
    notationTopInset: 36,
    labelColumnWidth: 24,
    stringSpacing: 26,
    minRowWidth: 240,
    minRowHeight: 96,
    minSlotAdvance: 14,
    fretFontSize: 16,
    noteMargin: 40,
    stemHeight: 30,
    annotationFontSize: 16,
    annotationLineHeight: 22,
    compactAnnotationFontSize: 14,
    compactAnnotationLineHeight: 18,
    labelFontSize: 14,
    labelLineHeight: 22,
    compactLabelFontSize: 12,
    barNoteFontSize: 13,
    barNoteLineHeight: 18,
    compactBarNoteFontSize: 12,
    compactBarNoteLineHeight: 16,
  },
  performance: {
    slotWidth: 28,
    slotGap: 6,
    rowGap: 7,
    rowPadding: 8,
    notationTopInset: 18,
    labelColumnWidth: 30,
    stringSpacing: 17,
    minRowWidth: 320,
    minRowHeight: 72,
    minSlotAdvance: 12,
    fretFontSize: 14,
    noteMargin: 52,
    stemHeight: 18,
    annotationFontSize: 16,
    annotationLineHeight: 20,
    compactAnnotationFontSize: 14,
    compactAnnotationLineHeight: 18,
    labelFontSize: 14,
    labelLineHeight: 16,
    compactLabelFontSize: 12,
    barNoteFontSize: 14,
    barNoteLineHeight: 16,
    compactBarNoteFontSize: 12,
    compactBarNoteLineHeight: 14,
  },
};

function SvgTabPagePreview({
  stringNames,
  bars,
  rowAnnotations = [],
  rowBarCounts,
  barsPerRow = 4,
  tone = 'light',
  compact = false,
  svgScaleProfile = 'standard',
  svgViewportWidth,
  style,
}: TabPreviewContentProps) {
  const isDark = tone === 'dark';
  const { width: windowWidth } = useWindowDimensions();
  const resolvedRowBarCounts = resolveRowBarCounts(bars, rowBarCounts, barsPerRow);
  let barCursor = 0;
  const svgScale = SVG_SCALE_PROFILES[svgScaleProfile];

  const baseSlotAdvance = svgScale.slotWidth + svgScale.slotGap;
  const fallbackViewportWidth = Math.max(320, windowWidth - 40);
  const resolvedViewportWidth = svgViewportWidth && svgViewportWidth > 0
    ? svgViewportWidth
    : fallbackViewportWidth;

  return (
    <View style={[styles.preview, style]}>
      {resolvedRowBarCounts.map((barCount, rowIndex) => {
        const rowBars = bars.slice(barCursor, barCursor + barCount);
        const annotation = rowAnnotations[rowIndex];
        barCursor += barCount;

        const effectiveBarCount = Math.max(rowBars.length, 1);
        const rowBarSlotCounts = rowBars.map((bar) => getBarSlotCount(bar));
        const cumulativeBarOffsets = rowBarSlotCounts.reduce<number[]>((offsets, slotCount, index) => {
          if (index === 0) {
            offsets.push(0);
            return offsets;
          }

          offsets.push(offsets[index - 1] + rowBarSlotCounts[index - 1]);
          return offsets;
        }, []);
        const totalSlotCount = rowBarSlotCounts.reduce((sum, slotCount) => sum + slotCount, 0);
        const maxSvgWidth = Math.max(
          160,
          resolvedViewportWidth - svgScale.labelColumnWidth - svgScale.rowGap,
        );
        const fixedSvgWidth = svgScale.rowPadding * 2 + svgScale.noteMargin;
        const availableGridWidth = Math.max(1, maxSvgWidth - fixedSvgWidth);
        const slotAdvance =
          totalSlotCount > 0
            ? Math.min(
              baseSlotAdvance,
              Math.max(svgScale.minSlotAdvance, availableGridWidth / totalSlotCount),
            )
            : baseSlotAdvance;
        const gridWidth = Math.max(1, totalSlotCount) * slotAdvance;
        const minRowWidth = Math.min(svgScale.minRowWidth, maxSvgWidth);
        const svgWidth = Math.max(
          gridWidth + fixedSvgWidth,
          minRowWidth,
        );
        const stringPositions =
          stringNames.length > 0
            ? stringNames.map(
              (_, index) => svgScale.rowPadding + svgScale.notationTopInset + index * svgScale.stringSpacing,
            )
            : [svgScale.rowPadding];
        const svgHeight = Math.max(
          (stringPositions[stringPositions.length - 1] ?? svgScale.rowPadding) + svgScale.rowPadding,
          svgScale.minRowHeight,
        );
        const lineColor = isDark ? palette.liveText : palette.border;
        const fretColor = isDark ? palette.liveAccent : palette.primary;
        const accentColor = isDark ? palette.liveAccent : palette.accent;

        return (
          <View key={`preview-row-${rowIndex}`} style={[styles.rowBlock, styles.svgRow]}>
            {annotation?.label?.trim() ? (
              <Text
                style={[
                  compact ? styles.compactBlockLabel : styles.blockLabel,
                  isDark ? styles.darkMetaText : styles.lightMetaText,
                ]}
              >
                {annotation.label.trim()}
              </Text>
            ) : null}

            {annotation?.beforeText?.trim() ? (
              <AnnotationLine
                value={annotation.beforeText}
                compact={compact}
                dark={isDark}
                mode="svg"
                leftInset={svgScale.labelColumnWidth + svgScale.rowGap + svgScale.rowPadding}
                svgScaleProfile={svgScaleProfile}
              />
            ) : null}

            {annotation?.barNotes?.some((note) => note.length > 0) ? (
              <BarNotesRow
                notes={annotation.barNotes.slice(0, rowBars.length)}
                compact={compact}
                dark={isDark}
                leftInset={svgScale.labelColumnWidth + svgScale.rowGap + svgScale.rowPadding}
                barWidths={rowBars.map((bar) => getBarSlotCount(bar) * slotAdvance)}
                svgScaleProfile={svgScaleProfile}
              />
            ) : null}

            <View style={[styles.svgRowContent, { minHeight: svgHeight }]}>
              <View
                style={[
                  styles.svgLabelColumn,
                  {
                    height: svgHeight + 4,
                    width: svgScale.labelColumnWidth,
                    marginRight: svgScale.rowGap,
                    paddingTop: svgScale.notationTopInset,
                  },
                ]}
              >
                {stringNames.map((stringName, stringIndex) => (
                  <Text
                    key={`svg-label-${stringIndex}`}
                    style={[
                      {
                        fontSize: compact
                          ? svgScale.compactLabelFontSize
                          : svgScale.labelFontSize,
                        lineHeight: svgScale.labelLineHeight,
                      },
                      isDark ? styles.darkMetaText : styles.lightMetaText,
                    ]}
                  >
                    {stringName}
                  </Text>
                ))}
              </View>

              <Svg width={svgWidth} height={svgHeight}>
                {stringPositions.map((position, stringIndex) => (
                  <Line
                    key={`svg-string-${stringIndex}`}
                    x1={svgScale.rowPadding}
                    x2={svgWidth - svgScale.rowPadding}
                    y1={position}
                    y2={position}
                    stroke={lineColor}
                    strokeWidth={SVG_LINE_STROKE}
                  />
                ))}

                {Array.from({ length: effectiveBarCount + 1 }).map((_, lineIndex) => {
                  const slotOffset =
                    lineIndex === effectiveBarCount
                      ? totalSlotCount
                      : cumulativeBarOffsets[lineIndex] ?? 0;
                  const xPosition = svgScale.rowPadding + slotOffset * slotAdvance;
                  return (
                    <Line
                      key={`svg-bar-${lineIndex}`}
                      x1={xPosition}
                      x2={xPosition}
                      y1={stringPositions[0]}
                      y2={stringPositions[stringPositions.length - 1]}
                      stroke={lineColor}
                      strokeWidth={SVG_BAR_STROKE}
                    />
                  );
                })}

                {rowBars.map((bar, barIndex) =>
                  stringNames.map((stringName, stringIndex) =>
                    (bar.cells[stringName] ?? Array.from({ length: getBarSlotCount(bar) }, () => EMPTY_SLOT)).map(
                      (slot, slotIndex) => {
                        if (isEmptySlotValue(slot)) {
                          return null;
                        }

                        const trimmed = slot.trim();
                        const renderedValue = trimmed.replace(/-+$/g, '') || trimmed;
                        const isTimedNote = isNumericTabValue(trimmed);
                        const fretX =
                          svgScale.rowPadding +
                          (cumulativeBarOffsets[barIndex] ?? 0) * slotAdvance +
                          slotIndex * slotAdvance +
                          svgScale.slotWidth / 2;
                        const fretY = stringPositions[stringIndex];
                        const noteStyle = isTimedNote
                          ? getNoteRenderStyle({
                            rowBars,
                            stringName,
                            barIndex,
                            slotIndex,
                          })
                          : 'short';
                        const shortBeatStemBaseY = fretY - SVG_SHORT_BEAT_STEM_Y_OFFSET;
                        const stemTop = shortBeatStemBaseY - svgScale.stemHeight;
                        const circleCenterY =
                          noteStyle === 'hold4' || noteStyle === 'hold2'
                            ? fretY - SVG_CIRCLE_OFFSET
                            : fretY;
                        const circleRadius =
                          noteStyle === 'hold4'
                            ? SVG_HOLD4_RADIUS
                            : noteStyle === 'hold2'
                              ? SVG_HOLD2_RADIUS
                              : 0;
                        const circleTopY = circleCenterY - circleRadius;
                        const tailOriginY =
                          isTimedNote
                            ? noteStyle === 'short'
                              ? stemTop
                              : noteStyle === 'hold2'
                                ? circleTopY
                                : undefined
                            : undefined;
                        const shouldDrawStem = isTimedNote && (noteStyle === 'short' || noteStyle === 'beat');
                        const shouldDrawHoldTail = isTimedNote && noteStyle === 'hold2';
                        const shouldDrawFlag = isTimedNote && noteStyle === 'short' && tailOriginY !== undefined;
                        const stemX =
                          noteStyle === 'short' || noteStyle === 'beat'
                            ? fretX + SVG_STEM_X_OFFSET - SVG_SHORT_BEAT_STEM_LEFT_ADJUST
                            : fretX;

                        return (
                          <Fragment key={`svg-fret-${rowIndex}-${barIndex}-${stringName}-${slotIndex}`}>
                            <SvgText
                              x={fretX}
                              y={fretY + SVG_FRET_TEXT_Y_OFFSET}
                              fill={fretColor}
                              fontSize={svgScale.fretFontSize}
                              textAnchor="middle"
                              alignmentBaseline="middle"
                            >
                              {renderedValue}
                            </SvgText>

                            {shouldDrawStem &&
                              renderNoteMarker(stemX, shortBeatStemBaseY, accentColor, svgScale.stemHeight)}
                            {shouldDrawHoldTail &&
                              renderHoldTail(fretX, circleTopY, accentColor, svgScale.stemHeight)}
                            {shouldDrawFlag &&
                              renderQuaverFlag(stemX, tailOriginY, accentColor)}
                            {isTimedNote && (noteStyle === 'hold4' || noteStyle === 'hold2') && (
                              <Circle
                                cx={fretX}
                                cy={circleCenterY}
                                r={circleRadius}
                                stroke={accentColor}
                                strokeWidth={2}
                                fill="none"
                              />
                            )}
                          </Fragment>
                        );
                      },
                    ),
                  ),
                )}
              </Svg>
            </View>

            {annotation?.afterText?.trim() ? (
              <AnnotationLine
                value={annotation.afterText}
                compact={compact}
                dark={isDark}
                mode="svg"
                leftInset={svgScale.labelColumnWidth + svgScale.rowGap + svgScale.rowPadding}
                svgScaleProfile={svgScaleProfile}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function AnnotationLine({
  value,
  compact,
  dark,
  mode = 'ascii',
  prefixChars = 0,
  leftInset = 0,
  svgScaleProfile = 'standard',
}: {
  value: string;
  compact: boolean;
  dark: boolean;
  mode?: 'ascii' | 'svg';
  prefixChars?: number;
  leftInset?: number;
  svgScaleProfile?: TabPreviewSvgScaleProfile;
}) {
  const { text } = parseAnnotationLayout(value);
  const segments = parseSegments(text);
  const prefix = prefixChars > 0 ? ' '.repeat(prefixChars) : '';
  const svgScale = SVG_SCALE_PROFILES[svgScaleProfile];

  return (
    <View style={[styles.annotationRow, leftInset > 0 ? { paddingLeft: leftInset } : undefined]}>
      <Text
        style={[
          compact ? styles.compactAnnotationText : styles.annotationText,
          mode === 'svg' && {
            fontSize: compact
              ? svgScale.compactAnnotationFontSize
              : svgScale.annotationFontSize,
            lineHeight: compact
              ? svgScale.compactAnnotationLineHeight
              : svgScale.annotationLineHeight,
            letterSpacing: 0.1,
          },
          dark ? styles.darkAnnotationText : styles.lightAnnotationText,
        ]}
      >
        {prefix}
        {segments.map((segment, index) => (
          <Fragment key={`${segment.text}-${index}`}>
            <Text
              style={[
                segment.bold && styles.boldText,
                segment.underline && styles.underlineText,
              ]}
            >
              {segment.text}
            </Text>
          </Fragment>
        ))}
      </Text>
    </View>
  );
}

function BarNotesRow({
  notes,
  compact,
  dark,
  leftInset,
  barWidths,
  svgScaleProfile = 'standard',
}: {
  notes: string[];
  compact: boolean;
  dark: boolean;
  leftInset: number;
  barWidths: number[];
  svgScaleProfile?: TabPreviewSvgScaleProfile;
}) {
  const svgScale = SVG_SCALE_PROFILES[svgScaleProfile];

  return (
    <View style={[styles.barNotesRow, { paddingLeft: leftInset }]}>
      <View style={styles.barNotesTrack}>
        {notes.map((note, index) => (
          <Text
            key={`bar-note-${index}`}
            numberOfLines={1}
            style={[
              styles.barNoteCell,
              {
                fontSize: compact
                  ? svgScale.compactBarNoteFontSize
                  : svgScale.barNoteFontSize,
                lineHeight: compact
                  ? svgScale.compactBarNoteLineHeight
                  : svgScale.barNoteLineHeight,
              },
              dark ? styles.darkAnnotationText : styles.lightAnnotationText,
              { width: barWidths[index] ?? barWidths[barWidths.length - 1] ?? 0 },
            ]}
          >
            {note}
          </Text>
        ))}
      </View>
    </View>
  );
}

const monoWeb = Platform.select({
  web: {
    whiteSpace: 'pre',
    overflowWrap: 'normal',
    wordBreak: 'normal',
  } as TextStyle,
  default: {},
});

const styles = StyleSheet.create({
  preview: {
    gap: 8,
  },
  rowBlock: {
    gap: 2,
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  compactBlockLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  annotationRow: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 1,
  },
  barNotesRow: {
    width: '100%',
    marginBottom: 2,
  },
  barNotesTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  barNoteCell: {
    fontFamily: monoFontFamily,
    textAlign: 'left',
    ...monoWeb,
  },
  annotationText: {
    fontFamily: monoFontFamily,
    fontSize: 11,
    lineHeight: 14,
    ...monoWeb,
  },
  compactAnnotationText: {
    fontFamily: monoFontFamily,
    fontSize: 9,
    lineHeight: 11,
    ...monoWeb,
  },
  tabText: {
    fontFamily: monoFontFamily,
    fontSize: 11,
    lineHeight: 14,
    ...monoWeb,
  },
  compactTabText: {
    fontFamily: monoFontFamily,
    fontSize: 10,
    lineHeight: 12,
    ...monoWeb,
  },
  darkTabText: {
    color: palette.liveText,
  },
  lightTabText: {
    color: '#111827',
  },
  darkAnnotationText: {
    color: palette.liveAccent,
  },
  lightAnnotationText: {
    color: palette.primary,
  },
  darkMetaText: {
    color: palette.liveMuted,
  },
  lightMetaText: {
    color: '#475569',
  },
  boldText: {
    fontWeight: '700',
  },
  underlineText: {
    textDecorationLine: 'underline',
  },
  svgRow: {
    gap: 8,
  },
  svgRowContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  svgLabelColumn: {
    justifyContent: 'space-between',
  },
});
