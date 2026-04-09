import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { palette } from '../constants/colors';
import { useAuth } from '../features/auth/state/useAuth';
import { avatarPresetValue, avatarPresets, findAvatarPreset } from '../features/auth/utils/avatarPresets';
import { isValidEmail } from '../features/auth/utils/email';
import { useSubscription } from '../features/subscription';

interface AppSectionNavProps {
  current: 'Home' | 'Library' | 'Setlist' | 'Import' | 'AICreate' | 'GoPro';
  onHome: () => void;
  onLibrary: () => void;
  onSetlist: () => void;
  onImport: () => void;
  onAICreate: () => void;
  onGoPro: () => void;
}

export function AppSectionNav({
  current,
  onHome,
  onLibrary,
  onSetlist,
  onImport,
  onAICreate,
  onGoPro,
}: AppSectionNavProps) {
  const { authState, logout, loadingAction, updateLocalProfile } = useAuth();
  const { tier, priceLabel } = useSubscription();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState('');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const signedInUser = authState.type === 'AUTHENTICATED' ? authState.user : null;
  const signedInUserId = signedInUser?.userId ?? null;
  const signedInEmail = signedInUser?.email ?? '';
  const currentAvatarUrl = signedInUser?.avatarUrl ?? '';
  const isLoggingOut = loadingAction === 'logout';

  const normalizedEmailDraft = useMemo(
    () => emailDraft.trim().toLowerCase(),
    [emailDraft],
  );
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
  const avatarInitial = (signedInUserId ?? 'b').slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!settingsVisible || !signedInUser) {
      return;
    }

    setEmailDraft(signedInUser.email);
    setAvatarDraft(signedInUser.avatarUrl ?? '');
    setSettingsMessage(null);
    setAvatarLoadFailed(false);
  }, [settingsVisible, signedInUser]);

  useEffect(() => {
    if (authState.type !== 'AUTHENTICATED') {
      setSettingsVisible(false);
    }
  }, [authState.type]);

  const closeSettings = () => {
    setSettingsVisible(false);
    setSettingsMessage(null);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.row}>
          <PrimaryButton
            label="Home"
            onPress={onHome}
            variant={current === 'Home' ? 'secondary' : 'ghost'}
            size="compact"
          />
          <PrimaryButton
            label="Library"
            onPress={onLibrary}
            variant={current === 'Library' ? 'secondary' : 'ghost'}
            size="compact"
          />
          <PrimaryButton
            label="Setlist"
            onPress={onSetlist}
            variant={current === 'Setlist' ? 'secondary' : 'ghost'}
            size="compact"
          />
          <PrimaryButton
            label="Community"
            onPress={onImport}
            variant={current === 'Import' ? 'secondary' : 'ghost'}
            size="compact"
          />
          <PrimaryButton
            label="AI Create"
            onPress={onAICreate}
            variant={current === 'AICreate' ? 'secondary' : 'ghost'}
            size="compact"
          />
          <PrimaryButton
            label="Go Pro"
            onPress={onGoPro}
            variant={current === 'GoPro' ? 'secondary' : 'ghost'}
            size="compact"
          />
        </View>
        {signedInUser ? (
          <View style={styles.accountCluster}>
            <Text style={styles.accountLabel}>Signed in</Text>
            <Text style={styles.accountUserId} numberOfLines={1}>
              @{signedInUserId ?? 'unknown'}
            </Text>
            <View style={[styles.tierPill, tier === 'PRO' ? styles.tierPillPro : styles.tierPillFree]}>
              <Text style={[styles.tierPillText, tier === 'PRO' ? styles.tierPillTextPro : styles.tierPillTextFree]}>
                {tier}
              </Text>
            </View>
            <PrimaryButton
              label="Settings"
              onPress={() => setSettingsVisible(true)}
              variant="ghost"
              size="compact"
              style={styles.clusterButton}
            />
            <PrimaryButton
              label={isLoggingOut ? 'Signing out...' : 'Sign out'}
              onPress={() => {
                if (!isLoggingOut) {
                  void logout();
                }
              }}
              variant="ghost"
              size="compact"
              disabled={isLoggingOut}
              style={styles.clusterButton}
            />
          </View>
        ) : null}
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={settingsVisible}
        onRequestClose={closeSettings}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSettings} />
          <View style={styles.settingsSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>User Settings</Text>
              <PrimaryButton
                label="Close"
                onPress={closeSettings}
                variant="ghost"
                size="compact"
                style={styles.closeButton}
              />
            </View>

            <ScrollView
              style={styles.settingsScroll}
              contentContainerStyle={styles.settingsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.profileRow}>
                <View style={styles.avatarWrap}>
                  {showAvatarImage && !avatarLoadFailed ? (
                    <Image
                      source={{ uri: normalizedAvatarDraft }}
                      style={styles.avatarImage}
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : avatarPreset ? (
                    <View
                      style={[
                        styles.avatarFallback,
                        {
                          backgroundColor: avatarPreset.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarPresetGlyph,
                          {
                            color: avatarPreset.textColor,
                          },
                        ]}
                      >
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
                  <Text style={styles.profileHint}>Manage your account and upgrade options.</Text>
                </View>
                <View style={[styles.tierPill, tier === 'PRO' ? styles.tierPillPro : styles.tierPillFree]}>
                  <Text style={[styles.tierPillText, tier === 'PRO' ? styles.tierPillTextPro : styles.tierPillTextFree]}>
                    {tier}
                  </Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Email</Text>
                <Text style={styles.sectionHint}>Use a valid email for login verification.</Text>
                <TextInput
                  value={emailDraft}
                  onChangeText={(value) => {
                    setEmailDraft(value);
                    setSettingsMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
                <PrimaryButton
                  label="Request Email Change"
                  onPress={() => {
                    setSettingsMessage(
                      'Email change needs backend verification endpoints. Keep this draft for now.',
                    );
                  }}
                  variant="secondary"
                  size="compact"
                  style={styles.sectionButton}
                  disabled={!canRequestEmailChange}
                />
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Avatar</Text>
                <Text style={styles.sectionHint}>Pick a quick avatar or paste a custom URL.</Text>
                <Text style={styles.presetLabel}>Quick Avatars</Text>
                <View style={styles.presetGrid}>
                  {avatarPresets.map((preset) => {
                    const isSelected = normalizedAvatarDraft === avatarPresetValue(preset.id);

                    return (
                      <Pressable
                        key={preset.id}
                        onPress={() => {
                          setAvatarDraft(avatarPresetValue(preset.id));
                          setAvatarLoadFailed(false);
                          setSettingsMessage(null);
                        }}
                        style={[
                          styles.presetOption,
                          isSelected && styles.presetOptionSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.presetBubble,
                            {
                              backgroundColor: preset.background,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.presetGlyph,
                              {
                                color: preset.textColor,
                              },
                            ]}
                          >
                            {preset.glyph}
                          </Text>
                        </View>
                        <Text style={styles.presetName} numberOfLines={1}>
                          {preset.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={avatarDraft}
                  onChangeText={(value) => {
                    setAvatarDraft(value);
                    setAvatarLoadFailed(false);
                    setSettingsMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="https://... or preset:sunburst"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                />
                <PrimaryButton
                  label="Save Avatar"
                  onPress={() => {
                    updateLocalProfile({
                      avatarUrl: normalizedAvatarDraft.length > 0 ? normalizedAvatarDraft : null,
                    });
                    setSettingsMessage('Avatar updated.');
                  }}
                  variant="secondary"
                  size="compact"
                  style={styles.sectionButton}
                  disabled={!avatarChanged}
                />
              </View>

              <View style={styles.subscriptionCard}>
                <View style={styles.subscriptionGlowWarm} />
                <View style={styles.subscriptionGlowCool} />
                <Text style={styles.subscriptionEyebrow}>BassTab Pro</Text>
                <Text style={styles.subscriptionTitle}>
                  {tier === 'PRO' ? 'You are stage-ready.' : 'Play without limits.'}
                </Text>
                <Text style={styles.subscriptionValue}>
                  {tier === 'PRO'
                    ? `Active at ${priceLabel}/month`
                    : `${priceLabel}/month. Come on, the cost of a beer.`}
                </Text>
                <View style={styles.subscriptionBenefits}>
                  <Text style={styles.subscriptionBenefit}>• Unlimited songs and setlists</Text>
                  <Text style={styles.subscriptionBenefit}>• Performance Mode (SVG)</Text>
                  <Text style={styles.subscriptionBenefit}>• Export Print PDF for offline gigs</Text>
                  <Text style={styles.subscriptionBenefit}>• Full community access and publishing</Text>
                  <Text style={styles.subscriptionBenefit}>• 5/6 string support + creator support</Text>
                </View>
                <PrimaryButton
                  label={tier === 'PRO' ? 'View Pro Benefits' : `Unlock Pro - ${priceLabel}/month`}
                  onPress={() => {
                    closeSettings();
                    onGoPro();
                  }}
                  variant={tier === 'PRO' ? 'secondary' : 'primary'}
                  size="compact"
                  style={styles.sectionButton}
                />
              </View>

              {settingsMessage ? <Text style={styles.settingsMessage}>{settingsMessage}</Text> : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
  },
  accountCluster: {
    minWidth: 280,
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe2f1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  accountLabel: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#64748b',
    fontWeight: '700',
  },
  accountUserId: {
    fontSize: 13,
    lineHeight: 17,
    color: '#0f172a',
    fontWeight: '800',
    marginRight: 2,
  },
  clusterButton: {
    minHeight: 32,
    paddingHorizontal: 9,
    marginLeft: 2,
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
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  tierPillTextPro: {
    color: '#166534',
  },
  tierPillTextFree: {
    color: '#334155',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  settingsSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe2f1',
    maxHeight: '88%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  settingsTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  closeButton: {
    minHeight: 34,
  },
  settingsScroll: {
    flex: 1,
  },
  settingsScrollContent: {
    gap: 12,
    paddingBottom: 18,
  },
  profileRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe2f1',
    backgroundColor: '#ffffff',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 44,
    height: 44,
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
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: '#f8fafc',
  },
  avatarPresetGlyph: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  profileUserId: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  profileHint: {
    fontSize: 12,
    lineHeight: 16,
    color: '#475569',
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe2f1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
  },
  presetLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#334155',
    fontWeight: '700',
  },
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
    lineHeight: 12,
    color: '#334155',
    fontWeight: '700',
  },
  subscriptionCard: {
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  subscriptionGlowWarm: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    right: -30,
    top: -34,
  },
  subscriptionGlowCool: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 211, 238, 0.20)',
    left: -20,
    bottom: -24,
  },
  subscriptionEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#fbbf24',
  },
  subscriptionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: '#f8fafc',
  },
  subscriptionValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#7dd3fc',
  },
  subscriptionBenefits: {
    gap: 3,
    paddingVertical: 2,
  },
  subscriptionBenefit: {
    fontSize: 12,
    lineHeight: 16,
    color: '#e2e8f0',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    color: palette.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sectionButton: {
    alignSelf: 'flex-start',
  },
  settingsMessage: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2f1',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    lineHeight: 17,
    color: '#334155',
    fontWeight: '700',
  },
});
