import { DEFAULT_SUBSCRIPTION_CAPABILITIES } from '../constants/subscription';
import { appLog } from '../utils/logging';

export interface SongChartCellDto {
  text: string;
  segments: string[];
}

export interface SongChartEventDto {
  id: string;
  order: number;
  timingText: string | null;
  beatStart: number | null;
  beatEnd: number | null;
  pulseLabels: string[];
  cells: Record<string, SongChartCellDto[]>;
}

export interface SongChartBarDto {
  id: string;
  note: string | null;
  events: SongChartEventDto[];
}

export interface SongChartRowDto {
  id: string;
  label: string | null;
  beforeText: string | null;
  afterText: string | null;
  bars: SongChartBarDto[];
}

export interface SongMetadataDto {
  id: string;
  title: string;
  artist: string;
  authorComment?: string | null;
  key: string | null;
  tuning: string | null;
  updatedAt: string;
  stringCount: number;
  importedPublishedSongId?: string | null;
}

export interface SongChartDto {
  schemaVersion: 2;
  stringNames: string[];
  rows: SongChartRowDto[];
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
  authorComment?: string | null;
  key?: string | null;
  tuning?: string | null;
  chart: SongChartDto;
  stringCount?: number;
}

export interface UpdateSongMetadataRequestDto {
  title?: string;
  artist?: string;
  authorComment?: string | null;
  key?: string | null;
  tuning?: string | null;
  stringCount?: number;
}

export interface ReplaceSongChartRequestDto {
  chart: SongChartDto;
}

export interface AiGenerateSongRequestDto {
  artist: string;
  title: string;
  influenceLine?: string;
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
  communitySongsRemaining: number;
  communitySongsSavedTotal: number;
}

export interface SubscriptionCommunityUsageDto {
  maxCommunitySaves: number;
  communitySongsSaved: number;
  communitySongsRemaining: number;
  communitySongsSavedTotal: number;
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
  authorComment?: string | null;
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

export type DeleteSongWithPolicyIntentDto = 'removeFromCommunity' | 'orphanAlways';

export interface DeleteSongWithPolicyRequestDto {
  intent: DeleteSongWithPolicyIntentDto;
}

export type DeleteSongWithPolicyCommunityActionDto = 'UNLISTED' | 'DISOWNED' | 'NONE';

export interface DeleteSongWithPolicyResponseDto {
  songId: string;
  publishedSongId: string | null;
  communityAction: DeleteSongWithPolicyCommunityActionDto;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isSongChartCellDto = (value: unknown): value is SongChartCellDto =>
  isRecord(value) &&
  typeof value.text === 'string' &&
  isStringArray(value.segments);

const isSongChartEventDto = (value: unknown): value is SongChartEventDto => {
  if (!isRecord(value) || !Array.isArray(value.pulseLabels) || !isRecord(value.cells)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.order === 'number' &&
    (typeof value.timingText === 'string' || value.timingText === null) &&
    (typeof value.beatStart === 'number' || value.beatStart === null) &&
    (typeof value.beatEnd === 'number' || value.beatEnd === null) &&
    value.pulseLabels.every((label) => typeof label === 'string') &&
    Object.values(value.cells).every(
      (entry) => Array.isArray(entry) && entry.every((cell) => isSongChartCellDto(cell)),
    )
  );
};

const isSongChartBarDto = (value: unknown): value is SongChartBarDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    (typeof value.note === 'string' || value.note === null || typeof value.note === 'undefined') &&
    Array.isArray(value.events) &&
    value.events.every((event) => isSongChartEventDto(event))
  );
};

const isSongChartRowDto = (value: unknown): value is SongChartRowDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    (typeof value.label === 'string' || value.label === null || typeof value.label === 'undefined') &&
    (typeof value.beforeText === 'string' || value.beforeText === null || typeof value.beforeText === 'undefined') &&
    (typeof value.afterText === 'string' || value.afterText === null || typeof value.afterText === 'undefined') &&
    Array.isArray(value.bars) &&
    value.bars.every((bar) => isSongChartBarDto(bar))
  );
};

const isSongChartDto = (value: unknown): value is SongChartDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.schemaVersion === 2 &&
    isStringArray(value.stringNames) &&
    Array.isArray(value.rows) &&
    value.rows.every((row) => isSongChartRowDto(row))
  );
};

const isSongMetadataDto = (value: unknown): value is SongMetadataDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.artist === 'string' &&
    (typeof value.authorComment === 'undefined' || isNullableString(value.authorComment)) &&
    isNullableString(value.key) &&
    isNullableString(value.tuning) &&
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

const UNLIMITED_SENTINEL = 2147483647;

