import { SongBar, SongRow } from '../types/models';
import { DEFAULT_SUBSCRIPTION_CAPABILITIES } from '../constants/subscription';

export interface SongMetadataDto {
  id: string;
  title: string;
  artist: string;
  key: string;
  tuning: string;
  updatedAt: string;
  stringCount: number;
  importedPublishedSongId?: string | null;
}

export interface SongChartDto {
  stringNames: string[];
  rows: SongRow[];
}

export interface SongDto extends SongMetadataDto {
  chart: SongChartDto;
}

export interface PlaylistDto {
  id: string;
  name: string;
  updatedAt: string;
  songIds: string[];
}

export interface CreateSongRequestDto {
  title: string;
  artist: string;
  key: string;
  tuning: string;
  chart: SongChartDto;
  stringCount: number;
}

export interface UpdateSongMetadataRequestDto {
  title?: string;
  artist?: string;
  key?: string;
  tuning?: string;
  stringCount?: number;
}

export interface ReplaceSongChartRequestDto {
  chart: SongChartDto;
}

export interface AiGenerateSongRequestDto {
  artist: string;
  title: string;
}

export interface ReplacePlaylistOrderRequestDto {
  songIds: string[];
}

export type SubscriptionTierDto = 'FREE' | 'PRO';
export type SubscriptionStatusDto =
  | 'active'
  | 'cancellation_scheduled'
  | 'cancelled'
  | 'expired'
  | 'free'
  | 'incomplete';
export type SubscriptionPlanCodeDto = 'free' | 'pro';
export type BillingCurrencyDto = 'GBP' | 'USD' | 'EUR';

export interface SubscriptionCapabilitiesDto {
  maxSongs: number | null;
  maxSetlists: number | null;
  maxCommunitySongs: number | null;
  maxCommunitySaves: number | null;
  maxStringCount: number | null;
  svgEnabled: boolean;
  maxAiGenerations?: number | null;
  maxDailyAiGenerations?: number | null;
}

export interface SubscriptionSnapshotDto {
  tier: SubscriptionTierDto;
  status: SubscriptionStatusDto;
  plan?: SubscriptionPlanCodeDto;
  planCode: string | null;
  currency: BillingCurrencyDto | null;
  unitAmountMinor: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  capabilities: SubscriptionCapabilitiesDto;
  communitySongsSaved: number;
}

export interface SubscriptionPriceDto {
  currency: BillingCurrencyDto;
  unitAmountMinor: number;
}

export interface SubscriptionPlanDto {
  code: string;
  displayName: string;
  billingInterval: string;
  prices: SubscriptionPriceDto[];
}

export interface SubscriptionPricingDto {
  plans: SubscriptionPlanDto[];
}

export interface CheckoutSessionDto {
  sessionId: string;
  checkoutUrl: string;
}

export interface SubscriptionUpgradeRequestDto {
  planCode: string;
  successUrl: string;
  cancelUrl: string;
  currency?: BillingCurrencyDto;
}

export interface SubscriptionUpgradeResponseDto {
  mode: 'MOCK' | 'STRIPE';
  checkoutSession?: CheckoutSessionDto;
  snapshot: SubscriptionSnapshotDto | null;
}

export interface BillingPortalSessionDto {
  url: string;
}

export interface SubscriptionCancelResponseDto {
  snapshot: SubscriptionSnapshotDto;
}

export interface SubscriptionCapabilityDefaultsDto {
  free: SubscriptionCapabilitiesDto;
  pro: SubscriptionCapabilitiesDto;
}

export interface MockUpgradeRequestDto {
  planCode: 'PRO_MONTHLY';
  currency: BillingCurrencyDto;
}

export type PublishedSongStatusDto = 'PUBLISHED' | 'UNLISTED' | 'MODERATION_HIDDEN';
export type OwnershipStatusDto = 'ACTIVE' | 'ORPHANED';

