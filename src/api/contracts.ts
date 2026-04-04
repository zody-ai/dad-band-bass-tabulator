import { SongBar, SongRow } from '../types/models';

export interface SongMetadataDto {
  id: string;
  title: string;
  artist: string;
  key: string;
  feelNote: string;
  tuning: string;
  updatedAt: string;
  releasedToCommunity?: boolean;
  communityReleasedAt?: string | null;
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
  feelNote: string;
  tuning: string;
  chart: SongChartDto;
}

export interface UpdateSongMetadataRequestDto {
  title?: string;
  artist?: string;
  key?: string;
  feelNote?: string;
  tuning?: string;
}

export interface ReplaceSongChartRequestDto {
  chart: SongChartDto;
}

export interface ReplacePlaylistOrderRequestDto {
  songIds: string[];
}

export type SubscriptionTierDto = 'FREE' | 'PRO';
export type SubscriptionStatusDto = 'FREE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
export type BillingCurrencyDto = 'GBP' | 'USD' | 'EUR';

export interface SubscriptionCapabilitiesDto {
  maxSongs: number | null;
  maxSetlists: number | null;
  maxCommunitySongs: number | null;
  svgEnabled: boolean;
}

export interface SubscriptionSnapshotDto {
  tier: SubscriptionTierDto;
  status: SubscriptionStatusDto;
  planCode: string | null;
  currency: BillingCurrencyDto | null;
  unitAmountMinor: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  capabilities: SubscriptionCapabilitiesDto;
}

export interface SubscriptionPriceDto {
  currency: BillingCurrencyDto;
  unitAmountMinor: number;
}

export interface SubscriptionPlanDto {
  plan: string;
  label: string;
  interval: string;
  prices: SubscriptionPriceDto[];
}

export interface SubscriptionPricingDto {
  plans: SubscriptionPlanDto[];
}

export interface MockUpgradeRequestDto {
  planCode: 'PRO_MONTHLY';
  currency: BillingCurrencyDto;
}

export interface CommunitySavedSongDto {
  communitySongId: string;
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

  const releasedToCommunity = value.releasedToCommunity;
  const communityReleasedAt = value.communityReleasedAt;

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.artist === 'string' &&
    typeof value.key === 'string' &&
    typeof value.feelNote === 'string' &&
    typeof value.tuning === 'string' &&
    typeof value.updatedAt === 'string' &&
    (typeof releasedToCommunity === 'undefined' || typeof releasedToCommunity === 'boolean') &&
    (typeof communityReleasedAt === 'undefined' ||
      typeof communityReleasedAt === 'string' ||
      communityReleasedAt === null)
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
const subscriptionStatuses: SubscriptionStatusDto[] = ['FREE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'];
const billingCurrencies: BillingCurrencyDto[] = ['GBP', 'USD', 'EUR'];

const isNullableString = (value: unknown): value is string | null =>
  typeof value === 'string' || value === null;

const isNullableNumber = (value: unknown): value is number | null =>
  typeof value === 'number' || value === null;

const isNullableCurrency = (value: unknown): value is BillingCurrencyDto | null =>
  value === null || billingCurrencies.includes(value as BillingCurrencyDto);

const isSubscriptionCapabilitiesDto = (value: unknown): value is SubscriptionCapabilitiesDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNullableNumber(value.maxSongs) &&
    isNullableNumber(value.maxSetlists) &&
    isNullableNumber(value.maxCommunitySongs) &&
    typeof value.svgEnabled === 'boolean'
  );
};

const isSubscriptionSnapshotDto = (value: unknown): value is SubscriptionSnapshotDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    subscriptionTiers.includes(value.tier as SubscriptionTierDto) &&
    subscriptionStatuses.includes(value.status as SubscriptionStatusDto) &&
    isNullableString(value.planCode) &&
    isNullableCurrency(value.currency) &&
    isNullableNumber(value.unitAmountMinor) &&
    isNullableString(value.currentPeriodStart) &&
    isNullableString(value.currentPeriodEnd) &&
    isNullableString(value.trialEnd) &&
    typeof value.cancelAtPeriodEnd === 'boolean' &&
    isSubscriptionCapabilitiesDto(value.capabilities)
  );
};

const isSubscriptionPriceDto = (value: unknown): value is SubscriptionPriceDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    billingCurrencies.includes(value.currency as BillingCurrencyDto) &&
    Number.isInteger(value.unitAmountMinor)
  );
};

const isSubscriptionPlanDto = (value: unknown): value is SubscriptionPlanDto => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.plan === 'string' &&
    typeof value.label === 'string' &&
    typeof value.interval === 'string' &&
    Array.isArray(value.prices) &&
    value.prices.every((price) => isSubscriptionPriceDto(price))
  );
};

const isSubscriptionPricingDto = (value: unknown): value is SubscriptionPricingDto => {
  if (!isRecord(value)) {
    return false;
  }

  return Array.isArray(value.plans) && value.plans.every((plan) => isSubscriptionPlanDto(plan));
};

const isCommunitySavedSongDto = (value: unknown): value is CommunitySavedSongDto => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.communitySongId === 'string';
};

export const parseSongMetadataListDto = (value: unknown): SongMetadataDto[] => {
  if (!Array.isArray(value) || !value.every((item) => isSongMetadataDto(item))) {
    throw new Error('Invalid songs metadata response payload.');
  }

  return value;
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

export const parseSongDto = (value: unknown): SongDto => {
  if (!isSongDto(value)) {
    throw new Error('Invalid song response payload.');
  }

  return value;
};

export const parsePlaylistDto = (value: unknown): PlaylistDto => {
  if (!isPlaylistDto(value)) {
    throw new Error('Invalid playlist response payload.');
  }

  return value;
};

export const parseSubscriptionSnapshotDto = (value: unknown): SubscriptionSnapshotDto => {
  if (!isSubscriptionSnapshotDto(value)) {
    throw new Error('Invalid subscription snapshot response payload.');
  }

  return value;
};

export const parseSubscriptionPricingDto = (value: unknown): SubscriptionPricingDto => {
  if (!isSubscriptionPricingDto(value)) {
    throw new Error('Invalid subscription pricing response payload.');
  }

  return value;
};

export const parseCommunitySavedSongsDto = (value: unknown): CommunitySavedSongDto[] => {
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value.map((communitySongId) => ({ communitySongId }));
  }

  if (Array.isArray(value) && value.every((item) => isCommunitySavedSongDto(item))) {
    return value;
  }

  throw new Error('Invalid community saved songs response payload.');
};