const coerceNullableNumber = (value: unknown, fallback: number | null): number | null => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fallback;
    return value === UNLIMITED_SENTINEL ? null : value;
  }

  return value === null ? null : fallback;
};

const coerceNullableString = (value: unknown, fallback: string | null): string | null => {
  if (typeof value === 'string') {
    return value;
  }

  return value === null ? null : fallback;
};

const coerceAliasedValue = (record: Record<string, unknown>, aliases: string[]): unknown => {
  for (const alias of aliases) {
    if (alias in record) {
      return record[alias];
    }
  }

  return undefined;
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

  const maxSongs = coerceAliasedValue(value, ['maxSongs', 'max_songs']);
  const maxSetlists = coerceAliasedValue(value, ['maxSetlists', 'max_setlists']);
  const maxCommunitySongs = coerceAliasedValue(value, ['maxCommunitySongs', 'max_community_songs']);
  const maxCommunitySaves = coerceAliasedValue(value, ['maxCommunitySaves', 'max_community_saves']);
  const maxStringCount = coerceAliasedValue(value, ['maxStringCount', 'max_string_count']);
  const svgEnabled = coerceAliasedValue(value, ['svgEnabled', 'svg_enabled']);
  const maxAiGenerations = coerceAliasedValue(value, ['maxAiGenerations', 'max_ai_generations']);
  const maxDailyAiGenerations = coerceAliasedValue(value, [
    'maxDailyAiGenerations',
    'max_daily_ai_generations',
  ]);

  return {
    maxSongs: coerceNullableNumber(maxSongs, defaultSubscriptionCapabilitiesDto.maxSongs),
    maxSetlists: coerceNullableNumber(maxSetlists, defaultSubscriptionCapabilitiesDto.maxSetlists),
    maxCommunitySongs: coerceNullableNumber(
      maxCommunitySongs,
      defaultSubscriptionCapabilitiesDto.maxCommunitySongs,
    ),
    maxCommunitySaves: coerceNullableNumber(
      maxCommunitySaves,
      defaultSubscriptionCapabilitiesDto.maxCommunitySaves,
    ),
    maxStringCount: coerceNullableNumber(
      maxStringCount,
      defaultSubscriptionCapabilitiesDto.maxStringCount,
    ),
    svgEnabled:
      typeof svgEnabled === 'boolean'
        ? svgEnabled
        : defaultSubscriptionCapabilitiesDto.svgEnabled,
    maxAiGenerations: coerceNullableNumber(
      maxAiGenerations,
      defaultSubscriptionCapabilitiesDto.maxAiGenerations ?? null,
    ),
    maxDailyAiGenerations: coerceNullableNumber(
      maxDailyAiGenerations,
      defaultSubscriptionCapabilitiesDto.maxDailyAiGenerations ?? null,
    ),
  };
};

const toSubscriptionSnapshotDto = (value: unknown): SubscriptionSnapshotDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  const tierRaw = coerceAliasedValue(value, ['tier', 'subscriptionTier', 'subscription_tier']);
  const statusRaw = coerceAliasedValue(value, ['status', 'subscriptionStatus', 'subscription_status']);
  const planRaw = coerceAliasedValue(value, ['plan', 'subscriptionPlan', 'subscription_plan']);
  const planCodeRaw = coerceAliasedValue(value, ['planCode', 'plan_code']);
  const currencyRaw = coerceAliasedValue(value, ['currency']);
  const unitAmountMinorRaw = coerceAliasedValue(value, ['unitAmountMinor', 'unit_amount_minor']);
  const currentPeriodStartRaw = coerceAliasedValue(value, ['currentPeriodStart', 'current_period_start']);
  const currentPeriodEndRaw = coerceAliasedValue(value, ['currentPeriodEnd', 'current_period_end']);
  const trialEndRaw = coerceAliasedValue(value, ['trialEnd', 'trial_end']);
  const cancelAtPeriodEndRaw = coerceAliasedValue(value, ['cancelAtPeriodEnd', 'cancel_at_period_end']);
  const capabilitiesRaw = coerceAliasedValue(value, ['capabilities', 'subscriptionCapabilities', 'subscription_capabilities']);
  const communitySongsSavedRaw = coerceAliasedValue(value, ['communitySongsSaved', 'community_songs_saved']);
  const communitySongsRemainingRaw = coerceAliasedValue(value, [
    'communitySongsRemaining',
    'community_songs_remaining',
  ]);
  const communitySongsSavedTotalRaw = coerceAliasedValue(value, [
    'communitySongsSavedTotal',
    'community_songs_saved_total',
  ]);

  const tier = normalizeSubscriptionTier(tierRaw, planRaw);
  const status = normalizeSubscriptionStatus(statusRaw) ?? 'free';
  const plan = normalizeSubscriptionPlan(planRaw, tier);
  const capabilities = toSubscriptionCapabilitiesDto(capabilitiesRaw);
  const communitySongsSaved =
    typeof communitySongsSavedRaw === 'number' && Number.isFinite(communitySongsSavedRaw)
      ? Math.max(0, Math.floor(communitySongsSavedRaw))
      : 0;
  const maxCommunitySaves = capabilities.maxCommunitySaves;
  const communitySongsRemaining =
    typeof communitySongsRemainingRaw === 'number' && Number.isFinite(communitySongsRemainingRaw)
      ? Math.max(0, Math.floor(communitySongsRemainingRaw))
      : typeof maxCommunitySaves === 'number' && Number.isFinite(maxCommunitySaves)
        ? Math.max(0, Math.floor(maxCommunitySaves) - communitySongsSaved)
        : 0;
  const communitySongsSavedTotal =
    typeof communitySongsSavedTotalRaw === 'number' && Number.isFinite(communitySongsSavedTotalRaw)
      ? Math.max(0, Math.floor(communitySongsSavedTotalRaw))
      : communitySongsSaved;

  return {
    tier,
    status,
    plan,
    planCode: coerceNullableString(planCodeRaw, null),
    currency: isNullableCurrency(currencyRaw) ? currencyRaw : null,
    unitAmountMinor: coerceNullableNumber(unitAmountMinorRaw, null),
    currentPeriodStart: coerceNullableString(currentPeriodStartRaw, null),
    currentPeriodEnd: coerceNullableString(currentPeriodEndRaw, null),
    trialEnd: coerceNullableString(trialEndRaw, null),
    cancelAtPeriodEnd: typeof cancelAtPeriodEndRaw === 'boolean' ? cancelAtPeriodEndRaw : false,
    capabilities,
    communitySongsSaved,
    communitySongsRemaining,
    communitySongsSavedTotal,
  };
};

