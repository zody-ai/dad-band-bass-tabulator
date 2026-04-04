import { BassTabApiError } from '../../api';
import { UpgradeTrigger } from './subscriptionTypes';

export interface UpgradePromptContent {
  title: string;
  valueStatement: string;
  triggerMessage: string;
  features: string[];
}

export const upgradePromptContent: Record<UpgradeTrigger, UpgradePromptContent> = {
  SONG_LIMIT: {
    title: 'Unlock Performance Mode',
    valueStatement: 'Keep your full songbook stage-ready.',
    triggerMessage: 'You’ve reached 10 songs. Upgrade to keep building your library.',
    features: [
      'Unlimited songs for rehearsals and gigs',
      'Unlimited setlists for different nights',
      'Performance Mode with smooth SVG tabs',
      'Full access to community tabs',
    ],
  },
  SETLIST_LIMIT: {
    title: 'Play Without Setlist Limits',
    valueStatement: 'Build separate running orders for every show.',
    triggerMessage: 'Upgrade to create unlimited setlists for gigs and rehearsals.',
    features: [
      'Unlimited setlists',
      'Unlimited songs',
      'Performance Mode with stage-ready SVG tabs',
      'Unlimited community song saves',
    ],
  },
  SVG_MODE: {
    title: 'Unlock Performance Mode',
    valueStatement: 'Read cleaner tabs when the stage lights are low.',
    triggerMessage: 'Performance Mode gives you clean, stage-ready tabs.',
    features: [
      'Smooth, readable SVG tabs',
      'Unlimited songs and setlists',
      'Unlimited community song saves',
    ],
  },
  COMMUNITY_SAVE: {
    title: 'Unlock More Community Tracks',
    valueStatement: 'Keep every useful chart you find.',
    triggerMessage: 'Unlock full access to community tabs.',
    features: [
      'Unlimited community song saves',
      'Unlimited songs in your library',
      'Performance Mode with SVG tabs',
      'Unlimited setlists',
    ],
  },
  PDF_EXPORT: {
    title: 'Unlock Offline Export',
    valueStatement: 'Take clean charts to gigs without internet.',
    triggerMessage: 'No Internet at GIG - then export your tabs to your device.',
    features: [
      'Export song charts as PDF',
      'Export full setlists as multi-page PDF',
      'Keep offline backups ready before the gig',
      'Everything else in Pro',
    ],
  },
};

export class UpgradeGateError extends Error {
  readonly trigger: UpgradeTrigger;

  constructor(trigger: UpgradeTrigger, message: string) {
    super(message);
    this.name = 'UpgradeGateError';
    this.trigger = trigger;
  }
}

export const isUpgradeGateError = (value: unknown): value is UpgradeGateError =>
  value instanceof UpgradeGateError;

const backendCodeToTrigger: Record<string, UpgradeTrigger> = {
  SONG_LIMIT: 'SONG_LIMIT',
  SETLIST_LIMIT: 'SETLIST_LIMIT',
  SVG_LOCKED: 'SVG_MODE',
  PDF_LOCKED: 'PDF_EXPORT',
  COMMUNITY_LIMIT: 'COMMUNITY_SAVE',
};

export const resolveUpgradeTrigger = (error: unknown): UpgradeTrigger | null => {
  if (isUpgradeGateError(error)) {
    return error.trigger;
  }

  if (error instanceof BassTabApiError && error.errorType === 'SUBSCRIPTION_LIMIT' && error.code) {
    return backendCodeToTrigger[error.code] ?? null;
  }

  return null;
};
