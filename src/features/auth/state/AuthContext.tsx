import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { AuthApi, resolveAuthApiBaseUrlFromEnv } from '../api/authApi.ts';
import { subscribeBassTabApiUnauthorized } from '../../../api/bassTabApi';
import { logClientEvent } from '../../../utils/clientTelemetry';
import { createAuthActions } from './authActions.ts';
import { authReducer } from './authReducer.ts';
import { initialAuthStoreState } from './authTypes.ts';
import type { AuthStoreState } from './authTypes.ts';

type AuthActions = ReturnType<typeof createAuthActions>;

interface AuthContextValue extends AuthStoreState, AuthActions {}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const authApiBaseUrl = resolveAuthApiBaseUrlFromEnv();
  const api = useMemo(
    () => (authApiBaseUrl ? new AuthApi({ baseUrl: authApiBaseUrl }) : null),
    [authApiBaseUrl],
  );
  const [state, dispatch] = useReducer(authReducer, initialAuthStoreState);
  const stateRef = useRef(state);
  const authenticatedSinceRef = useRef<number>(0);

  useEffect(() => {
    stateRef.current = state;

    if (state.authState.type === 'AUTHENTICATED') {
      if (authenticatedSinceRef.current === 0) {
        authenticatedSinceRef.current = Date.now();
      }
      return;
    }

    authenticatedSinceRef.current = 0;
  }, [state]);

  const actions = useMemo(
    () =>
      createAuthActions({
        api,
        dispatch,
        getState: () => stateRef.current,
      }),
    [api],
  );

  useEffect(() => {
    void actions.restoreSession();
  }, [actions]);

  useEffect(() => {
    const unsubscribe = subscribeBassTabApiUnauthorized((event) => {
      const current = stateRef.current.authState;

      if (current.type !== 'AUTHENTICATED') {
        return;
      }

      if (
        authenticatedSinceRef.current !== 0 &&
        event.requestedAt < authenticatedSinceRef.current
      ) {
        logClientEvent('info', 'auth.session_expired_ignored_stale_unauthorized', {
          userId: current.user.userId,
          endpoint: event.url,
          method: event.method,
          status: event.status,
          requestedAt: event.requestedAt,
          authenticatedSince: authenticatedSinceRef.current,
        });
        return;
      }

      logClientEvent('warn', 'auth.session_expired', {
        userId: current.user.userId,
        endpoint: event.url,
        method: event.method,
        status: event.status,
      });

      dispatch({
        type: 'setDraftCredentials',
        email: current.user.email,
        password: '',
        handle: current.user.userId,
        avatarUrl: current.user.avatarUrl ?? '',
      });
      dispatch({ type: 'setUnauthenticated' });
      dispatch({ type: 'setError', errorMessage: 'Session expired. Please sign in again.' });
      dispatch({ type: 'setInfo', infoMessage: null });
      dispatch({ type: 'setLoading', loadingAction: null });
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [actions, state],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used inside AuthProvider.');
  }

  return context;
};
