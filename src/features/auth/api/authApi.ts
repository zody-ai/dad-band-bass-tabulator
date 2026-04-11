import type {
  AuthenticatedResponse,
  ForgotPasswordRequest,
  LoginRequest,
  LogoutResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
  SessionResponse,
  UserDto,
  VerifyEmailRequest,
} from './authContracts.ts';
import { logClientEvent } from '../../../utils/clientTelemetry';

type AuthAction =
  | 'session'
  | 'register'
  | 'verifyEmail'
  | 'resendVerification'
  | 'login'
  | 'forgotPassword'
  | 'resetPassword'
  | 'logout';

const authRequestTimeoutMs: Record<AuthAction, number> = {
  session: 5000,
  register: 15000,
  verifyEmail: 15000,
  resendVerification: 15000,
  login: 15000,
  forgotPassword: 15000,
  resetPassword: 15000,
  logout: 5000,
};

interface AuthApiOptions {
  baseUrl: string;
}

interface JsonRequestOptions {
  method: 'GET' | 'POST';
  body?: unknown;
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const shouldSendNgrokBypassHeader = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes('ngrok');
  } catch (_error) {
    return false;
  }
};

const normalizeHeaderNames = (headers: HeadersInit | undefined): string[] => {
  if (!headers) {
    return [];
  }

  if (headers instanceof Headers) {
    return Array.from(headers.keys());
  }

  if (Array.isArray(headers)) {
    return headers.map(([name]) => name);
  }

  return Object.keys(headers);
};
const isDevRuntime =
  (typeof globalThis !== 'undefined' &&
    typeof (globalThis as { __DEV__?: unknown }).__DEV__ === 'boolean' &&
    Boolean((globalThis as { __DEV__?: boolean }).__DEV__)) ||
  process.env.NODE_ENV !== 'production';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : value === null ? null : null;

const logAuthPayloadShape = (action: AuthAction, payload: unknown) => {
  if (!isDevRuntime) {
    return;
  }

  const record = asRecord(payload);

  if (!record) {
    console.info(`[Auth Debug] ${action} payload type=${typeof payload}`);
    return;
  }

  const topLevelKeys = Object.keys(record).join(',');
  const userRecord = asRecord(record.user);
  const userKeys = userRecord ? Object.keys(userRecord).join(',') : '';
  const status = asString(record.status);
  const authenticatedFlag = record.authenticated;

  console.info(
    `[Auth Debug] ${action} keys=[${topLevelKeys}] status=${status ?? 'n/a'} authenticated=${String(authenticatedFlag)} userKeys=[${userKeys}]`,
  );
};

const parseUserDto = (value: unknown): UserDto => {
  const record = asRecord(value);

  if (!record) {
    throw new Error('Invalid user payload.');
  }

  const userId =
    asString(record.userId) ?? asString(record.handle) ?? asString(record.username) ?? asString(record.id);
  const id = asString(record.id) ?? userId;
  const email = asString(record.email);
  const displayName =
    asString(record.displayName) ?? asString(record.handle) ?? userId ?? (email ? email.split('@')[0] : null);
  const avatarUrl = asNullableString(record.avatarUrl);
  const subscriptionTierRaw = asString(record.subscriptionTier);
  const subscriptionTier =
    subscriptionTierRaw === 'FREE' || subscriptionTierRaw === 'PRO'
      ? subscriptionTierRaw
      : undefined;

  if (!id || !userId || !email || !displayName) {
    throw new Error('Invalid user payload.');
  }

  return { id, userId, email, displayName, avatarUrl, subscriptionTier };
};

export class AuthApiError extends Error {
  readonly status?: number;
  readonly action?: AuthAction;
  readonly code?: string;

  constructor(
    message: string,
    status?: number,
    action?: AuthAction,
    code?: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.action = action;
    this.code = code;
  }
}

export class AuthApi {
  private readonly options: AuthApiOptions;

  constructor(options: AuthApiOptions) {
    this.options = options;
  }

  async getSession(): Promise<SessionResponse> {
    const payload = await this.requestJson('session', '/v1/auth/session', {
      method: 'GET',
    });
    logAuthPayloadShape('session', payload);
    const record = asRecord(payload);

    if (!record || record.authenticated !== true) {
      throw new AuthApiError('Invalid session payload.', undefined, 'session');
    }

    return {
      authenticated: true,
      user: parseUserDto(record.user),
    };
  }

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const responsePayload = await this.requestJson('register', '/v1/auth/register', {
      method: 'POST',
      body: payload,
    });
    logAuthPayloadShape('register', responsePayload);
    const record = asRecord(responsePayload);

    if (!record || record.status !== 'VERIFICATION_EMAIL_SENT') {
      throw new AuthApiError('Invalid registration payload.', undefined, 'register');
    }