export interface CommunitySongAuthorDto {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export type CommunitySongVoteDirectionDto = 'UP' | 'DOWN';

export interface CommunitySongVotesDto {
  upVotes: number;
  downVotes: number;
  currentUserVote: CommunitySongVoteDirectionDto | null;
}

export interface CommunitySongCardDto {
  id: string;
  publishedSongId?: string | null;
  sourceSongId?: string | null;
  title: string;
  artist: string;
  key?: string | null;
  tuning?: string | null;
  author?: CommunitySongAuthorDto;
  votes: CommunitySongVotesDto;
  publishedAt: string;
  updatedAt: string;
  status?: PublishedSongStatusDto;
  stringCount?: number | null;
  version?: number | null;
  ownershipStatus?: OwnershipStatusDto | null;
}

export interface CommunitySongDetailDto extends CommunitySongCardDto {
  chart: SongChartDto;
}

export interface CommunitySavedSongDto {
  publishedSongId: string;
  communitySongsSaved: number;
}

export interface SaveCommunitySongRequestDto {
  communitySongId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isSongBar = (value: unknown): value is SongBar => {
  if (!isRecord(value)) {
    return false;
  }

  const { cells } = value;

  if (!isRecord(cells)) {
    return false;
  }

  return Object.values(cells).every((slots) => isStringArray(slots));
};

const isSongRow = (value: unknown): value is SongRow => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    typeof value.beforeText === 'string' &&
    typeof value.afterText === 'string' &&
    Array.isArray(value.bars) &&
    value.bars.every((bar) => isSongBar(bar))
  );
};

const isSongChartDto = (value: unknown): value is SongChartDto => {
  if (!isRecord(value)) {
    return false;
  }

  return isStringArray(value.stringNames) && Array.isArray(value.rows) && value.rows.every((row) => isSongRow(row));
};

const isSongMetadataDto = (value: unknown): value is SongMetadataDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.artist === 'string' &&
    typeof value.key === 'string' &&
    typeof value.tuning === 'string' &&
    typeof value.updatedAt === 'string' &&
    typeof value.stringCount === 'number'
  );
};

const isSongDto = (value: unknown): value is SongDto =>
  isSongMetadataDto(value) && isSongChartDto((value as SongDto).chart);

const isPlaylistDto = (value: unknown): value is PlaylistDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.updatedAt === 'string' &&
    isStringArray(value.songIds)
  );
};

const subscriptionTiers: SubscriptionTierDto[] = ['FREE', 'PRO'];
const subscriptionStatuses: SubscriptionStatusDto[] = [
  'active',
  'cancellation_scheduled',
  'cancelled',
  'expired',
  'free',
  'incomplete',
];
const subscriptionPlans: SubscriptionPlanCodeDto[] = ['free', 'pro'];
const billingCurrencies: BillingCurrencyDto[] = ['GBP', 'USD', 'EUR'];
const publishedSongStatuses: PublishedSongStatusDto[] = ['PUBLISHED', 'UNLISTED', 'MODERATION_HIDDEN'];
const ownershipStatuses: OwnershipStatusDto[] = ['ACTIVE', 'ORPHANED'];
const communityVoteDirections: CommunitySongVoteDirectionDto[] = ['UP', 'DOWN'];

const isNullableString = (value: unknown): value is string | null =>
  typeof value === 'string' || value === null;

const isNullableNumber = (value: unknown): value is number | null =>
  typeof value === 'number' || value === null;

const isNullableCurrency = (value: unknown): value is BillingCurrencyDto | null =>
  value === null || billingCurrencies.includes(value as BillingCurrencyDto);

const defaultSubscriptionCapabilitiesDto: SubscriptionCapabilitiesDto = {
  ...DEFAULT_SUBSCRIPTION_CAPABILITIES,
};

const isSubscriptionCapabilitiesDto = (value: unknown): value is SubscriptionCapabilitiesDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNullableNumber(value.maxSongs) &&
    isNullableNumber(value.maxSetlists) &&
    isNullableNumber(value.maxCommunitySongs) &&
    isNullableNumber(value.maxCommunitySaves) &&
    isNullableNumber(value.maxStringCount) &&
    typeof value.svgEnabled === 'boolean' &&
    (value.maxAiGenerations === undefined || isNullableNumber(value.maxAiGenerations)) &&
    (value.maxDailyAiGenerations === undefined || isNullableNumber(value.maxDailyAiGenerations))
  );
};

const isSubscriptionCapabilityDefaultsDto = (value: unknown): value is SubscriptionCapabilityDefaultsDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isSubscriptionCapabilitiesDto(value.free) &&
    isSubscriptionCapabilitiesDto(value.pro)
  );
};

