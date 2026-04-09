import { BassTabApiError } from '../../api';
import { UpgradeTrigger } from './subscriptionTypes';

export interface UpgradePromptContent {
  title: string;
  valueStatement: string;
  triggerMessage: string;
  features: string[];
}

const proBenefits = [
  'Unlimited songs',
  'Unlimited setlists',
  'Performance Mode (SVG)',
  '5 & 6-string support',
  'Community access',
  'Support from creators',
];

export const upgradePromptContent: Record<UpgradeTrigger, UpgradePromptContent> = {
  SONG_LIMIT: {
    title: 'Unlock Performance Mode',
    valueStatement: 'Keep your full songbook stage-ready.',
    triggerMessage: 'You’ve reached 10 songs. Upgrade to keep building your library.',
    features: proBenefits,
  },
  SETLIST_LIMIT: {
    title: 'Play Without Setlist Limits',
    valueStatement: 'Build separate running orders for every show.',
    triggerMessage: 'Upgrade to create unlimited setlists for gigs and rehearsals.',
    features: proBenefits,
  },
  SVG_MODE: {
    title: 'Unlock Performance Mode',
    valueStatement: 'Read cleaner tabs when the stage lights are low.',
    triggerMessage: 'Performance Mode gives you clean, stage-ready tabs.',
    features: proBenefits,
  },
  COMMUNITY_SAVE: {
    title: 'Unlock More Community Tracks',
    valueStatement: 'Keep every useful chart you find.',
    triggerMessage: 'Unlock full access to community tabs.',
    features: proBenefits,
  },
  PDF_EXPORT: {
    title: 'Unlock Offline Export',
    valueStatement: 'Take clean charts to gigs without internet.',
    triggerMessage: 'No Internet at GIG - then export your tabs to your device.',
    features: proBenefits,
  },
  STRING_LIMIT: {
    title: 'Unlock Five-String Power',
    valueStatement: 'Play every string count on stage-ready tabs.',
    triggerMessage: 'Stage-ready strings beyond four require BassTab Pro.',
    features: proBenefits,
  },
  AI_GENERATE: {
    title: 'Unlock Unlimited AI Generation',
    valueStatement: 'Let AI draft a bass tab so you can focus on playing.',
    triggerMessage: "You've used your free AI generations. Upgrade for unlimited access.",
    features: proBenefits,
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
  STRING_LIMIT: 'STRING_LIMIT',
  AI_GENERATE_LOCKED: 'AI_GENERATE',
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
