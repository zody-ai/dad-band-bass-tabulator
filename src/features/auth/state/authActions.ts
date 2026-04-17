import { AuthApi, AuthApiError } from '../api/authApi.ts';
import type { AuthEvent } from './authReducer.ts';
import type { AuthStoreState, AuthView } from './authTypes.ts';
import { toAuthErrorMessage } from '../utils/authErrorMessage.ts';
import { isValidEmail, normalizeEmail } from '../utils/email.ts';
import { logClientEvent } from '../../../utils/clientTelemetry';
import { appLog } from '../../../utils/logging';

interface ActionDeps {
  api: AuthApi | null;
  dispatch: (event: AuthEvent) => void;
  getState: () => AuthStoreState;
}

const normalizeHandle = (value: string): string => value.trim();
const isValidHandle = (value: string): boolean => /^[A-Za-z0-9 _-]{3,30}$/.test(value);
const isValidPassword = (value: string): boolean => value.length >= 8 && value.length <= 128;

export const createAuthActions = ({ api, dispatch, getState }: ActionDeps) => {
  let authFlowVersion = 0;
  const resendVerificationInflight = new Set<string>();
  const resendVerificationLastSentAt = new Map<string, number>();
  const registerVerificationLastSentAt = new Map<string, number>();
  const verificationCooldownMs = 30_000;

  const bumpAuthFlowVersion = () => {
    authFlowVersion += 1;
    return authFlowVersion;
  };

  const requireApi = (): AuthApi => {
    if (!api) {
      throw new AuthApiError('Auth API base URL is not configured.');
    }

    return api;
  };

  const setError = (errorMessage: string | null) => {
    dispatch({ type: 'setError', errorMessage });
  };

  const setInfo = (infoMessage: string | null) => {
    dispatch({ type: 'setInfo', infoMessage });
  };

  const syncDrafts = ({
    email,
    password,
    handle,
    avatarUrl,
  }: {
    email?: string;
    password?: string;
    handle?: string;
    avatarUrl?: string;
  }) => {
    dispatch({ type: 'setDraftCredentials', email, password, handle, avatarUrl });
  };

  const restoreSession = async () => {
    const restoreVersion = authFlowVersion;
    dispatch({ type: 'setLoading', loadingAction: 'restoreSession' });
    dispatch({ type: 'setRestoring' });
    setError(null);

    try {
      const session = await requireApi().getSession();
      if (restoreVersion !== authFlowVersion) {
        logClientEvent('info', 'auth.restore_session_ignored_stale_success');
        return;
      }
      logClientEvent('info', 'auth.restore_session_succeeded', {
        userId: session.user.userId,
      });
      dispatch({ type: 'setAuthenticated', user: session.user });
      syncDrafts({
        email: session.user.email,
        password: '',
        handle: session.user.userId,
        avatarUrl: session.user.avatarUrl ?? '',
      });
      setInfo(null);
      setError(null);
    } catch (error) {
      if (restoreVersion !== authFlowVersion) {
        logClientEvent('info', 'auth.restore_session_ignored_stale_error');
        return;
      }
      if (error instanceof AuthApiError && error.status === 401) {
        logClientEvent('warn', 'auth.restore_session_unauthorized');
        dispatch({ type: 'setUnauthenticated' });
        setError(null);
      } else {
        logClientEvent('error', 'auth.restore_session_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        dispatch({ type: 'setUnauthenticated' });
        setError(toAuthErrorMessage('restore', error));
      }
    } finally {
      dispatch({ type: 'setLoading', loadingAction: null });
    }
  };

  const setAuthView = (authView: AuthView) => {
    dispatch({ type: 'setAuthView', authView });
    setError(null);
    setInfo(null);
  };

  const clearError = () => {
    setError(null);
  };

  const clearInfo = () => {
    setInfo(null);
  };

  const login = async ({
    rawEmail,
    rawPassword,
  }: {
    rawEmail: string;
    rawPassword: string;
  }): Promise<{ errorCode: string } | undefined> => {
    bumpAuthFlowVersion();
    const email = normalizeEmail(rawEmail);
    const password = rawPassword;
    syncDrafts({ email, password });
    setError(null);
    setInfo(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!isValidPassword(password)) {
      setError('Password must be 8-128 characters.');
      return;
    }

    dispatch({ type: 'setLoading', loadingAction: 'login' });

    try {
      const response = await requireApi().login({ email, password });
      logClientEvent('info', 'auth.login_succeeded', {
        userId: response.user.userId,
      });
      dispatch({ type: 'setAuthenticated', user: response.user });
      syncDrafts({
        email: response.user.email,
        password: '',
        handle: response.user.userId,
        avatarUrl: response.user.avatarUrl ?? '',
      });
    } catch (error) {
      logClientEvent('warn', 'auth.login_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setError(toAuthErrorMessage('login', error));
      const errorCode = error instanceof AuthApiError ? (error.code ?? '') : '';
      return { errorCode };
    } finally {
      dispatch({ type: 'setLoading', loadingAction: null });
    }
  };

  const register = async ({
    rawEmail,
    rawPassword,
    rawHandle,
    rawAvatarUrl,
  }: {
    rawEmail: string;
    rawPassword: string;
    rawHandle: string;
    rawAvatarUrl?: string;
  }) => {
    bumpAuthFlowVersion();
    const email = normalizeEmail(rawEmail);
    const password = rawPassword;
    const handle = normalizeHandle(rawHandle);
    const avatarUrl = (rawAvatarUrl ?? '').trim();
    syncDrafts({ email, password, handle, avatarUrl });
    setError(null);
    setInfo(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!isValidPassword(password)) {
      setError('Password must be 8-128 characters.');
      return;
    }

    if (!isValidHandle(handle)) {
      setError('Display name must be 3-30 characters using letters, numbers, spaces, underscores, or hyphens.');
      return;
    }

    dispatch({ type: 'setLoading', loadingAction: 'register' });

    try {
      const now = Date.now();
      const lastSentAt = registerVerificationLastSentAt.get(email) ?? 0;
      if (lastSentAt > 0 && now - lastSentAt < verificationCooldownMs) {
        const seconds = Math.ceil((verificationCooldownMs - (now - lastSentAt)) / 1000);
        setInfo(`Verification email already sent. Try again in ${seconds}s.`);
        return { email, maskedEmail: email };
      }

      const response = await requireApi().register({
        email,
        password,
        handle,
        avatarUrl: avatarUrl || undefined,
      });
      registerVerificationLastSentAt.set(email, Date.now());
      logClientEvent('info', 'auth.register_succeeded', {
        handle,
      });
      dispatch({ type: 'setDraftCredentials', password: '' });
      return { email, maskedEmail: response.maskedEmail };
    } catch (error) {
      logClientEvent('warn', 'auth.register_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setError(toAuthErrorMessage('register', error));
    } finally {
      dispatch({ type: 'setLoading', loadingAction: null });
    }
  };

  const resendVerification = async ({ rawEmail }: { rawEmail: string }) => {
    bumpAuthFlowVersion();
    const email = normalizeEmail(rawEmail);
    syncDrafts({ email });
    setError(null);
    setInfo(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    if (resendVerificationInflight.has(email)) {
      return;
    }

    const now = Date.now();
    const lastSentAt = resendVerificationLastSentAt.get(email) ?? 0;
    if (lastSentAt > 0 && now - lastSentAt < verificationCooldownMs) {
      const seconds = Math.ceil((verificationCooldownMs - (now - lastSentAt)) / 1000);
      setInfo(`Verification email already sent. Try again in ${seconds}s.`);
      return;
    }

    dispatch({ type: 'setLoading', loadingAction: 'resendVerification' });
    resendVerificationInflight.add(email);

    try {
      await requireApi().resendVerification({ email });
      resendVerificationLastSentAt.set(email, Date.now());
      setInfo(`A new code has been sent to ${email}.`);
    } catch (error) {
      logClientEvent('warn', 'auth.resend_verification_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setError(toAuthErrorMessage('resendVerification', error));
    } finally {
      resendVerificationInflight.delete(email);
      dispatch({ type: 'setLoading', loadingAction: null });
    }
  };

  const forgotPassword = async ({ rawEmail }: { rawEmail: string }) => {
    bumpAuthFlowVersion();
    const email = normalizeEmail(rawEmail);
    syncDrafts({ email });
    setError(null);
    setInfo(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    dispatch({ type: 'setLoading', loadingAction: 'forgotPassword' });

    try {
      await requireApi().forgotPassword({ email });
      setInfo(`If that email exists, you'll receive a reset link.`);
    } catch (error) {
      setError(toAuthErrorMessage('forgotPassword', error));
    } finally {
      dispatch({ type: 'setLoading', loadingAction: null });
    }
  };

  const verifyEmail = async ({ email, code }: { email: string; code: string }): Promise<{ errorCode: string } | undefined> => {
    bumpAuthFlowVersion();
    const trimmedCode = code.trim();
    setError(null);
    setInfo(null);

    if (!trimmedCode) {
      setError('Enter the 6-digit code from your email.');
      return { errorCode: 'MISSING_CODE' };
    }

    dispatch({ type: 'setLoading', loadingAction: 'verifyEmail' });

    try {
      const response = await requireApi().verifyEmail({ email, code: trimmedCode });
      dispatch({ type: 'setAuthenticated', user: response.user });
      syncDrafts({
        email: response.user.email,
        password: '',
        handle: response.user.userId,
        avatarUrl: response.user.avatarUrl ?? '',
      });
    } catch (error) {
      dispatch({ type: 'setUnauthenticated' });
      setError(toAuthErrorMessage('verifyEmail', error));
      const errorCode = error instanceof AuthApiError ? (error.code ?? '') : '';
      return { errorCode };
    } finally {
      dispatch({ type: 'setLoading', loadingAction: null });
    }
  };

  const resetPassword = async ({
    token,
    rawNewPassword,
  }: {
    token: string;
    rawNewPassword: string;
  }) => {
    bumpAuthFlowVersion();
    const trimmedToken = token.trim();
    const newPassword = rawNewPassword;
    setError(null);
    setInfo(null);

    if (!trimmedToken) {
      setError('This reset link is invalid or has expired.');
      return false;
    }

    if (!isValidPassword(newPassword)) {
      setError('Password must be 8-128 characters.');
      return false;
    }

    dispatch({ type: 'setLoading', loadingAction: 'resetPassword' });

    try {
      await requireApi().resetPassword({ token: trimmedToken, newPassword });
      dispatch({ type: 'setDraftCredentials', password: '' });
      return true;
    } catch (error) {
      setError(toAuthErrorMessage('resetPassword', error));
      return false;
    } finally {
      dispatch({ type: 'setLoading', loadingAction: null });
    }
  };

  const logout = () => {
    bumpAuthFlowVersion();
    const current = getState().authState;
    const fallbackEmail = current.type === 'AUTHENTICATED' ? current.user.email : getState().draftEmail;
    const fallbackHandle = current.type === 'AUTHENTICATED' ? current.user.userId : getState().draftHandle;

    // Clear auth state immediately — don't wait for the server.
    syncDrafts({
      email: fallbackEmail,
      password: '',
      handle: fallbackHandle,
      avatarUrl: current.type === 'AUTHENTICATED' ? (current.user.avatarUrl ?? '') : getState().draftAvatarUrl,
    });
    setError(null);
    setInfo(null);
    dispatch({ type: 'setUnauthenticated' });

    // Fire-and-forget server-side session invalidation.
    if (api) {
      api.logout().catch((error) => {
        appLog.warn('Auth logout server call failed', error);
      });
    }
  };

  const updateLocalProfile = (updates: { avatarUrl?: string | null; email?: string }) => {
    const current = getState().authState;

    if (current.type !== 'AUTHENTICATED') {
      return;
    }

    const nextUser = {
      ...current.user,
      ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
      ...(updates.email !== undefined ? { email: updates.email } : {}),
    };

    dispatch({ type: 'setAuthenticated', user: nextUser });
    syncDrafts({
      email: nextUser.email,
      password: '',
      handle: nextUser.userId,
      avatarUrl: nextUser.avatarUrl ?? '',
    });
  };

  return {
    restoreSession,
    setAuthView,
    login,
    register,
    resendVerification,
    forgotPassword,
    verifyEmail,
    resetPassword,
    logout,
    clearError,
    clearInfo,
    updateLocalProfile,
  };
};
