import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Circle, Svg, Text as SvgText } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppSectionNav } from '../components/AppSectionNav';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { palette } from '../constants/colors';
import { brandDisplayFontFamily } from '../constants/typography';
import { BassTabApiError, createBassTabApiFromEnv } from '../api';
import { useAuth } from '../features/auth/state/useAuth';
import { avatarPresetValue, avatarPresets, findAvatarPreset } from '../features/auth/utils/avatarPresets';
import { isValidEmail } from '../features/auth/utils/email';
import { useSubscription } from '../features/subscription';
import { subscriptionService } from '../features/subscription/subscriptionService';
import { RootStackParamList } from '../navigation/types';
import { appLog } from '../utils/logging';

// ---------------------------------------------------------------------------
// Branding
// ---------------------------------------------------------------------------
const NAMEPLATE_BG = '#1a120a';
const NAMEPLATE_TEXT = '#f5e6c8';
const NAMEPLATE_MUTED = '#a8957e';
const NAMEPLATE_GOLD = '#c8a96e';

function DadBandBadge() {
  return (
    <Svg width={80} height={80} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="54" fill="none" stroke={NAMEPLATE_GOLD} strokeWidth={3} />
      <Circle cx="60" cy="60" r="44" fill="none" stroke={NAMEPLATE_GOLD} strokeWidth={2} strokeDasharray="4 3" />
      <SvgText x="60" y="65" textAnchor="middle" fontSize={18} fontWeight="bold" letterSpacing={2} fill={NAMEPLATE_TEXT} fontFamily="Arial">DAD BAND</SvgText>
      <SvgText x="60" y="24" textAnchor="middle" fontSize={8} letterSpacing={1.5} fill={NAMEPLATE_GOLD} fontFamily="Arial">ACCOUNT</SvgText>
      <SvgText x="60" y="108" textAnchor="middle" fontSize={7} letterSpacing={1.2} fill={NAMEPLATE_GOLD} fontFamily="Arial">FINE. BE PROFESSIONAL.</SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Cancel state machine
// ---------------------------------------------------------------------------
type CancelState = 'idle' | 'confirming' | 'submitting' | 'error';

const isCancellationApplied = (snapshot: {
  tier: 'FREE' | 'PRO';
  status: 'active' | 'cancellation_scheduled' | 'cancelled' | 'expired' | 'free' | 'incomplete';
  cancelAtPeriodEnd: boolean;
}): boolean =>
  snapshot.cancelAtPeriodEnd ||
  snapshot.status === 'cancellation_scheduled' ||
  snapshot.status === 'cancelled' ||
  snapshot.status === 'expired' ||
  snapshot.status === 'free' ||
  snapshot.tier === 'FREE';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

export function AccountScreen({ navigation }: Props) {
  const { authState, loadingAction, updateLocalProfile } = useAuth();
  const { tier, status, currentPeriodEnd, cancelAtPeriodEnd, refresh, priceLabel } = useSubscription();
  const api = useMemo(() => createBassTabApiFromEnv(), []);

  // Profile state
  const signedInUser = authState.type === 'AUTHENTICATED' ? authState.user : null;
  const signedInUserId = signedInUser?.userId ?? null;
  const signedInEmail = signedInUser?.email ?? '';
  const currentAvatarUrl = signedInUser?.avatarUrl ?? '';
  const avatarInitial = (signedInUserId ?? 'b').slice(0, 1).toUpperCase();

  const [emailDraft, setEmailDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  // Email change flow
  type EmailChangeStep = 'idle' | 'pending';
  const [emailChangeStep, setEmailChangeStep] = useState<EmailChangeStep>('idle');
  const [emailChangeLoading, setEmailChangeLoading] = useState<'start' | 'verify' | null>(null);
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [nextResendAt, setNextResendAt] = useState<Date | null>(null);
  const [emailChangeCode, setEmailChangeCode] = useState('');
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);

  const canResend = !nextResendAt || Date.now() >= nextResendAt.getTime();

  useFocusEffect(
    useCallback(() => {
      void refresh().catch((error) => {
        appLog.warn('Subscription refresh failed on account focus', error);
      });
    }, [refresh]),
  );

  const handleStartEmailChange = async () => {
    if (!canRequestEmailChange || emailChangeLoading) return;
    setEmailChangeError(null);
    setEmailChangeLoading('start');
    try {
      const result = await api!.startEmailChange(normalizedEmailDraft);
      setPendingNewEmail(normalizedEmailDraft);
      setMaskedEmail(result.maskedEmail);
      setNextResendAt(new Date(result.nextAllowedResendAt));
      setEmailChangeCode('');
      setEmailChangeStep('pending');
    } catch (error) {
      const code = error instanceof BassTabApiError ? error.code : undefined;
      if (code === 'EMAIL_SAME_AS_CURRENT') {
        setEmailChangeError("That's already your current email address.");
      } else if (code === 'EMAIL_ALREADY_LINKED') {
        setEmailChangeError('That email is already linked to another account.');
      } else {
        setEmailChangeError("Couldn't start email change. Please try again.");
      }
    } finally {
      setEmailChangeLoading(null);
    }
  };

  const handleVerifyEmailChange = async () => {
    if (emailChangeLoading || emailChangeCode.trim().length !== 6) return;
    setEmailChangeError(null);
    setEmailChangeLoading('verify');
    try {
      const result = await api!.verifyEmailChange(pendingNewEmail, emailChangeCode);
      updateLocalProfile({ email: result.email });
      setEmailDraft(result.email);
      setEmailChangeStep('idle');
      setEmailChangeCode('');
      setProfileMessage('Email updated successfully.');
    } catch (error) {
      const code = error instanceof BassTabApiError ? error.code : undefined;
      if (code === 'INVALID_OR_EXPIRED_TOKEN') {
        setEmailChangeError('Incorrect or expired code. Request a new one.');
      } else if (code === 'EMAIL_ALREADY_LINKED') {
        setEmailChangeError('That email is already linked to another account.');
      } else {
        setEmailChangeError("Couldn't verify the code. Please try again.");
      }
    } finally {
      setEmailChangeLoading(null);
    }
  };

  const handleResendEmailChange = async () => {
    if (!canResend || emailChangeLoading) return;
    setEmailChangeError(null);
    setEmailChangeLoading('start');
    try {
      const result = await api!.startEmailChange(pendingNewEmail);
      setMaskedEmail(result.maskedEmail);
      setNextResendAt(new Date(result.nextAllowedResendAt));
      setEmailChangeCode('');
    } catch (error) {
      setEmailChangeError("Couldn't resend the code. Please try again.");
    } finally {
      setEmailChangeLoading(null);
    }
  };

  const normalizedEmailDraft = useMemo(() => emailDraft.trim().toLowerCase(), [emailDraft]);
  const normalizedAvatarDraft = useMemo(() => avatarDraft.trim(), [avatarDraft]);
  const emailChanged =
    Boolean(signedInEmail) &&
    normalizedEmailDraft.length > 0 &&
    normalizedEmailDraft !== signedInEmail.trim().toLowerCase();
  const canRequestEmailChange = emailChanged && isValidEmail(normalizedEmailDraft);
  const avatarChanged = normalizedAvatarDraft !== currentAvatarUrl.trim();
  const avatarPreset = findAvatarPreset(normalizedAvatarDraft);
  const showAvatarImage =
    !avatarPreset &&
    (normalizedAvatarDraft.startsWith('http://') || normalizedAvatarDraft.startsWith('https://'));

  useEffect(() => {
    if (!signedInUser) return;
    setEmailDraft(signedInUser.email);
    setAvatarDraft(signedInUser.avatarUrl ?? '');
    setProfileMessage(null);
    setAvatarLoadFailed(false);
  }, [signedInUser?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscription state
  const [cancelState, setCancelState] = useState<CancelState>('idle');
  const [cancelError, setCancelError] = useState('');

  const isProActive = tier === 'PRO';
  const modalVisible = cancelState === 'confirming' || cancelState === 'submitting';
  const isSubmitting = cancelState === 'submitting';
  const isCancelled = cancelAtPeriodEnd || status === 'cancellation_scheduled';
  const periodEndLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : 'Unknown';

  const handleManageBilling = async () => {
    try {
      const portalUrl = await subscriptionService.loadBillingPortalUrl();
      await Linking.openURL(portalUrl);
    } catch {
      setCancelError("Couldn't open billing portal right now. Please try again.");
      setCancelState('error');
    }
  };

  const handleRequestCancel = () => {
    setCancelError('');
    setCancelState('confirming');
  };

  const handleConfirmCancel = async () => {
    setCancelState('submitting');
    try {
      await subscriptionService.cancelSubscription();
      await refresh();
      setCancelState('idle');
    } catch (error) {
      if (error instanceof BassTabApiError && error.status === 409) {
        try {
          const latestSnapshot = await subscriptionService.loadSnapshot();
          if (isCancellationApplied(latestSnapshot)) {
            await refresh();
            setCancelState('idle');
            return;
          }
        } catch (_refreshError) {
          // Fall through to existing error handling.
        }
      }
      if (error instanceof BassTabApiError && error.status === 404) {
        await refresh();
        setCancelError('No active subscription was found to cancel.');
        setCancelState('error');
        return;
      }

      try {
        const latestSnapshot = await subscriptionService.loadSnapshot();
        if (isCancellationApplied(latestSnapshot)) {
          await refresh();
          setCancelState('idle');
          return;
        }
      } catch (_refreshError) {
        // Fall through to generic error message.
      }

      setCancelError("Couldn't cancel subscription right now. Please try again.");
      setCancelState('error');
    }
  };

  const handleDismissModal = () => {
    if (!isSubmitting) {
      setCancelState(cancelState === 'error' ? 'error' : 'idle');
    }
  };

  return (
    <ScreenContainer>
      {/* Nav */}
      <AppSectionNav
        current="Account"
        onHome={() => navigation.navigate('Home')}
        onLibrary={() => navigation.navigate('MainTabs', { screen: 'Library' })}
        onSetlist={() => navigation.navigate('MainTabs', { screen: 'Setlist' })}
        onImport={() => navigation.navigate('MainTabs', { screen: 'Import' })}
        onAICreate={() => navigation.navigate('MainTabs', { screen: 'AICreate' })}
        onGoPro={() => navigation.navigate('Upgrade')}
        onAccount={() => {}}
      />

      {/* Nameplate */}
      <View style={styles.nameplate}>
        <View style={styles.nameplateInner}>
          <View style={styles.nameplateText}>
            <Text style={styles.nameplateTitle}>Dad Band Account 🎸</Text>
            <Text style={styles.nameplateSubtitle}>Fine. Let's be professional for a minute.</Text>
            <View style={styles.warningPill}>
              <Text style={styles.warningPillText}>⚠️ This is the boring bit</Text>
            </View>
          </View>
          <View style={styles.badgeSlap}>
            <DadBandBadge />
          </View>
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Profile card                                                         */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionLabel}>Profile</Text>

        {/* Identity row */}
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            {showAvatarImage && !avatarLoadFailed ? (
              <Image
                source={{ uri: normalizedAvatarDraft }}
                style={styles.avatarImage}
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : avatarPreset ? (
              <View style={[styles.avatarFallback, { backgroundColor: avatarPreset.background }]}>
                <Text style={[styles.avatarPresetGlyph, { color: avatarPreset.textColor }]}>
                  {avatarPreset.glyph}
                </Text>
              </View>
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{avatarInitial}</Text>
              </View>
            )}
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileUserId}>@{signedInUserId ?? 'unknown'}</Text>
            <Text style={styles.profileHint}>{signedInEmail}</Text>
          </View>
          <View style={[styles.tierPill, isProActive ? styles.tierPillPro : styles.tierPillFree]}>
            <Text style={[styles.tierPillText, isProActive ? styles.tierPillTextPro : styles.tierPillTextFree]}>
              {tier}
            </Text>
          </View>
        </View>

        {/* Email */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Email</Text>
          {emailChangeStep === 'idle' ? (
            <>
              <TextInput
                value={emailDraft}
                onChangeText={(value) => {
                  setEmailDraft(value);
                  setEmailChangeError(null);
                  setProfileMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
              {emailChangeError ? (
                <View style={styles.errorBox}><Text style={styles.errorText}>{emailChangeError}</Text></View>
              ) : null}
              <PrimaryButton
                label={emailChangeLoading === 'start' ? 'Sending...' : 'Request Change'}
                onPress={() => { void handleStartEmailChange(); }}
                variant="secondary"
                size="compact"
                style={styles.fieldButton}
                disabled={!canRequestEmailChange || Boolean(emailChangeLoading)}
              />
            </>
          ) : (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  {'Code sent to '}
                  <Text style={styles.infoTextBold}>{maskedEmail}</Text>
                </Text>
              </View>
              <TextInput
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor="#94a3b8"
                style={[styles.input, styles.codeInput]}
                value={emailChangeCode}
                onChangeText={(value) => {
                  setEmailChangeCode(value.replace(/[^0-9]/g, ''));
                  setEmailChangeError(null);
                }}
                returnKeyType="done"
                onSubmitEditing={() => { void handleVerifyEmailChange(); }}
                autoFocus
              />
              {emailChangeError ? (
                <View style={styles.errorBox}><Text style={styles.errorText}>{emailChangeError}</Text></View>
              ) : null}
              {!canResend && nextResendAt ? (
                <Text style={styles.resendHint}>
                  Resend available after {nextResendAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              ) : null}
              <View style={styles.emailChangeActions}>
                <PrimaryButton
                  label={emailChangeLoading === 'verify' ? 'Verifying...' : 'Confirm Change'}
                  onPress={() => { void handleVerifyEmailChange(); }}
                  variant="secondary"
                  size="compact"
                  disabled={Boolean(emailChangeLoading) || emailChangeCode.trim().length !== 6}
                />
                <PrimaryButton
                  label={emailChangeLoading === 'start' ? 'Sending...' : 'Resend code'}
                  onPress={() => { void handleResendEmailChange(); }}
                  variant="ghost"
                  size="compact"
                  disabled={Boolean(emailChangeLoading) || !canResend}
                />
                <PrimaryButton
                  label="Cancel"
                  onPress={() => {
                    setEmailChangeStep('idle');
                    setEmailChangeError(null);
                    setEmailChangeCode('');
                  }}
                  variant="ghost"
                  size="compact"
                />
              </View>
            </>
          )}
        </View>

        {/* Avatar */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Avatar</Text>
          <Text style={styles.fieldHint}>Pick a preset or paste a public image URL (Gravatar, GitHub, Imgur, etc.).</Text>
          <View style={styles.presetGrid}>
            {avatarPresets.map((preset) => {
              const isSelected = normalizedAvatarDraft === avatarPresetValue(preset.id);
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    setAvatarDraft(avatarPresetValue(preset.id));
                    setAvatarLoadFailed(false);
                    setProfileMessage(null);
                  }}
                  style={[styles.presetOption, isSelected && styles.presetOptionSelected]}
                >
                  <View style={[styles.presetBubble, { backgroundColor: preset.background }]}>
                    <Text style={[styles.presetGlyph, { color: preset.textColor }]}>
                      {preset.glyph}
                    </Text>
                  </View>
                  <Text style={styles.presetName} numberOfLines={1}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={avatarDraft}
            onChangeText={(value) => {
              setAvatarDraft(value);
              setAvatarLoadFailed(false);
              setProfileMessage(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="https://your-image-url.com/photo.jpg"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />
          <PrimaryButton
            label="Save Avatar"
            onPress={() => {
              updateLocalProfile({ avatarUrl: normalizedAvatarDraft.length > 0 ? normalizedAvatarDraft : null });
              setProfileMessage('Avatar updated.');
            }}
            variant="secondary"
            size="compact"
            style={styles.fieldButton}
            disabled={!avatarChanged}
          />
        </View>

        {profileMessage ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{profileMessage}</Text>
          </View>
        ) : null}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Subscription card                                                    */}
      {/* ------------------------------------------------------------------ */}
      <View style={[styles.sectionCard, isProActive && styles.subscriptionCardPro]}>
        <Text style={styles.sectionLabel}>Subscription</Text>

        {isProActive ? (
          <>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Text style={styles.planTitle}>You're on Pro</Text>
            <Text style={styles.planText}>
              All features unlocked. What you do with it is up to you.
            </Text>
            <Text style={styles.planText}>
              Problems, improvements, as a pro user email us at support@dad-band-bass.com
            </Text>

            <View style={styles.divider} />

            <View style={styles.billingTable}>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Plan</Text>
                <Text style={styles.billingValue}>Pro</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Status</Text>
                <Text style={[styles.billingValue, isCancelled && styles.billingValueScheduled]}>
                  {isCancelled ? 'Cancels at period end' : 'Active'}
                </Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>
                  {isCancelled ? 'Access until' : 'Renews on'}
                </Text>
                <Text style={styles.billingValue}>{periodEndLabel}</Text>
              </View>
            </View>

            {isCancelled ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>
                  Pro will stay active until the end of the billing period.
                </Text>
              </View>
            ) : null}

            {cancelState === 'error' && cancelError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{cancelError}</Text>
              </View>
            ) : null}

            <View style={styles.billingActions}>
              <PrimaryButton
                label="Manage billing"
                onPress={() => { void handleManageBilling(); }}
                variant="secondary"
                size="compact"
              />
              {!isCancelled ? (
                <PrimaryButton
                  label="Cancel subscription"
                  onPress={handleRequestCancel}
                  variant="danger"
                  size="compact"
                />
              ) : null}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.planTitle}>Free Plan</Text>
            <Text style={styles.planText}>
              Upgrade for unlimited songs and setlists, SVG performance mode, and full community access.
            </Text>
            <Text style={styles.priceLine}>{priceLabel}/month — cheaper than new strings.</Text>
            <PrimaryButton
              label="Upgrade to Pro"
              onPress={() => navigation.navigate('Upgrade')}
            />
          </>
        )}
      </View>

      {/* Cancellation confirmation modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismissModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Pro?</Text>
            <Text style={styles.modalBody}>
              You'll keep Pro until the end of the current billing period. After that, your account will drop back to the free plan.
            </Text>
            <Text style={styles.modalReassurance}>
              No dramatic scenes. You can still use what you've already paid for.
            </Text>
            <View style={styles.modalActions}>
              <PrimaryButton
                label="Keep Pro"
                onPress={handleDismissModal}
                variant="secondary"
                disabled={isSubmitting}
              />
              <PrimaryButton
                label={isSubmitting ? 'Cancelling...' : 'Yes, cancel subscription'}
                onPress={() => { void handleConfirmCancel(); }}
                variant="danger"
                disabled={isSubmitting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Nameplate
  nameplate: {
    backgroundColor: NAMEPLATE_BG,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: NAMEPLATE_GOLD,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  nameplateInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameplateText: {
    flex: 1,
    gap: 8,
  },
  nameplateTitle: {
    fontFamily: brandDisplayFontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: NAMEPLATE_TEXT,
    flexShrink: 1,
  },
  nameplateSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: NAMEPLATE_MUTED,
    fontStyle: 'italic',
  },
  warningPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2e1f0a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#7a5520',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  warningPillText: {
    fontSize: 11,
    color: '#d4a04a',
    fontWeight: '600',
  },
  badgeSlap: {
    transform: [{ rotate: '-10deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 5,
  },

  // Shared card
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 16,
    gap: 12,
  },
  subscriptionCardPro: {
    borderColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    color: palette.textMuted,
  },

  // Profile row
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e',
  },
  avatarFallbackText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
  },
  avatarPresetGlyph: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileUserId: {
    fontSize: 16,
    fontWeight: '900',
    color: palette.text,
  },
  profileHint: {
    fontSize: 12,
    color: palette.textMuted,
  },
  tierPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierPillPro: {
    borderColor: '#22c55e',
    backgroundColor: '#dcfce7',
  },
  tierPillFree: {
    borderColor: '#cbd5e1',
    backgroundColor: '#e2e8f0',
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tierPillTextPro: { color: '#166534' },
  tierPillTextFree: { color: '#334155' },

  // Field blocks (email, avatar)
  fieldBlock: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.text,
  },
  fieldHint: {
    fontSize: 12,
    color: palette.textMuted,
    lineHeight: 17,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    color: palette.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  fieldButton: {
    alignSelf: 'flex-start',
  },

  // Avatar preset grid
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetOption: {
    width: 58,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  presetOptionSelected: {
    borderColor: palette.primary,
    backgroundColor: '#ecfeff',
  },
  presetBubble: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetGlyph: {
    fontSize: 15,
    lineHeight: 18,
  },
  presetName: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '700',
  },

  // Info / success / error feedback
  infoBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2f1',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  infoText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  infoTextBold: {
    fontWeight: '800',
    color: '#0f172a',
  },
  codeInput: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
  },
  emailChangeActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  resendHint: {
    fontSize: 11,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  successText: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: palette.danger,
    lineHeight: 18,
  },

  // Subscription section
  proBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1e3a8a',
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#dbeafe',
  },
  planTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.text,
  },
  planText: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.textMuted,
  },
  priceLine: {
    fontSize: 13,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(29, 78, 216, 0.18)',
    marginVertical: 2,
  },
  billingTable: {
    gap: 8,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingLabel: {
    fontSize: 13,
    color: palette.textMuted,
  },
  billingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.text,
  },
  billingValueScheduled: {
    color: '#b45309',
  },
  billingActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },

  // Cancel confirmation modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.text,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
  },
  modalReassurance: {
    fontSize: 13,
    lineHeight: 18,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
});