    return {
      status: 'VERIFICATION_EMAIL_SENT',
      maskedEmail: asString(record.maskedEmail) ?? payload.email,
    };
  }

  async verifyEmail(payload: VerifyEmailRequest): Promise<AuthenticatedResponse> {
    const responsePayload = await this.requestJson('verifyEmail', '/v1/auth/verify-email', {
      method: 'POST',
      body: payload,
    });
    logAuthPayloadShape('verifyEmail', responsePayload);
    return this.parseAuthenticated(responsePayload, 'verifyEmail');
  }

  async login(payload: LoginRequest): Promise<AuthenticatedResponse> {
    const responsePayload = await this.requestJson('login', '/v1/auth/login', {
      method: 'POST',
      body: payload,
    });
    logAuthPayloadShape('login', responsePayload);
    return this.parseAuthenticated(responsePayload, 'login');
  }

  async resendVerification(payload: ResendVerificationRequest): Promise<void> {
    await this.requestJson('resendVerification', '/v1/auth/resend-verification', {
      method: 'POST',
      body: payload,
    });
  }

  async forgotPassword(payload: ForgotPasswordRequest): Promise<void> {
    await this.requestJson('forgotPassword', '/v1/auth/forgot-password', {
      method: 'POST',
      body: payload,
    });
  }

  async resetPassword(payload: ResetPasswordRequest): Promise<void> {
    await this.requestJson('resetPassword', '/v1/auth/reset-password', {
      method: 'POST',
      body: payload,
    });
  }

  async logout(): Promise<LogoutResponse> {
    const payload = await this.requestJson('logout', '/v1/auth/logout', {
      method: 'POST',
    });
    logAuthPayloadShape('logout', payload);
    const record = asRecord(payload);

    if (!record || record.status !== 'SIGNED_OUT') {
      throw new AuthApiError('Invalid logout payload.', undefined, 'logout');
    }

    return { status: 'SIGNED_OUT' };
  }

  private parseAuthenticated(payload: unknown, action: AuthAction): AuthenticatedResponse {
    const record = asRecord(payload);
    const isAuthenticated = record && (record.status === 'AUTHENTICATED' || record.authenticated === true);

    if (!record || !isAuthenticated) {
      throw new AuthApiError('Invalid authentication payload.', undefined, action);
    }

    return {
      status: 'AUTHENTICATED',
      user: parseUserDto(record.user),
    };
  }

  private async requestJson(
    action: AuthAction,
    path: string,
    options: JsonRequestOptions,
  ): Promise<unknown> {
    const baseUrl = trimTrailingSlash(this.options.baseUrl);
    const url = `${baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (shouldSendNgrokBypassHeader(url)) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    const requestInit: RequestInit = {
      method: options.method,
      credentials: 'include',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    };
    const timeoutMs = authRequestTimeoutMs[action];
    const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutHandle =
      abortController && typeof globalThis.setTimeout === 'function'
        ? globalThis.setTimeout(() => {
          abortController.abort();
        }, timeoutMs)
        : null;

    if (abortController) {
      requestInit.signal = abortController.signal;
    }

    logClientEvent('info', 'auth.fetch_start', {
      action,
      url,
      method: requestInit.method ?? 'GET',
      credentials: requestInit.credentials ?? 'default',
      mode: requestInit.mode ?? 'default',
      hasBody: Boolean(requestInit.body),
      headerNames: normalizeHeaderNames(requestInit.headers),
    });

    try {
      response = await globalThis.fetch(url, requestInit);
      logClientEvent('info', 'auth.fetch_response', {
        action,
        url,
        method: requestInit.method ?? 'GET',
        status: response.status,
        ok: response.ok,
      });
    } catch (error) {
      if (timeoutHandle !== null) {
        globalThis.clearTimeout(timeoutHandle);
      }
      const detail = error instanceof Error ? error.message : String(error);
      const isTimeout =
        error instanceof Error &&
        (error.name === 'AbortError' || detail.toLowerCase().includes('aborted'));
      logClientEvent('error', 'auth.fetch_error', {
        action,
        url,
        method: requestInit.method ?? 'GET',
        error: detail,
        name: error instanceof Error ? error.name : 'UnknownError',
      });
      if (isTimeout) {
        throw new AuthApiError(`Network request timed out after ${timeoutMs}ms.`, undefined, action, 'REQUEST_TIMEOUT');
      }
      throw new AuthApiError(`Network request failed: ${detail}`, undefined, action);
    } finally {
      if (timeoutHandle !== null) {
        globalThis.clearTimeout(timeoutHandle);
      }
    }

    if (!response.ok) {
      let message = `Request failed (${response.status}).`;
      let code: string | undefined;

      try {
        const json = await response.json();
        const record = asRecord(json);
        const errorRecord = asRecord(record?.error);
        code = asString(errorRecord?.code) ?? asString(record?.code) ?? undefined;
        message =
          asString(errorRecord?.message) ??
          asString(record?.message) ??
          asString(record?.error) ??
          message;
      } catch (_error) {
        // Ignore parsing failures and keep default message.
      }

      throw new AuthApiError(message, response.status, action, code);
    }

    if (response.status === 202 || response.status === 204) {
      return null;
    }

    const text = await response.text();

    if (!text.trim()) {
      return null;
    }

    try {
      return JSON.parse(text) as unknown;
    } catch (_error) {
      throw new AuthApiError('Response payload was not valid JSON.', response.status, action);
    }
  }
}

const productionBaseUrl = 'https://bass-tab-be-production.up.railway.app';
const isProductionRuntime =
  process.env.NODE_ENV === 'production' ||
  (typeof globalThis !== 'undefined' &&
    typeof (globalThis as { __DEV__?: unknown }).__DEV__ === 'boolean' &&
    !(globalThis as { __DEV__?: boolean }).__DEV__);

export const resolveAuthApiBaseUrlFromEnv = (): string | null => {
  const baseUrl = process.env.EXPO_PUBLIC_BASSTAB_API_URL?.trim();

  if (baseUrl) {
    return trimTrailingSlash(baseUrl);
  }

  if (isProductionRuntime) {
    return productionBaseUrl;
  }

  return null;
};

export const createAuthApiFromEnv = (): AuthApi | null => {
  const resolvedBaseUrl = resolveAuthApiBaseUrlFromEnv();
  return resolvedBaseUrl ? new AuthApi({ baseUrl: resolvedBaseUrl }) : null;
};
