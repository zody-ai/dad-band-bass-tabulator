import {
  CommunitySavedSongDto,
  CreateSongRequestDto,
  MockUpgradeRequestDto,
  parsePlaylistDto,
  parseCommunitySavedSongsDto,
  parseSubscriptionPricingDto,
  parseSubscriptionSnapshotDto,
  parseSongChartDto,
  parseSongDto,
  parseSongMetadataDto,
  parseSongMetadataListDto,
  PlaylistDto,
  SaveCommunitySongRequestDto,
  SubscriptionPricingDto,
  SubscriptionSnapshotDto,
  ReplacePlaylistOrderRequestDto,
  ReplaceSongChartRequestDto,
  SongChartDto,
  SongDto,
  SongMetadataDto,
  UpdateSongMetadataRequestDto,
} from './contracts';

export interface BassTabApi {
  listSongs(): Promise<SongMetadataDto[]>;
  getSong(songId: string, options?: { mode?: 'PDF' }): Promise<SongDto>;
  listCommunitySongs(): Promise<SongMetadataDto[]>;
  getCommunitySong(songId: string): Promise<SongDto>;
  createSong(payload: CreateSongRequestDto): Promise<SongDto>;
  updateSongMetadata(songId: string, payload: UpdateSongMetadataRequestDto): Promise<SongMetadataDto>;
  releaseSongToCommunity(songId: string): Promise<void>;
  unreleaseSongFromCommunity(songId: string): Promise<void>;
  replaceSongChart(songId: string, payload: ReplaceSongChartRequestDto): Promise<SongChartDto>;
  deleteSong(songId: string): Promise<void>;
  getPlaylist(): Promise<PlaylistDto>;
  replacePlaylistOrder(payload: ReplacePlaylistOrderRequestDto): Promise<PlaylistDto>;
  getSubscription(): Promise<SubscriptionSnapshotDto>;
  getSubscriptionPricing(): Promise<SubscriptionPricingDto>;
  mockUpgrade(payload: MockUpgradeRequestDto): Promise<SubscriptionSnapshotDto>;
  mockDowngrade(): Promise<SubscriptionSnapshotDto>;
  listSavedCommunitySongs(): Promise<CommunitySavedSongDto[]>;
  saveCommunitySong(payload: SaveCommunitySongRequestDto): Promise<CommunitySavedSongDto>;
}

export interface BassTabApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

interface ApiErrorPayload {
  error?: string;
  code?: string;
  message?: string;
}

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const joinPath = (baseUrl: string, path: string): string =>
  `${trimTrailingSlash(baseUrl)}${path.startsWith('/') ? path : `/${path}`}`;