export const parseSubscriptionCapabilityDefaultsDto = (value: unknown): SubscriptionCapabilityDefaultsDto => {
  if (!isSubscriptionCapabilityDefaultsDto(value)) {
    throw new Error('Invalid subscription capability defaults response payload.');
  }

  return value;
};

const normalizeSubscriptionStatus = (status: unknown): SubscriptionStatusDto | null => {
  if (typeof status !== 'string') {
    return null;
  }

  const legacyStatusToSnapshotStatus: Record<string, SubscriptionStatusDto> = {
    FREE: 'free',
    TRIALING: 'active',
    ACTIVE: 'active',
    PAST_DUE: 'active',
    CANCELLED: 'cancelled',
    CANCELED: 'cancelled',
    EXPIRED: 'expired',
    INCOMPLETE: 'incomplete',
    INCOMPLETE_EXPIRED: 'expired',
  };
  const mappedLegacy = legacyStatusToSnapshotStatus[status.toUpperCase()];

  if (mappedLegacy) {
    return mappedLegacy;
  }

  const normalized = status.toLowerCase() as SubscriptionStatusDto;
  if (subscriptionStatuses.includes(normalized)) {
    return normalized;
  }

  return null;
};

const coerceNullableNumber = (value: unknown, fallback: number | null): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  return value === null ? null : fallback;
};

const coerceNullableString = (value: unknown, fallback: string | null): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  return value === null ? null : fallback;
};

const normalizeSubscriptionPlan = (
  plan: unknown,
  tier: SubscriptionTierDto,
): SubscriptionPlanCodeDto => {
  if (typeof plan === 'string') {
    const normalizedPlan = plan.toLowerCase() as SubscriptionPlanCodeDto;
    if (subscriptionPlans.includes(normalizedPlan)) {
      return normalizedPlan;
    }
  }

  return tier === 'PRO' ? 'pro' : 'free';
};

const normalizeSubscriptionTier = (tier: unknown, plan: unknown): SubscriptionTierDto => {
  if (subscriptionTiers.includes(tier as SubscriptionTierDto)) {
    return tier as SubscriptionTierDto;
  }

  if (typeof plan === 'string' && plan.toLowerCase() === 'pro') {
    return 'PRO';
  }

  return 'FREE';
};

const toSubscriptionCapabilitiesDto = (value: unknown): SubscriptionCapabilitiesDto => {
  if (!isRecord(value)) {
    return defaultSubscriptionCapabilitiesDto;
  }

  return {
    maxSongs: coerceNullableNumber(value.maxSongs, defaultSubscriptionCapabilitiesDto.maxSongs),
    maxSetlists: coerceNullableNumber(value.maxSetlists, defaultSubscriptionCapabilitiesDto.maxSetlists),
    maxCommunitySongs: coerceNullableNumber(
      value.maxCommunitySongs,
      defaultSubscriptionCapabilitiesDto.maxCommunitySongs,
    ),
    maxCommunitySaves: coerceNullableNumber(
      value.maxCommunitySaves,
      defaultSubscriptionCapabilitiesDto.maxCommunitySaves,
    ),
    maxStringCount: coerceNullableNumber(
      value.maxStringCount,
      defaultSubscriptionCapabilitiesDto.maxStringCount,
    ),
    svgEnabled:
      typeof value.svgEnabled === 'boolean'
        ? value.svgEnabled
        : defaultSubscriptionCapabilitiesDto.svgEnabled,
    maxAiGenerations: coerceNullableNumber(
      value.maxAiGenerations,
      defaultSubscriptionCapabilitiesDto.maxAiGenerations ?? null,
    ),
    maxDailyAiGenerations: coerceNullableNumber(
      value.maxDailyAiGenerations,
      defaultSubscriptionCapabilitiesDto.maxDailyAiGenerations ?? null,
    ),
  };
};

