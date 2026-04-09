import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';

import { useAuth } from '../auth/state/useAuth';
import { mapSnapshotDto, subscriptionService } from './subscriptionService';
import {
  BillingCurrency,
  SubscriptionCapabilityDefaults,
  SubscriptionCapabilities,
  SubscriptionPricing,
  SubscriptionSnapshot,
  SubscriptionStatus,
  SubscriptionTier,
} from './subscriptionTypes';

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  capabilities: SubscriptionCapabilities;
  pricing: SubscriptionPricing;
  priceLabel: string;
  upgrade: () => Promise<void>;
  refresh: () => Promise<void>;
  communitySongsSaved: number;
  setCommunitySongsSaved: (value: number) => void;
  capabilityDefaults: SubscriptionCapabilityDefaults | null;
  capabilityDefaultsLoaded: boolean;
  isLoading: boolean;
  finalizingUpgrade: boolean;
  finalizingError: string | null;
  startFinalizingPoll: () => void;
}

const defaultCapabilities: SubscriptionCapabilities = {
  maxSongs: 10,
  maxSetlists: 1,
  maxCommunitySongs: 2,
  maxCommunitySaves: 2,
  maxStringCount: 4,
  svgEnabled: false,
};

const defaultCapabilityDefaults: SubscriptionCapabilityDefaults = {
  free: defaultCapabilities,
  pro: {
    ...defaultCapabilities,
    maxStringCount: null,
  },
};

const defaultPricing: SubscriptionPricing = {
  plans: [
    {
      plan: 'PRO_MONTHLY',
      label: 'BassTab Pro',
      interval: 'MONTHLY',
      prices: [{ currency: 'GBP', unitAmountMinor: 499 }],
    },
  ],
};

const serializePricing = (pricing: SubscriptionPricing) =>
  pricing.plans
    .map(
      (plan) =>
        `${plan.plan}|${plan.label}|${plan.interval}|${plan.prices
          .map((price) => `${price.currency}${price.unitAmountMinor}`)
          .join(',')}`,
    )
    .join(';');

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

const formatMinorCurrency = (amountMinor: number, currency: BillingCurrency): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch (_error) {
    return `£${(amountMinor / 100).toFixed(2)}`;
  }
};