const toSubscriptionCommunityUsageDto = (value: unknown): SubscriptionCommunityUsageDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  const maxCommunitySavesRaw = coerceAliasedValue(value, ['maxCommunitySaves', 'max_community_saves']);
  const communitySongsSavedRaw = coerceAliasedValue(value, ['communitySongsSaved', 'community_songs_saved']);
  const communitySongsRemainingRaw = coerceAliasedValue(value, [
    'communitySongsRemaining',
    'community_songs_remaining',
  ]);
  const communitySongsSavedTotalRaw = coerceAliasedValue(value, [
    'communitySongsSavedTotal',
    'community_songs_saved_total',
  ]);

  if (
    typeof maxCommunitySavesRaw !== 'number' ||
    !Number.isFinite(maxCommunitySavesRaw) ||
    typeof communitySongsSavedRaw !== 'number' ||
    !Number.isFinite(communitySongsSavedRaw) ||
    typeof communitySongsRemainingRaw !== 'number' ||
    !Number.isFinite(communitySongsRemainingRaw) ||
    typeof communitySongsSavedTotalRaw !== 'number' ||
    !Number.isFinite(communitySongsSavedTotalRaw)
  ) {
    return null;
  }

  return {
    maxCommunitySaves: Math.max(0, Math.floor(maxCommunitySavesRaw)),
    communitySongsSaved: Math.max(0, Math.floor(communitySongsSavedRaw)),
    communitySongsRemaining: Math.max(0, Math.floor(communitySongsRemainingRaw)),
    communitySongsSavedTotal: Math.max(0, Math.floor(communitySongsSavedTotalRaw)),
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
    (typeof value.authorComment !== 'undefined' && !isNullableString(value.authorComment)) ||
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
    authorComment: isNullableString(value.authorComment) ? value.authorComment : null,
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

  const chart = normalizeSongChartDto(value.chart);
  if (!chart) {
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
    authorComment: isNullableString(value.authorComment) ? value.authorComment : null,
    key: isNullableString(value.key) ? value.key : null,
    tuning: isNullableString(value.tuning) ? value.tuning : null,
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
      appLog.warn('[BassTab] parseSongMetadataListDto: skipping invalid item', item);
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
  const chart = normalizeSongChartDto(value);

  if (!chart) {
    throw new Error('Invalid song chart response payload.');
  }

  return chart;
};

const normalizeSongChartCellDto = (value: unknown): SongChartCellDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  return {
    text: typeof value.text === 'string' ? value.text : '',
    segments: isStringArray(value.segments) ? value.segments : [],
  };
};