const toSubscriptionSnapshotDto = (value: unknown): SubscriptionSnapshotDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  const tier = normalizeSubscriptionTier(value.tier, value.plan);
  const status = normalizeSubscriptionStatus(value.status) ?? 'free';
  const plan = normalizeSubscriptionPlan(value.plan, tier);
  const communitySongsSaved =
    typeof value.communitySongsSaved === 'number' && Number.isFinite(value.communitySongsSaved)
      ? Math.max(0, Math.floor(value.communitySongsSaved))
      : 0;

  return {
    tier,
    status,
    plan,
    planCode: coerceNullableString(value.planCode, null),
    currency: isNullableCurrency(value.currency) ? value.currency : null,
    unitAmountMinor: coerceNullableNumber(value.unitAmountMinor, null),
    currentPeriodStart: coerceNullableString(value.currentPeriodStart, null),
    currentPeriodEnd: coerceNullableString(value.currentPeriodEnd, null),
    trialEnd: coerceNullableString(value.trialEnd, null),
    cancelAtPeriodEnd: typeof value.cancelAtPeriodEnd === 'boolean' ? value.cancelAtPeriodEnd : false,
    capabilities: toSubscriptionCapabilitiesDto(value.capabilities),
    communitySongsSaved,
  };
};

const isNullableSongMeta = (value: unknown): value is string | null | undefined =>
  typeof value === 'undefined' || typeof value === 'string' || value === null;

const isNullableCommunityVoteDirectionDto = (
  value: unknown,
): value is CommunitySongVoteDirectionDto | null | undefined =>
  typeof value === 'undefined' ||
  value === null ||
  communityVoteDirections.includes(value as CommunitySongVoteDirectionDto);

const toCommunitySongVotesDto = (value: unknown): CommunitySongVotesDto => {
  if (!isRecord(value)) {
    return {
      upVotes: 0,
      downVotes: 0,
      currentUserVote: null,
    };
  }

  const upVotes = Number.isFinite(value.upVotes) ? Number(value.upVotes) : 0;
  const downVotes = Number.isFinite(value.downVotes) ? Number(value.downVotes) : 0;
  const currentUserVote = isNullableCommunityVoteDirectionDto(value.currentUserVote)
    ? value.currentUserVote ?? null
    : null;

  return {
    upVotes: Math.max(0, Math.floor(upVotes)),
    downVotes: Math.max(0, Math.floor(downVotes)),
    currentUserVote,
  };
};

const isCommunitySongAuthorDto = (value: unknown): value is CommunitySongAuthorDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.userId === 'string' &&
    isNullableString(value.displayName) &&
    isNullableString(value.avatarUrl)
  );
};

const isNullableCommunitySongAuthorDto = (value: unknown): value is CommunitySongAuthorDto | null | undefined =>
  typeof value === 'undefined' || value === null || isCommunitySongAuthorDto(value);

const toCommunitySongAuthorDto = (value: unknown): CommunitySongAuthorDto | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const userId =
    typeof value.userId === 'string'
      ? value.userId
      : typeof value.id === 'string'
        ? value.id
        : typeof value.username === 'string'
          ? value.username
          : typeof value.handle === 'string'
            ? value.handle
            : null;

  if (!userId) {
    return undefined;
  }

  const displayName =
    isNullableString(value.displayName)
      ? value.displayName
      : isNullableString(value.name)
        ? value.name
        : null;
  const avatarUrl =
    isNullableString(value.avatarUrl)
      ? value.avatarUrl
      : isNullableString(value.imageUrl)
        ? value.imageUrl
        : null;

  return {
    userId,
    displayName: displayName ?? null,
    avatarUrl: avatarUrl ?? null,
  };
};