const pickDisplayedPrice = (
  snapshot: SubscriptionSnapshot | null,
  pricing: SubscriptionPricing,
): { currency: BillingCurrency; unitAmountMinor: number } => {
  const monthlyPlan = pricing.plans.find((plan) => plan.plan === 'PRO_MONTHLY') ?? pricing.plans[0];
  const preferredCurrency = snapshot?.currency ?? 'GBP';
  const preferredPrice = monthlyPlan?.prices.find((price) => price.currency === preferredCurrency);
  const fallbackPrice = monthlyPlan?.prices[0];

  if (preferredPrice) {
    return preferredPrice;
  }

  if (fallbackPrice) {
    return fallbackPrice;
  }

  return { currency: 'GBP', unitAmountMinor: 499 };
};

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { authState } = useAuth();
  const isAuthenticated = authState.type === 'AUTHENTICATED';
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
  const [pricing, setPricing] = useState<SubscriptionPricing>(defaultPricing);
  const [capabilityDefaults, setCapabilityDefaults] = useState<SubscriptionCapabilityDefaults | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [finalizingUpgrade, setFinalizingUpgrade] = useState(false);
  const [finalizingError, setFinalizingError] = useState<string | null>(null);
  const pricingFingerprintRef = useRef(serializePricing(defaultPricing));
  const finalizeCancelRef = useRef<() => void>(() => {});

  const updatePricingIfChanged = useCallback((nextPricing: SubscriptionPricing) => {
    const fingerprint = serializePricing(nextPricing);

    if (pricingFingerprintRef.current === fingerprint) {
      return;
    }

    pricingFingerprintRef.current = fingerprint;
    setPricing(nextPricing);
  }, []);

  const cancelFinalizingPoll = useCallback(() => {
    finalizeCancelRef.current();
    finalizeCancelRef.current = () => {};
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setSnapshot(null);
      return;
    }

    const nextSnapshot = await subscriptionService.loadSnapshot();

    try {
      const nextPricing = await subscriptionService.loadPricing();
      updatePricingIfChanged(nextPricing);
    } catch (error) {
      console.warn('Subscription pricing refresh failed', error);
    }

    setSnapshot(nextSnapshot);
    console.info(
      'Subscription snapshot',
      nextSnapshot.communitySongsSaved,
      nextSnapshot.capabilities,
    );
  }, [isAuthenticated, updatePricingIfChanged]);

  const setCommunitySongsSaved = useCallback((value: number) => {
    setSnapshot((current) => {
      if (!current) {
        return current;
      }

      console.info('Set communitySongsSaved', value);
      return { ...current, communitySongsSaved: value };
    });
  }, []);

  useEffect(() => {
    if (authState.type === 'RESTORING_SESSION') {
      return;
    }

    if (authState.type !== 'AUTHENTICATED') {
      cancelFinalizingPoll();
      setFinalizingUpgrade(false);
      setFinalizingError(null);
      setSnapshot(null);
      return;
    }

    void refresh().catch((error) => {
      console.warn('Subscription refresh failed after auth change', error);
    });
  }, [authState.type, cancelFinalizingPoll, refresh]);

  useEffect(() => {
    void subscriptionService
      .loadCapabilityDefaults()
      .then(setCapabilityDefaults)
      .catch((error) => {
        console.warn('Subscription capability defaults refresh failed', error);
      });
  }, []);

  const startFinalizingPoll = useCallback(() => {
    cancelFinalizingPoll();
    setFinalizingUpgrade(true);
    setFinalizingError(null);

    let cancelled = false;
    finalizeCancelRef.current = () => {
      cancelled = true;
    };

    (async () => {
      const maxAttempts = 10;

      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt += 1) {
        try {
          const nextSnapshot = await subscriptionService.loadSnapshot();
          setSnapshot(nextSnapshot);

          if (nextSnapshot.tier === 'PRO') {
            setFinalizingUpgrade(false);
            setFinalizingError(null);
            await refresh();
            return;
          }
        } catch (error) {
          console.warn('Finalizing upgrade poll failed', error);
        }

        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      if (!cancelled) {
        setFinalizingError('Waiting for Stripe is taking longer than expected.');
      }
    })();
  }, [cancelFinalizingPoll, refresh]);

  useEffect(() => {
    if (!isAuthenticated) {
      cancelFinalizingPoll();
      setFinalizingUpgrade(false);
      setFinalizingError(null);
      return;
    }

    const handleUrl = ({ url }: { url: string }) => {
      const parsed = ExpoLinking.parse(url);

      if (parsed.path?.startsWith('subscription/success')) {
        startFinalizingPoll();
      } else if (parsed.path?.startsWith('subscription/cancel')) {
        setFinalizingUpgrade(false);
        setFinalizingError('Stripe checkout was cancelled.');
        cancelFinalizingPoll();
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    void Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleUrl({ url: initialUrl });
      }
    });

    return () => {
      subscription.remove();
      cancelFinalizingPoll();
    };
  }, [cancelFinalizingPoll, isAuthenticated, startFinalizingPoll]);

  const upgrade = useCallback(async () => {
    const displayedPrice = pickDisplayedPrice(snapshot, pricing);
    console.info('[Subscription] upgrade handling', {
      tier: snapshot?.tier,
      status: snapshot?.status,
      price: displayedPrice,
    });

    setIsLoading(true);

    try {
      const response = await subscriptionService.upgradeToPro(displayedPrice.currency);
      console.info('[Subscription] upgrade response', {
        mode: response.mode,
        checkoutSession: response.checkoutSession?.checkoutUrl,
      });

      if (response.snapshot) {
        setSnapshot(mapSnapshotDto(response.snapshot));
      }

      if (response.mode === 'STRIPE') {
        startFinalizingPoll();
      }

      const checkoutUrl = response.mode === 'STRIPE' ? response.checkoutSession?.checkoutUrl : null;

      if (checkoutUrl) {
        if (typeof window !== 'undefined' && window.location) {
          window.location.href = checkoutUrl;
        } else {
          await Linking.openURL(checkoutUrl);
        }
      }

      await refresh();
    } catch (error) {
      console.error('[Subscription] upgrade failed', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [pricing, refresh, snapshot, startFinalizingPoll]);

  const displayedPrice = pickDisplayedPrice(snapshot, pricing);
  const priceLabel = formatMinorCurrency(displayedPrice.unitAmountMinor, displayedPrice.currency);

  const value = useMemo(
    () => ({
      tier: snapshot?.tier ?? 'FREE',
      status: snapshot?.status ?? 'free',
      currentPeriodEnd: snapshot?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: snapshot?.cancelAtPeriodEnd ?? false,
      capabilities: snapshot?.capabilities ?? defaultCapabilities,
      pricing,
      priceLabel,
      upgrade,
      refresh,
      communitySongsSaved: snapshot?.communitySongsSaved ?? 0,
      setCommunitySongsSaved,
      capabilityDefaults,
      capabilityDefaultsLoaded: capabilityDefaults !== null,
      isLoading,
      finalizingUpgrade,
      finalizingError,
      startFinalizingPoll,
    }),
    [
      isLoading,
      priceLabel,
      pricing,
      refresh,
      snapshot,
      upgrade,
      setCommunitySongsSaved,
      capabilityDefaults,
      finalizingUpgrade,
      finalizingError,
      startFinalizingPoll,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error('useSubscription must be used inside SubscriptionProvider.');
  }

  return context;
};
