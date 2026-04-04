import AsyncStorage from '@react-native-async-storage/async-storage';

import { BassTabApi, createBassTabApiFromEnv } from '../../api';
import {
  SubscriptionPricingDto,
  SubscriptionSnapshotDto,
} from '../../api/contracts';
import {
  BillingCurrency,
  SubscriptionPricing,
  SubscriptionSnapshot,
} from './subscriptionTypes';

const storageKeys = {
  tier: 'basstab:subscription-tier',
};

const defaultFreeSnapshot: SubscriptionSnapshot = {
  tier: 'FREE',
  status: 'FREE',
  planCode: null,
  currency: 'GBP',
  unitAmountMinor: 499,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  capabilities: {
    maxSongs: 10,
    maxSetlists: 1,
    maxCommunitySongs: 2,
    svgEnabled: false,
  },
};

const defaultPricing: SubscriptionPricing = {
  plans: [
    {
      plan: 'PRO_MONTHLY',
      label: 'BassTab Pro',
      interval: 'MONTHLY',
      prices: [
        { currency: 'GBP', unitAmountMinor: 499 },
        { currency: 'USD', unitAmountMinor: 499 },
        { currency: 'EUR', unitAmountMinor: 499 },
      ],
    },
  ],
};

const mapSnapshot = (snapshot: SubscriptionSnapshotDto): SubscriptionSnapshot => ({
  tier: snapshot.tier,
  status: snapshot.status,
  planCode: snapshot.planCode,
  currency: snapshot.currency,
  unitAmountMinor: snapshot.unitAmountMinor,
  currentPeriodStart: snapshot.currentPeriodStart,
  currentPeriodEnd: snapshot.currentPeriodEnd,
  trialEnd: snapshot.trialEnd,
  cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
  capabilities: {
    maxSongs: snapshot.capabilities.maxSongs,
    maxSetlists: snapshot.capabilities.maxSetlists,
    maxCommunitySongs: snapshot.capabilities.maxCommunitySongs,
    svgEnabled: snapshot.capabilities.svgEnabled,
  },
});

const mapPricing = (pricing: SubscriptionPricingDto): SubscriptionPricing => ({
  plans: pricing.plans.map((plan) => ({
    plan: plan.plan,
    label: plan.label,
    interval: plan.interval,
    prices: plan.prices.map((price) => ({
      currency: price.currency,
      unitAmountMinor: price.unitAmountMinor,
    })),
  })),
});

export interface SubscriptionService {
  loadSnapshot: () => Promise<SubscriptionSnapshot>;
  loadPricing: () => Promise<SubscriptionPricing>;
  upgradeToPro: (currency?: BillingCurrency) => Promise<SubscriptionSnapshot>;
}

class HybridSubscriptionService implements SubscriptionService {
  private readonly api: BassTabApi | null = createBassTabApiFromEnv();

  async loadSnapshot(): Promise<SubscriptionSnapshot> {
    if (this.api) {
      return mapSnapshot(await this.api.getSubscription());
    }

    try {
      const storedTier = await AsyncStorage.getItem(storageKeys.tier);

      if (storedTier === 'PRO') {
        return {
          ...defaultFreeSnapshot,
          tier: 'PRO',
          status: 'ACTIVE',
          planCode: 'PRO_MONTHLY',
          capabilities: {
            maxSongs: null,
            maxSetlists: null,
            maxCommunitySongs: null,
            svgEnabled: true,
          },
        };
      }
    } catch (error) {
      console.warn('Subscription tier hydrate failed', error);
    }

    return defaultFreeSnapshot;
  }

  async loadPricing(): Promise<SubscriptionPricing> {
    if (this.api) {
      return mapPricing(await this.api.getSubscriptionPricing());
    }

    return defaultPricing;
  }

  async upgradeToPro(currency: BillingCurrency = 'GBP'): Promise<SubscriptionSnapshot> {
    if (this.api) {
      const upgraded = await this.api.mockUpgrade({
        planCode: 'PRO_MONTHLY',
        currency,
      });

      return mapSnapshot(upgraded);
    }

    try {
      await AsyncStorage.setItem(storageKeys.tier, 'PRO');
    } catch (error) {
      console.warn('Subscription tier persist failed', error);
    }

    return {
      ...defaultFreeSnapshot,
      tier: 'PRO',
      status: 'ACTIVE',
      planCode: 'PRO_MONTHLY',
      currency,
      unitAmountMinor: 499,
      capabilities: {
        maxSongs: null,
        maxSetlists: null,
        maxCommunitySongs: null,
        svgEnabled: true,
      },
    };
  }
}

export const subscriptionService: SubscriptionService = new HybridSubscriptionService();
