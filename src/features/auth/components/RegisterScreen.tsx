import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DadBandBrandBanner } from '../../../components/DadBandBrandBanner';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { palette } from '../../../constants/colors';
import { useAuth } from '../state/useAuth';
import { avatarPresetValue, avatarPresets, findAvatarPreset } from '../utils/avatarPresets';
import { isValidEmail } from '../utils/email';
import { authScreenStyles as styles } from './authScreenStyles';

const handlePattern = /^[A-Za-z0-9 _-]{3,30}$/;

interface RegisterScreenProps {
  onRegistered: (maskedEmail: string) => void;
}

export function RegisterScreen({ onRegistered }: RegisterScreenProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 390;
  const {
    draftEmail,
    draftPassword,
    draftHandle,
    draftAvatarUrl,
    errorMessage,
    infoMessage,
    loadingAction,
    register,
    setAuthView,
    clearError,
    clearInfo,
  } = useAuth();
  const [email, setEmail] = useState(draftEmail);
  const [password, setPassword] = useState(draftPassword);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [handle, setHandle] = useState(draftHandle);
  const [avatarUrl, setAvatarUrl] = useState(draftAvatarUrl);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarOptionsOpen, setAvatarOptionsOpen] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [handleTouched, setHandleTouched] = useState(false);
  const [focusedField, setFocusedField] = useState<null | 'email' | 'password' | 'handle' | 'avatarUrl'>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const normalizedHandle = useMemo(() => handle.trim(), [handle]);
  const normalizedAvatarUrl = useMemo(() => avatarUrl.trim(), [avatarUrl]);
  const selectedPreset = useMemo(
    () => findAvatarPreset(normalizedAvatarUrl),
    [normalizedAvatarUrl],
  );
  const avatarInitial = useMemo(
    () => normalizedHandle.slice(0, 1).toUpperCase() || 'B',
    [normalizedHandle],
  );
  const emailIsValid = isValidEmail(normalizedEmail);
  const passwordIsValid = password.length >= 8 && password.length <= 128;
  const handleIsValid = handlePattern.test(normalizedHandle);
  const hasAvatarInput = normalizedAvatarUrl.length > 0;
  const showAvatarImage =
    !selectedPreset &&
    (normalizedAvatarUrl.startsWith('http://') || normalizedAvatarUrl.startsWith('https://'));
  const avatarIsValid = !hasAvatarInput || Boolean(selectedPreset) || showAvatarImage;
  const showEmailError = (submitAttempted || emailTouched) && !emailIsValid;
  const showPasswordError = (submitAttempted || passwordTouched) && !passwordIsValid;
  const showHandleError = (submitAttempted || handleTouched) && !handleIsValid;
  const showAvatarError = hasAvatarInput && !avatarIsValid;
  const isSubmitting = loadingAction === 'register';

  const submit = async () => {
    setSubmitAttempted(true);

    if (isSubmitting || !emailIsValid || !passwordIsValid || !handleIsValid || !avatarIsValid) {
      return;
    }

    const result = await register({
      rawEmail: email,
      rawPassword: password,
      rawHandle: handle,
      rawAvatarUrl: avatarUrl,
    });

    if (result?.email) {
      onRegistered(result.maskedEmail);
    }
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        <View style={localStyles.introBlock}>
          <DadBandBrandBanner variant="compact" subtitle="Rehearsal-night edition" />

          <Text style={[styles.title, isNarrow && localStyles.titleNarrow]}>Start your first bass tab</Text>
          <Text style={styles.body}>
            Create your account and get your first song ready in minutes.
          </Text>
          <View style={localStyles.reassuranceCard}>
            <Text style={localStyles.reassuranceTitle}>Start with:</Text>
            <Text style={localStyles.reassuranceLine}>• Your own song library</Text>
            <Text style={localStyles.reassuranceLine}>• Community tabs to borrow and tweak</Text>
            <Text style={localStyles.reassuranceLine}>• AI starter tabs when you're stuck</Text>
          </View>
        </View>

        {infoMessage ? <Text style={styles.successText}>{infoMessage}</Text> : null}

        <View style={[styles.field, localStyles.firstField]}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            placeholder="you@example.com"
            placeholderTextColor="#94a3b8"
            style={[
              styles.input,
              focusedField === 'email' && localStyles.inputFocus,
              showEmailError && localStyles.inputSoftError,
            ]}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (errorMessage) {
                clearError();
              }
              if (infoMessage) {
                clearInfo();
              }
            }}
            onFocus={() => {
              setFocusedField('email');
            }}
            onBlur={() => {
              setFocusedField((current) => (current === 'email' ? null : current));
              setEmailTouched(true);
            }}
            returnKeyType="next"
          />
          {showEmailError ? <Text style={styles.inlineError}>Enter a valid email address.</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordFieldWrap}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!passwordVisible}
              textContentType="newPassword"
              autoComplete="password-new"
              placeholder="secret123"
              placeholderTextColor="#94a3b8"
              style={[
                styles.input,
                styles.passwordInput,
                focusedField === 'password' && localStyles.inputFocus,
                showPasswordError && localStyles.inputSoftError,
              ]}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errorMessage) {
                  clearError();
                }
              }}
              onFocus={() => {
                setFocusedField('password');
              }}
              onBlur={() => {
                setFocusedField((current) => (current === 'password' ? null : current));
                setPasswordTouched(true);
              }}
              returnKeyType="next"
            />
            <Pressable
              style={styles.passwordToggle}
              onPress={() => {
                setPasswordVisible((value) => !value);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={palette.textMuted}
              />
            </Pressable>
          </View>
          {showPasswordError ? (
            <Text style={styles.inlineError}>Password must be 8-128 characters.</Text>
          ) : (
            <Text style={styles.hint}>Use at least 8 characters.</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username"
            placeholder="My Bass Name"
            placeholderTextColor="#94a3b8"
            style={[
              styles.input,
              focusedField === 'handle' && localStyles.inputFocus,
              showHandleError && localStyles.inputSoftError,
            ]}
            value={handle}
            onChangeText={(value) => {
              setHandle(value);
              if (errorMessage) {
                clearError();
              }
            }}
            onFocus={() => {
              setFocusedField('handle');
            }}
            onBlur={() => {
              setFocusedField((current) => (current === 'handle' ? null : current));
              setHandleTouched(true);
            }}
            onSubmitEditing={() => {
              void submit();
            }}
            returnKeyType="done"
          />
          {showHandleError ? (
            <Text style={styles.inlineError}>
              Use 3-30 characters: letters, numbers, spaces, `_`, or `-`.
            </Text>
          ) : (
            <Text style={styles.hint}>Pick a display name for the community — you can change it later.</Text>
          )}
        </View>

        <View style={styles.field}>
          <Pressable
            style={({ pressed }) => [localStyles.avatarToggle, pressed && localStyles.avatarTogglePressed]}
            onPress={() => {
              setAvatarOptionsOpen((value) => !value);
            }}
            accessibilityRole="button"
            accessibilityLabel={avatarOptionsOpen ? 'Hide avatar options' : 'Add avatar options'}
          >
            <Text style={localStyles.avatarToggleText}>
              {avatarOptionsOpen ? 'Hide avatar options' : 'Add avatar (optional)'}
            </Text>
            <Ionicons
              name={avatarOptionsOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={16}
              color="#6b7280"
            />
          </Pressable>

          {avatarOptionsOpen ? (
            <>
              <View
                style={[
                  styles.avatarCard,
                  showAvatarError && styles.avatarCardError,
                ]}
              >
                <View style={styles.avatarPreviewWrap}>
                  {showAvatarImage && !avatarLoadFailed ? (
                    <Image
                      source={{ uri: normalizedAvatarUrl }}
                      style={styles.avatarImage}
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : selectedPreset ? (
                    <View
                      style={[
                        styles.avatarFallback,
                        {
                          backgroundColor: selectedPreset.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarPresetGlyph,
                          {
                            color: selectedPreset.textColor,
                          },
                        ]}
                      >
                        {selectedPreset.glyph}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>{avatarInitial}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.avatarCopy}>
                  <Text style={styles.avatarTitle}>Profile avatar</Text>
                  <Text style={styles.avatarHint}>
                    Pick a preset or use a full `http(s)` image URL.
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Pick a preset</Text>
              <View style={styles.presetRow}>
                {avatarPresets.map((preset) => {
                  const isSelected = selectedPreset?.id === preset.id;

                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => {
                        setAvatarUrl(avatarPresetValue(preset.id));
                        setAvatarLoadFailed(false);
                        if (errorMessage) {
                          clearError();
                        }
                      }}
                      style={[
                        styles.presetOption,
                        isSelected && styles.presetOptionSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.presetBubble,
                          { backgroundColor: preset.background },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetGlyph,
                            { color: preset.textColor },
                          ]}
                        >
                          {preset.glyph}
                        </Text>
                      </View>
                      <Text style={styles.presetLabel} numberOfLines={1}>
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Avatar URL (optional)</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="https://..."
                placeholderTextColor="#94a3b8"
                style={[
                  styles.input,
                  focusedField === 'avatarUrl' && localStyles.inputFocus,
                  showAvatarError && localStyles.inputSoftError,
                ]}
                value={avatarUrl}
                onChangeText={(value) => {
                  setAvatarUrl(value);
                  setAvatarLoadFailed(false);
                  if (errorMessage) {
                    clearError();
                  }
                }}
                onFocus={() => {
                  setFocusedField('avatarUrl');
                }}
                onBlur={() => {
                  setFocusedField((current) => (current === 'avatarUrl' ? null : current));
                }}
                returnKeyType="done"
                onSubmitEditing={() => {
                  void submit();
                }}
              />
              <PrimaryButton
                label="Clear Avatar"
                variant="ghost"
                size="compact"
                onPress={() => {
                  setAvatarUrl('');
                  setAvatarLoadFailed(false);
                  if (errorMessage) {
                    clearError();
                  }
                }}
              />
              {showAvatarError ? (
                <Text style={styles.inlineError}>Use a preset or full `http(s)` image URL.</Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.hint}>Skip this for now and start playing faster.</Text>
          )}
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={localStyles.ctaBlock}>
          <Text style={localStyles.nextStep}>
            Next: check your email, enter the 6-digit code, then you&apos;ll land in your library.
          </Text>
          <PrimaryButton
            label={isSubmitting ? 'Creating account...' : 'Start Playing'}
            onPress={() => {
              void submit();
            }}
            disabled={isSubmitting}
          />
          <Text style={localStyles.ctaReassurance}>No pressure. Just bass.</Text>
        </View>

        <View style={[styles.linkRow, localStyles.secondaryRow]}>
          <Text style={[styles.linkText, localStyles.secondaryText]}>Already have an account?</Text>
          <PrimaryButton
            label="Back to Sign In"
            variant="ghost"
            size="compact"
            onPress={() => {
              clearError();
              clearInfo();
              setAuthView('LOGIN');
            }}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const localStyles = StyleSheet.create({
  introBlock: {
    gap: 10,
  },
  reassuranceCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e7dcc7',
    backgroundColor: '#fffdfa',
    padding: 12,
    gap: 4,
  },
  reassuranceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2f2012',
  },
  reassuranceLine: {
    fontSize: 13,
    color: '#5b4d3e',
    lineHeight: 18,
  },
  inputFocus: {
    borderColor: '#c8bca7',
    backgroundColor: '#fffdf8',
  },
  inputSoftError: {
    borderColor: '#c97c1e',
    backgroundColor: '#fffaf1',
  },
  avatarToggle: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1d8c8',
    backgroundColor: '#f9f4ea',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarTogglePressed: {
    opacity: 0.85,
  },
  avatarToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f4233',
  },
  ctaReassurance: {
    fontSize: 12,
    color: '#8a7b6c',
    textAlign: 'center',
    fontWeight: '600',
  },
  ctaBlock: {
    gap: 8,
    marginTop: 2,
  },
  nextStep: {
    fontSize: 12,
    color: '#6b5c4f',
    textAlign: 'center',
    fontWeight: '600',
  },
  titleNarrow: {
    fontSize: 28,
    lineHeight: 34,
  },
  firstField: {
    marginTop: -4,
  },
  secondaryRow: {
    marginTop: 2,
  },
  secondaryText: {
    color: '#7c6f60',
    fontWeight: '600',
  },
});