const normalizeSongChartEventDto = (
  value: unknown,
  stringNames: string[],
): SongChartEventDto | null => {
  if (!isRecord(value) || !isRecord(value.cells)) {
    return null;
  }

  if (typeof value.id !== 'string' || typeof value.order !== 'number' || !isStringArray(value.pulseLabels)) {
    return null;
  }

  const cellKeys = Object.keys(value.cells);
  const expectedKeys = [...stringNames].sort();
  if (cellKeys.sort().join('||') !== expectedKeys.sort().join('||')) {
    return null;
  }

  const pulseLabels = value.pulseLabels;
  const cells: Record<string, SongChartCellDto[]> = {};
  for (const stringName of stringNames) {
    const entry = value.cells[stringName];
    const normalizedCells = Array.isArray(entry)
      ? entry
        .map((cell) => normalizeSongChartCellDto(cell))
        .filter(Boolean) as SongChartCellDto[]
      : [];

    if (normalizedCells.some((cell) => cell.segments.length !== pulseLabels.length)) {
      return null;
    }

    cells[stringName] = normalizedCells;
  }

  return {
    id: value.id,
    order: value.order,
    timingText: isNullableString(value.timingText) ? value.timingText : null,
    beatStart: typeof value.beatStart === 'number' ? value.beatStart : null,
    beatEnd: typeof value.beatEnd === 'number' ? value.beatEnd : null,
    pulseLabels,
    cells,
  };
};

const normalizeSongChartBarDto = (
  value: unknown,
  stringNames: string[],
): SongChartBarDto | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== 'string' || !Array.isArray(value.events)) {
    return null;
  }

  return {
    id: value.id,
    note: isNullableString(value.note) ? value.note : null,
    events: value.events
      .map((event) => normalizeSongChartEventDto(event, stringNames))
      .filter(Boolean) as SongChartEventDto[],
  };
};

const normalizeSongChartRowDto = (
  value: unknown,
  stringNames: string[],
): SongChartRowDto | null => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const bars = Array.isArray(value.bars)
    ? (value.bars.map((bar) => normalizeSongChartBarDto(bar, stringNames)).filter(Boolean) as SongChartBarDto[])
    : [];

  return {
    id: value.id,
    label: isNullableString(value.label) ? value.label : null,
    beforeText: isNullableString(value.beforeText) ? value.beforeText : null,
    afterText: isNullableString(value.afterText) ? value.afterText : null,
    bars,
  };
};

const normalizeSongChartDto = (value: unknown): SongChartDto | null => {
  if (!isRecord(value) || value.schemaVersion !== 2 || !isStringArray(value.stringNames)) {
    return null;
  }
  const stringNames = value.stringNames;

  const rows = Array.isArray(value.rows)
    ? (value.rows.map((row) => normalizeSongChartRowDto(row, stringNames)).filter(Boolean) as SongChartRowDto[])
    : [];

  if (Array.isArray(value.rows) && rows.length !== value.rows.length) {
    return null;
  }

  return {
    schemaVersion: 2,
    stringNames,
    rows,
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

  const normalizedChart = normalizeSongChartDto(chart);
  if (!normalizedChart) {
    throw new Error('Invalid song response payload.');
  }
  const resolvedStringCount =
    typeof value.stringCount === 'number'
      ? value.stringCount
      : normalizedChart.stringNames.length || 4;

  return {
    id: value.id,
    title: typeof value.title === 'string' ? value.title : '',
    artist: typeof value.artist === 'string' ? value.artist : '',
    authorComment: isNullableString(value.authorComment) ? value.authorComment : null,
    key: isNullableString(value.key) ? value.key : null,
    tuning: isNullableString(value.tuning) ? value.tuning : null,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    stringCount: resolvedStringCount,
    importedPublishedSongId:
      typeof value.importedPublishedSongId === 'string' ? value.importedPublishedSongId : null,
    chart: normalizedChart,
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

export const parseSubscriptionCommunityUsageDto = (value: unknown): SubscriptionCommunityUsageDto => {
  const usage = toSubscriptionCommunityUsageDto(value);
  if (!usage) {
    throw new Error('Invalid subscription community usage response payload.');
  }

  return usage;
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
    appLog.warn('Unexpected subscription pricing payload', value);
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

export const parseDeleteSongWithPolicyResponseDto = (value: unknown): DeleteSongWithPolicyResponseDto => {
  if (!isRecord(value) || typeof value.songId !== 'string') {
    throw new Error('Invalid delete-with-policy response payload.');
  }

  const publishedSongId =
    typeof value.publishedSongId === 'string'
      ? value.publishedSongId
      : value.publishedSongId === null
        ? null
        : null;
  const communityActionRaw =
    typeof value.communityAction === 'string'
      ? value.communityAction
      : 'NONE';
  const communityAction =
    communityActionRaw === 'UNLISTED' || communityActionRaw === 'DISOWNED' || communityActionRaw === 'NONE'
      ? communityActionRaw
      : 'NONE';

  return {
    songId: value.songId,
    publishedSongId,
    communityAction,
  };
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