export class HttpBassTabApi implements BassTabApi {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: BassTabApiClientOptions) {
    if (options.fetchImpl) {
      this.fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) =>
        options.fetchImpl!.call(globalThis, input, init)) as typeof fetch;
      return;
    }

    if (typeof globalThis.fetch !== 'function') {
      throw new Error('BassTab API requires fetch to be available in this runtime.');
    }

    this.fetchImpl = globalThis.fetch.bind(globalThis);
  }

  async listSongs(): Promise<SongMetadataDto[]> {
    return this.request('/v1/songs', { method: 'GET' }, parseSongMetadataListDto);
  }

  async getSong(songId: string, options?: { mode?: 'PDF' }): Promise<SongDto> {
    const query = options?.mode ? `?mode=${encodeURIComponent(options.mode)}` : '';
    return this.request(`/v1/songs/${encodeURIComponent(songId)}${query}`, { method: 'GET' }, parseSongDto);
  }

  async listCommunitySongs(): Promise<SongMetadataDto[]> {
    return this.request('/v1/community/songs', { method: 'GET' }, parseSongMetadataListDto);
  }

  async getCommunitySong(songId: string): Promise<SongDto> {
    return this.request(`/v1/community/songs/${encodeURIComponent(songId)}`, { method: 'GET' }, parseSongDto);
  }

  async createSong(payload: CreateSongRequestDto): Promise<SongDto> {
    return this.request(
      '/v1/songs',
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      parseSongDto,
    );
  }

  async updateSongMetadata(
    songId: string,
    payload: UpdateSongMetadataRequestDto,
  ): Promise<SongMetadataDto> {
    return this.request(
      `/v1/songs/${encodeURIComponent(songId)}/metadata`,
      {
        method: 'PATCH',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      parseSongMetadataDto,
    );
  }

  async releaseSongToCommunity(songId: string): Promise<void> {
    await this.request(
      `/v1/songs/${encodeURIComponent(songId)}/community/release`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({}),
      },
      () => undefined,
    );
  }

  async unreleaseSongFromCommunity(songId: string): Promise<void> {
    await this.request(
      `/v1/songs/${encodeURIComponent(songId)}/community/unrelease`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({}),
      },
      () => undefined,
    );
  }

  async replaceSongChart(songId: string, payload: ReplaceSongChartRequestDto): Promise<SongChartDto> {
    return this.request(
      `/v1/songs/${encodeURIComponent(songId)}/chart`,
      {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      parseSongChartDto,
    );
  }

  async deleteSong(songId: string): Promise<void> {
    await this.request(`/v1/songs/${encodeURIComponent(songId)}`, { method: 'DELETE' }, () => undefined);
  }

  async getPlaylist(): Promise<PlaylistDto> {
    return this.request('/v1/playlist', { method: 'GET' }, parsePlaylistDto);
  }

  async replacePlaylistOrder(payload: ReplacePlaylistOrderRequestDto): Promise<PlaylistDto> {
    return this.request(
      '/v1/playlist/order',
      {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      parsePlaylistDto,
    );
  }

  async getSubscription(): Promise<SubscriptionSnapshotDto> {
    return this.request('/v1/subscription', { method: 'GET' }, parseSubscriptionSnapshotDto);
  }

  async getSubscriptionPricing(): Promise<SubscriptionPricingDto> {
    return this.request('/v1/subscription/pricing', { method: 'GET' }, parseSubscriptionPricingDto);
  }

  async mockUpgrade(payload: MockUpgradeRequestDto): Promise<SubscriptionSnapshotDto> {
    return this.request(
      '/v1/subscription/mock-upgrade',
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      parseSubscriptionSnapshotDto,
    );
  }

  async mockDowngrade(): Promise<SubscriptionSnapshotDto> {
    return this.request(
      '/v1/subscription/mock-downgrade',
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({}),
      },
      parseSubscriptionSnapshotDto,
    );
  }

  async listSavedCommunitySongs(): Promise<CommunitySavedSongDto[]> {
    return this.request('/v1/community/saved', { method: 'GET' }, parseCommunitySavedSongsDto);
  }

  async saveCommunitySong(payload: SaveCommunitySongRequestDto): Promise<CommunitySavedSongDto> {
    return this.request(
      '/v1/community/saved',
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      (value) => {
        const parsed = parseCommunitySavedSongsDto([value]);
        return parsed[0];
      },
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    parse: (payload: unknown) => T,
  ): Promise<T> {
    const url = joinPath(this.options.baseUrl, path);
    const method = init.method ?? 'GET';
    let response: Response;

    console.info(`[BassTab API] ${method} ${url}`);

    try {
      response = await this.fetchImpl(url, {
        ...init,
        credentials: 'include',
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`BassTab API request failed (${method} ${url}): ${detail}`);
    }

    if (!response.ok) {
      let errorDetail = '';
      let payload: ApiErrorPayload | null = null;

      try {
        const text = await response.text();
        errorDetail = text;

        if (text) {
          try {
            const parsed = JSON.parse(text) as unknown;

            if (parsed && typeof parsed === 'object') {
              const record = parsed as Record<string, unknown>;
              payload = {
                error: typeof record.error === 'string' ? record.error : undefined,
                code: typeof record.code === 'string' ? record.code : undefined,
                message: typeof record.message === 'string' ? record.message : undefined,
              };

              if (payload.message) {
                errorDetail = payload.message;
              } else if (payload.error && payload.code) {
                errorDetail = `${payload.error} (${payload.code})`;
              }
            }
          } catch (_error) {
            // Keep text as-is when response body isn't JSON.
          }
        }
      } catch (_error) {
        errorDetail = errorDetail || '';
      }

      const detailSuffix = errorDetail ? ` - ${errorDetail}` : '';
      throw new BassTabApiError(
        `BassTab API ${response.status} ${response.statusText}${detailSuffix}`,
        response.status,
        payload?.error,
        payload?.code,
      );
    }

    if (response.status === 204) {
      return parse(undefined);
    }

    return parse(await response.json());
  }
}

export class BassTabApiError extends Error {
  readonly status: number;
  readonly errorType?: string;
  readonly code?: string;

  constructor(message: string, status: number, errorType?: string, code?: string) {
    super(message);
    this.name = 'BassTabApiError';
    this.status = status;
    this.errorType = errorType;
    this.code = code;
  }
}

export const createBassTabApi = (options: BassTabApiClientOptions): BassTabApi =>
  new HttpBassTabApi(options);

const productionBaseUrl = 'https://bass-tab-be.onrender.com';
const isProductionRuntime =
  process.env.NODE_ENV === 'production' ||
  (typeof globalThis !== 'undefined' &&
    typeof (globalThis as { __DEV__?: unknown }).__DEV__ === 'boolean' &&
    !(globalThis as { __DEV__?: boolean }).__DEV__);

export const createBassTabApiFromEnv = (): BassTabApi | null => {
  const baseUrl = process.env.EXPO_PUBLIC_BASSTAB_API_URL?.trim();

  if (baseUrl) {
    return createBassTabApi({ baseUrl });
  }

  if (isProductionRuntime) {
    return createBassTabApi({ baseUrl: productionBaseUrl });
  }

  return null;
};
