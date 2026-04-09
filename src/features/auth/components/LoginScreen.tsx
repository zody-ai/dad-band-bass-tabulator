import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenContainer } from '../../../components/ScreenContainer';
import { palette } from '../../../constants/colors';
import { useAuth } from '../state/useAuth';
import { isValidEmail } from '../utils/email';
import { authScreenStyles as styles } from './authScreenStyles';

export function LoginScreen() {
  const {
    draftEmail,
    draftPassword,
    errorMessage,
    infoMessage,
    loadingAction,
    login,
    setAuthView,
    clearError,
    clearInfo,
  } = useAuth();
  const [email, setEmail] = useState(draftEmail);
  const [password, setPassword] = useState(draftPassword);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailIsValid = isValidEmail(normalizedEmail);
  const passwordIsValid = password.length >= 8 && password.length <= 128;
  const showEmailError = (submitAttempted || normalizedEmail.length > 0) && !emailIsValid;
  const showPasswordError = (submitAttempted || password.length > 0) && !passwordIsValid;
  const isSubmitting = loadingAction === 'login';

  const submit = async () => {
    setSubmitAttempted(true);

    if (isSubmitting || !emailIsValid || !passwordIsValid) {
      return;
    }

    await login({ rawEmail: email, rawPassword: password });
  };

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome back to BassTab</Text>
        <Text style={styles.body}>
          Pick up where you left off.
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
            onSubmitEditing={() => {
              void submit();
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
              textContentType="password"
              autoComplete="password"
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
              onSubmitEditing={() => {
                void submit();
              }}
              returnKeyType="done"
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
          ) : null}
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            label={isSubmitting ? 'Signing in...' : 'Sign In'}
            onPress={() => {
              void submit();
            }}
            disabled={isSubmitting}
          />
          <PrimaryButton
            variant="ghost"
            label="Forgot Password?"
            onPress={() => {
              clearError();
              clearInfo();
              setAuthView('FORGOT_PASSWORD');
            }}
          />
        </View>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>New here? Start free.</Text>
          <PrimaryButton
            label="Start Free"
            variant="ghost"
            size="compact"
            onPress={() => {
              clearError();
              clearInfo();
              setAuthView('REGISTER');
            }}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}