const toCommunitySongCardDto = (value: unknown): CommunitySongCardDto => {
  if (!isRecord(value)) {
    throw new Error('Invalid community catalog response payload.');
  }

  const rawId =
    typeof value.id === 'string'
      ? value.id
      : typeof value.publishedSongId === 'string'
        ? value.publishedSongId
        : typeof value.sourceSongId === 'string'
          ? value.sourceSongId
          : null;

  if (
    !rawId ||
    typeof value.title !== 'string' ||
    typeof value.artist !== 'string' ||
    !isNullableSongMeta(value.key) ||
    !isNullableSongMeta(value.tuning) ||
    !isNullableCommunitySongAuthorDto(value.author) ||
    typeof value.publishedAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    (typeof value.status !== 'undefined' &&
      !publishedSongStatuses.includes(value.status as PublishedSongStatusDto))
  ) {
    throw new Error('Invalid community catalog response payload.');
  }

  const publishedSongId =
    typeof value.publishedSongId === 'string'
      ? value.publishedSongId
      : typeof value.id === 'string'
        ? value.id
        : null;
  const sourceSongId =
    typeof value.sourceSongId === 'string'
      ? value.sourceSongId
      : typeof value.id === 'string'
        ? value.id
        : null;
  const author =
    toCommunitySongAuthorDto(value.author) ??
    toCommunitySongAuthorDto({
      userId: value.authorUserId,
      displayName: value.authorDisplayName,
      avatarUrl: value.authorAvatarUrl,
    });
  const votes = toCommunitySongVotesDto(
    value.votes ??
      ({
        upVotes: value.upVotes,
        downVotes: value.downVotes,
        currentUserVote: value.currentUserVote,
      } satisfies Record<string, unknown>),
  );

  return {
    id: rawId,
    publishedSongId,
    sourceSongId,
    title: value.title,
    artist: value.artist,
    key: isNullableSongMeta(value.key) ? value.key : null,
    tuning: isNullableSongMeta(value.tuning) ? value.tuning : null,
    author,
    votes,
    publishedAt: value.publishedAt,
    updatedAt: value.updatedAt,
    status:
      typeof value.status === 'string'
        ? (value.status as PublishedSongStatusDto)
        : undefined,
    version: typeof value.version === 'number' ? value.version : null,
    ownershipStatus:
      typeof value.ownershipStatus === 'string' &&
      ownershipStatuses.includes(value.ownershipStatus as OwnershipStatusDto)
        ? (value.ownershipStatus as OwnershipStatusDto)
        : null,
  };
};

const toCommunitySongDetailDto = (value: unknown): CommunitySongDetailDto => {
  if (!isRecord(value)) {
    throw new Error('Invalid community song response payload.');
  }

  const chart = value.chart;

  if (!isSongChartDto(chart)) {
    throw new Error('Invalid community song response payload.');
  }

  const card = toCommunitySongCardDto(value);

  return {
    ...card,
    chart,
  };
};

const normalizeCommunitySongsSaved = (value: unknown): number => {
  if (!isRecord(value)) {
    return 0;
  }

  const saved = value.communitySongsSaved;

  if (typeof saved === 'number' && Number.isFinite(saved)) {
    return Math.max(0, Math.floor(saved));
  }

  return 0;
};

const toCommunitySavedSongDto = (value: unknown): CommunitySavedSongDto => {
  if (typeof value === 'string') {
    return { publishedSongId: value, communitySongsSaved: 0 };
  }

  if (!isRecord(value)) {
    throw new Error('Invalid community saved songs response payload.');
  }

  const publishedSongId =
    typeof value.publishedSongId === 'string'
      ? value.publishedSongId
      : typeof value.communitySongId === 'string'
        ? value.communitySongId
        : null;

  if (!publishedSongId) {
    throw new Error('Invalid community saved songs response payload.');
  }

  return {
    publishedSongId,
    communitySongsSaved: normalizeCommunitySongsSaved(value),
  };
};

const normalizeSongMetadataDto = (value: unknown): SongMetadataDto | null => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : '',
    artist: typeof value.artist === 'string' ? value.artist : '',
    key: typeof value.key === 'string' ? value.key : 'E',
    tuning: typeof value.tuning === 'string' ? value.tuning : 'EADG',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    stringCount: typeof value.stringCount === 'number' ? value.stringCount : 4,
    importedPublishedSongId:
      typeof value.importedPublishedSongId === 'string' ? value.importedPublishedSongId : null,
  };
};

export const parseSongMetadataListDto = (value: unknown): SongMetadataDto[] => {
  if (!Array.isArray(value)) {
    throw new Error('Invalid songs metadata response payload.');
  }

  const results: SongMetadataDto[] = [];
  for (const item of value) {
    const normalized = normalizeSongMetadataDto(item);
    if (normalized) {
      results.push(normalized);
    } else {
      console.warn('[BassTab] parseSongMetadataListDto: skipping invalid item', item);
    }
  }
  return results;
};

export const parseSongMetadataDto = (value: unknown): SongMetadataDto => {
  if (!isSongMetadataDto(value)) {
    throw new Error('Invalid song metadata response payload.');
  }

  return value;
};

