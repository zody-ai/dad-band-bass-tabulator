import type {
  AuthenticatedResponse,
  LogoutResponse,
  SessionResponse,
  StartAuthResponse,
  UserDto,
} from './authContracts.ts';

type AuthAction = 'session' | 'start' | 'verifyLink' | 'verifyCode' | 'logout';

interface AuthApiOptions {
  baseUrl: string;
}

interface JsonRequestOptions {
  method: 'GET' | 'POST';
  body?: unknown;
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');
const isDevRuntime =
  (typeof globalThis !== 'undefined' &&
    typeof (globalThis as { __DEV__?: unknown }).__DEV__ === 'boolean' &&
    Boolean((globalThis as { __DEV__?: boolean }).__DEV__)) ||
  process.env.NODE_ENV !== 'production';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

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

  const id = asString(record.id);
  const email = asString(record.email);
  const displayName =
    asString(record.displayName) ??
    asString(record.name) ??
    (email ? email.split('@')[0] : null);
  const subscriptionTierRaw = asString(record.subscriptionTier);
  const subscriptionTier =
    subscriptionTierRaw === 'FREE' || subscriptionTierRaw === 'PRO'
      ? subscriptionTierRaw
      : undefined;

  if (!id || !email || !displayName) {
    throw new Error('Invalid user payload.');
  }

  return { id, email, displayName, subscriptionTier };
};

export class AuthApiError extends Error {
  readonly status?: number;
  readonly action?: AuthAction;

  constructor(
    message: string,
    status?: number,
    action?: AuthAction,
  ) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.action = action;
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

  async startAuth(email: string): Promise<StartAuthResponse> {
    const payload = await this.requestJson('start', '/v1/auth/start', {
      method: 'POST',
      body: { email },
    });
    logAuthPayloadShape('start', payload);
    const record = asRecord(payload);

    if (!record || record.status !== 'EMAIL_SENT') {
      throw new AuthApiError('Invalid start auth payload.', undefined, 'start');
    }

    return {
      status: 'EMAIL_SENT',
      maskedEmail: asString(record.maskedEmail) ?? email,
      nextAllowedResendAt: asString(record.nextAllowedResendAt),
    };
  }

  async verifyLink(token: string): Promise<AuthenticatedResponse> {
    const payload = await this.requestJson('verifyLink', '/v1/auth/verify-link', {
      method: 'POST',
      body: { token },
    });
    logAuthPayloadShape('verifyLink', payload);
    return this.parseAuthenticated(payload, 'verifyLink');
  }

  async verifyCode(email: string, code: string): Promise<AuthenticatedResponse> {
    const payload = await this.requestJson('verifyCode', '/v1/auth/verify-code', {
      method: 'POST',
      body: { email, code },
    });
    logAuthPayloadShape('verifyCode', payload);
    return this.parseAuthenticated(payload, 'verifyCode');
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

    const isAuthenticated =
      record &&
      (record.status === 'AUTHENTICATED' || record.authenticated === true);

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

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;

    try {
      response = await globalThis.fetch(url, {
        method: options.method,
        credentials: 'include',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new AuthApiError(`Network request failed: ${detail}`, undefined, action);
    }

    if (!response.ok) {
      let message = `Request failed (${response.status}).`;

      try {
        const json = await response.json();
        const record = asRecord(json);
        const backendMessage =
          (record && (asString(record.message) ?? asString(record.error))) || null;

        if (backendMessage) {
          message = backendMessage;
        }
      } catch (_error) {
        // Ignore parsing failures and keep default message.
      }

      throw new AuthApiError(message, response.status, action);
    }

    try {
      return await response.json();
    } catch (_error) {
      throw new AuthApiError('Response payload was not valid JSON.', response.status, action);
    }
  }
}

export const createAuthApiFromEnv = (): AuthApi | null => {
  const baseUrl = process.env.EXPO_PUBLIC_BASSTAB_API_URL?.trim();
  const productionBaseUrl = 'https://bass-tab-be.onrender.com';
  const isProductionRuntime =
    process.env.NODE_ENV === 'production' ||
    (typeof globalThis !== 'undefined' &&
      typeof (globalThis as { __DEV__?: unknown }).__DEV__ === 'boolean' &&
      !(globalThis as { __DEV__?: boolean }).__DEV__);

  if (baseUrl) {
    return new AuthApi({ baseUrl });
  }

  if (isProductionRuntime) {
    return new AuthApi({ baseUrl: productionBaseUrl });
  }

  return null;
};
