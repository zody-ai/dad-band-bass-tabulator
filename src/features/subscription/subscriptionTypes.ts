export type SubscriptionTier = 'FREE' | 'PRO';
export type SubscriptionStatus = 'FREE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
export type BillingCurrency = 'GBP' | 'USD' | 'EUR';

export interface SubscriptionCapabilities {
  maxSongs: number | null;
  maxSetlists: number | null;
  maxCommunitySongs: number | null;
  svgEnabled: boolean;
}

export interface SubscriptionSnapshot {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  planCode: string | null;
  currency: BillingCurrency | null;
  unitAmountMinor: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  capabilities: SubscriptionCapabilities;
}

export interface SubscriptionPlanPrice {
  currency: BillingCurrency;
  unitAmountMinor: number;
}

export interface SubscriptionPlanPricing {
  plan: string;
  label: string;
  interval: string;
  prices: SubscriptionPlanPrice[];
}

export interface SubscriptionPricing {
  plans: SubscriptionPlanPricing[];
}

export type UpgradeTrigger = 'SONG_LIMIT' | 'SETLIST_LIMIT' | 'SVG_MODE' | 'COMMUNITY_SAVE' | 'PDF_EXPORT';
