import { useMemo, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { palette } from '../../../constants/colors';
import { useAuth } from '../state/useAuth';
import { avatarPresetValue, avatarPresets, findAvatarPreset } from '../utils/avatarPresets';
import { isValidEmail } from '../utils/email';
import { authScreenStyles as styles } from './authScreenStyles';

const handlePattern = /^[a-z0-9_-]{3,30}$/;

export function RegisterScreen() {
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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const normalizedHandle = useMemo(() => handle.trim().toLowerCase(), [handle]);
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
  const showEmailError = (submitAttempted || normalizedEmail.length > 0) && !emailIsValid;
  const showPasswordError = (submitAttempted || password.length > 0) && !passwordIsValid;
  const showHandleError = (submitAttempted || normalizedHandle.length > 0) && !handleIsValid;
  const showAvatarError = hasAvatarInput && !avatarIsValid;
  const isSubmitting = loadingAction === 'register';

  const submit = async () => {
    setSubmitAttempted(true);

    if (isSubmitting || !emailIsValid || !passwordIsValid || !handleIsValid || !avatarIsValid) {
      return;
    }

    await register({
      rawEmail: email,
      rawPassword: password,
      rawHandle: handle,
      rawAvatarUrl: avatarUrl,
    });
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Start free with BassTab</Text>
        <Text style={styles.body}>
          Make your account and start building your library in minutes.
        </Text>

        {infoMessage ? <Text style={styles.successText}>{infoMessage}</Text> : null}

        <View style={styles.field}>
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
            style={[styles.input, showEmailError && styles.inputError]}
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
                showPasswordError && styles.inputError,
              ]}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errorMessage) {
                  clearError();
                }
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
          <Text style={styles.label}>Handle</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username"
            placeholder="myhandle"
            placeholderTextColor="#94a3b8"
            style={[styles.input, showHandleError && styles.inputError]}
            value={handle}
            onChangeText={(value) => {
              setHandle(value.toLowerCase());
              if (errorMessage) {
                clearError();
              }
            }}
            onSubmitEditing={() => {
              void submit();
            }}
            returnKeyType="done"
          />
          {showHandleError ? (
            <Text style={styles.inlineError}>
              Handle must be 3-30 characters using lowercase letters, numbers, `_`, or `-`.
            </Text>
          ) : (
            <Text style={styles.hint}>3-30 chars, lowercase letters, numbers, `_`, or `-`.</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Avatar</Text>
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
            style={[styles.input, showAvatarError && styles.inputError]}
            value={avatarUrl}
            onChangeText={(value) => {
              setAvatarUrl(value);
              setAvatarLoadFailed(false);
              if (errorMessage) {
                clearError();
              }
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
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <PrimaryButton
          label={isSubmitting ? 'Creating account...' : 'Register'}
          onPress={() => {
            void submit();
          }}
          disabled={isSubmitting}
        />

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Already have an account?</Text>
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