export const parseSongChartDto = (value: unknown): SongChartDto => {
  if (!isSongChartDto(value)) {
    throw new Error('Invalid song chart response payload.');
  }

  return value;
};

const normalizeSongBar = (value: unknown): SongBar | null => {
  if (!isRecord(value) || !isRecord(value.cells)) {
    return null;
  }

  const cells: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(value.cells)) {
    cells[k] = isStringArray(v) ? v : [];
  }

  return {
    cells,
    ...(typeof value.note === 'string' ? { note: value.note } : {}),
    ...(typeof value.beatCount === 'number' ? { beatCount: value.beatCount } : {}),
  };
};

const normalizeSongRow = (value: unknown): SongRow | null => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const bars = Array.isArray(value.bars)
    ? (value.bars.map(normalizeSongBar).filter(Boolean) as SongBar[])
    : [];

  return {
    id: value.id,
    label: typeof value.label === 'string' ? value.label : '',
    beforeText: typeof value.beforeText === 'string' ? value.beforeText : '',
    afterText: typeof value.afterText === 'string' ? value.afterText : '',
    bars,
    ...(typeof value.defaultBeatCount === 'number' ? { defaultBeatCount: value.defaultBeatCount } : {}),
  };
};

export const parseSongDto = (value: unknown): SongDto => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    throw new Error('Invalid song response payload.');
  }

  const chart = value.chart;
  if (!isRecord(chart)) {
    throw new Error('Invalid song response payload.');
  }

  const stringNames = isStringArray(chart.stringNames) ? chart.stringNames : [];
  const rows = Array.isArray(chart.rows)
    ? (chart.rows.map(normalizeSongRow).filter(Boolean) as SongRow[])
    : [];
  const resolvedStringCount =
    typeof value.stringCount === 'number'
      ? value.stringCount
      : stringNames.length || 4;

  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : '',
    artist: typeof value.artist === 'string' ? value.artist : '',
    key: typeof value.key === 'string' ? value.key : 'E',
    tuning: typeof value.tuning === 'string' ? value.tuning : 'EADG',
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    stringCount: resolvedStringCount,
    importedPublishedSongId:
      typeof value.importedPublishedSongId === 'string' ? value.importedPublishedSongId : null,
    chart: { stringNames, rows },
  };
};

export const parsePlaylistDto = (value: unknown): PlaylistDto => {
  if (!isPlaylistDto(value)) {
    throw new Error('Invalid playlist response payload.');
  }

  return value;
};

export const parseSubscriptionSnapshotDto = (value: unknown): SubscriptionSnapshotDto => {
  const snapshot = toSubscriptionSnapshotDto(value);
  if (!snapshot) {
    throw new Error('Invalid subscription snapshot response payload.');
  }

  return snapshot;
};

const isCheckoutSessionDto = (value: unknown): value is CheckoutSessionDto =>
  isRecord(value) &&
  typeof value.sessionId === 'string' &&
  typeof value.checkoutUrl === 'string';

const isBillingPortalSessionDto = (value: unknown): value is BillingPortalSessionDto =>
  isRecord(value) && typeof value.url === 'string';

export const parseSubscriptionUpgradeResponseDto = (
  value: unknown,
): SubscriptionUpgradeResponseDto => {
  if (!isRecord(value) || (value.mode !== 'MOCK' && value.mode !== 'STRIPE')) {
    throw new Error('Invalid subscription upgrade response payload.');
  }

  const snapshot =
    value.snapshot === null
      ? null
      : toSubscriptionSnapshotDto(value.snapshot);
  if (value.snapshot !== null && !snapshot) {
    throw new Error('Invalid subscription upgrade response payload.');
  }
  if (value.checkoutSession !== undefined && !isCheckoutSessionDto(value.checkoutSession)) {
    throw new Error('Invalid subscription upgrade response payload.');
  }

  return {
    mode: value.mode,
    snapshot,
    checkoutSession: value.checkoutSession as CheckoutSessionDto | undefined,
  };
};

export const parseSubscriptionCancelResponseDto = (
  value: unknown,
): SubscriptionCancelResponseDto => {
  if (!isRecord(value)) {
    throw new Error('Invalid subscription cancellation response payload.');
  }

  const snapshot = toSubscriptionSnapshotDto(value.snapshot);
  if (!snapshot) {
    throw new Error('Invalid subscription cancellation response payload.');
  }

  return { snapshot };
};

export const parseBillingPortalSessionDto = (
  value: unknown,
): BillingPortalSessionDto => {
  if (!isBillingPortalSessionDto(value)) {
    throw new Error('Invalid billing portal response payload.');
  }

  return value;
};

const isBillingCurrencyDto = (value: unknown): value is BillingCurrencyDto =>
  typeof value === 'string' && billingCurrencies.includes(value as BillingCurrencyDto);

const parseSubscriptionPriceDto = (value: unknown): SubscriptionPriceDto => {
  if (!isRecord(value)) {
    throw new Error('Invalid subscription pricing response payload.');
  }

  const currency = value.currency;
  const amount = value.unitAmountMinor;

  if (!isBillingCurrencyDto(currency) || typeof amount !== 'number') {
    throw new Error('Invalid subscription pricing response payload.');
  }

  return {
    currency,
    unitAmountMinor: amount,
  };
};

const parseSubscriptionPlanDto = (value: unknown): SubscriptionPlanDto => {
  if (!isRecord(value)) {
    throw new Error('Invalid subscription pricing response payload.');
  }

  if (
    typeof value.code !== 'string' ||
    typeof value.displayName !== 'string' ||
    typeof value.billingInterval !== 'string' ||
    !Array.isArray(value.prices)
  ) {
    throw new Error('Invalid subscription pricing response payload.');
  }

  return {
    code: value.code,
    displayName: value.displayName,
    billingInterval: value.billingInterval,
    prices: value.prices.map(parseSubscriptionPriceDto),
  };
};

export const parseSubscriptionPricingDto = (value: unknown): SubscriptionPricingDto => {
  if (!isRecord(value)) {
    throw new Error('Invalid subscription pricing response payload.');
  }

  const plansValue = value.plans;

  if (!Array.isArray(plansValue)) {
    console.warn('Unexpected subscription pricing payload', value);
    throw new Error('Invalid subscription pricing response payload.');
  }

  return {
    plans: plansValue.map(parseSubscriptionPlanDto),
  };
};

export const parseCommunitySongCardListDto = (value: unknown): CommunitySongCardDto[] => {
  if (!Array.isArray(value)) {
    throw new Error('Invalid community catalog response payload.');
  }

  return value.map(toCommunitySongCardDto);
};

export const parseCommunitySongCardDto = (value: unknown): CommunitySongCardDto =>
  toCommunitySongCardDto(value);

export const parseCommunitySongDetailDto = (value: unknown): CommunitySongDetailDto => {
  return toCommunitySongDetailDto(value);
};

export const parseCommunitySavedSongsDto = (value: unknown): CommunitySavedSongDto[] => {
  if (Array.isArray(value)) {
    return value.map(toCommunitySavedSongDto);
  }

  throw new Error('Invalid community saved songs response payload.');
};

export const parseCommunitySongVotesDto = (value: unknown): CommunitySongVotesDto => {
  return toCommunitySongVotesDto(value);
};

// ---------------------------------------------------------------------------
// Email change
// ---------------------------------------------------------------------------

export interface EmailChangeStartResponse {
  status: 'EMAIL_SENT';
  maskedEmail: string;
  nextAllowedResendAt: string;
}

export interface EmailChangeVerifyResponse {
  email: string;
}

export const parseEmailChangeStartResponse = (value: unknown): EmailChangeStartResponse => {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  const maskedEmail = typeof record?.maskedEmail === 'string' ? record.maskedEmail : '';
  const nextAllowedResendAt = typeof record?.nextAllowedResendAt === 'string' ? record.nextAllowedResendAt : new Date(Date.now() + 60_000).toISOString();

  return { status: 'EMAIL_SENT', maskedEmail, nextAllowedResendAt };
};

export const parseEmailChangeVerifyResponse = (value: unknown): EmailChangeVerifyResponse => {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  const email = typeof record?.email === 'string' ? record.email : null;

  if (!email) {
    throw new Error('Invalid email change verify response: missing email.');
  }

  return { email };
};
