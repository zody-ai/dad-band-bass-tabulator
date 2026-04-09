import {
  CommunitySongCardDto,
  CommunitySongDetailDto,
  CommunitySavedSongDto,
  CommunitySongVotesDto,
  AiGenerateSongRequestDto,
  CreateSongRequestDto,
  MockUpgradeRequestDto,
  parsePlaylistDto,
  parseCommunitySongCardListDto,
  parseCommunitySongCardDto,
  parseCommunitySongDetailDto,
  parseCommunitySavedSongsDto,
  parseCommunitySongVotesDto,
  parseSongMetadataListDto,
  parseSongDto,
  parseSongMetadataDto,
  parseSongChartDto,
  parseSubscriptionCapabilityDefaultsDto,
  parseSubscriptionDowngradeResponseDto,
  parseSubscriptionPricingDto,
  parseSubscriptionSnapshotDto,
  parseSubscriptionUpgradeResponseDto,
  PlaylistDto,
  SaveCommunitySongRequestDto,
  SubscriptionCapabilityDefaultsDto,
  SubscriptionDowngradeRequestDto,
  SubscriptionDowngradeResponseDto,
  SubscriptionPricingDto,
  SubscriptionSnapshotDto,
  SubscriptionUpgradeRequestDto,
  SubscriptionUpgradeResponseDto,
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
  listCommunitySongs(): Promise<CommunitySongCardDto[]>;
  getCommunitySong(publishedSongId: string): Promise<CommunitySongDetailDto>;
  createSong(payload: CreateSongRequestDto): Promise<SongDto>;
  aiGenerateSong(payload: AiGenerateSongRequestDto): Promise<SongDto>;
  updateSongMetadata(songId: string, payload: UpdateSongMetadataRequestDto): Promise<SongMetadataDto>;
  publishSong(songId: string): Promise<void>;
  unlistPublishedSong(publishedSongId: string): Promise<void>;
  replaceSongChart(songId: string, payload: ReplaceSongChartRequestDto): Promise<SongChartDto>;
  deleteSong(songId: string): Promise<void>;
  getPlaylist(): Promise<PlaylistDto>;
  replacePlaylistOrder(payload: ReplacePlaylistOrderRequestDto): Promise<PlaylistDto>;
  getSubscription(): Promise<SubscriptionSnapshotDto>;
  getSubscriptionPricing(): Promise<SubscriptionPricingDto>;
  getSubscriptionCapabilityDefaults(): Promise<SubscriptionCapabilityDefaultsDto>;
  upgrade(payload: SubscriptionUpgradeRequestDto): Promise<SubscriptionUpgradeResponseDto>;
  downgrade(payload: SubscriptionDowngradeRequestDto): Promise<SubscriptionDowngradeResponseDto>;
  mockUpgrade(payload: MockUpgradeRequestDto): Promise<SubscriptionSnapshotDto>;
  mockDowngrade(): Promise<SubscriptionSnapshotDto>;
  listSavedCommunitySongs(): Promise<CommunitySavedSongDto[]>;
  saveCommunitySong(payload: SaveCommunitySongRequestDto): Promise<CommunitySavedSongDto>;
  importCommunitySong(publishedSongId: string): Promise<{ song: SongDto; status: number }>;
  voteCommunitySongUp(songId: string): Promise<CommunitySongVotesDto>;
  voteCommunitySongDown(songId: string): Promise<CommunitySongVotesDto>;
  clearCommunitySongVote(songId: string): Promise<CommunitySongVotesDto>;
  adoptCommunitySong(publishedSongId: string): Promise<CommunitySongCardDto>;
  disownCommunitySong(publishedSongId: string): Promise<void>;
}

export interface BassTabApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

type UnauthorizedListener = () => void;

const unauthorizedListeners = new Set<UnauthorizedListener>();

export const subscribeBassTabApiUnauthorized = (listener: UnauthorizedListener): (() => void) => {
  unauthorizedListeners.add(listener);

  return () => {
    unauthorizedListeners.delete(listener);
  };
};

const notifyBassTabApiUnauthorized = () => {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('BassTab API unauthorized listener failed', error);
    }
  });
};

interface ApiErrorPayload {
  error?: string;
  code?: string;
  message?: string;
}

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
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

  async listCommunitySongs(): Promise<CommunitySongCardDto[]> {
    return this.request('/v1/community', { method: 'GET' }, parseCommunitySongCardListDto);
  }

  async getCommunitySong(publishedSongId: string): Promise<CommunitySongDetailDto> {
    return this.request(
      `/v1/community/${encodeURIComponent(publishedSongId)}`,
      { method: 'GET' },
      parseCommunitySongDetailDto,
    );
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

  async aiGenerateSong(payload: AiGenerateSongRequestDto): Promise<SongDto> {
    return this.request(
      '/v1/songs/ai-generate',
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

  async publishSong(songId: string): Promise<void> {
    await this.request(
      `/v1/songs/${encodeURIComponent(songId)}/publish`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({}),
      },
      () => undefined,
    );
  }

  async unlistPublishedSong(publishedSongId: string): Promise<void> {
    await this.request(
      `/v1/community/${encodeURIComponent(publishedSongId)}/unlist`,
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

  async getSubscriptionCapabilityDefaults(): Promise<SubscriptionCapabilityDefaultsDto> {
    return this.request(
      '/v1/subscription/capabilities/defaults',
      { method: 'GET' },
      parseSubscriptionCapabilityDefaultsDto,
    );
  }

  async upgrade(payload: SubscriptionUpgradeRequestDto): Promise<SubscriptionUpgradeResponseDto> {
    return this.request(
      '/v1/subscription/upgrade',
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      parseSubscriptionUpgradeResponseDto,
    );
  }

  async downgrade(payload: SubscriptionDowngradeRequestDto): Promise<SubscriptionDowngradeResponseDto> {
    return this.request(
      '/v1/subscription/downgrade',
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      parseSubscriptionDowngradeResponseDto,
    );
  }

  async mockUpgrade(payload: MockUpgradeRequestDto): Promise<SubscriptionSnapshotDto> {
    return this.request(
      '/v1/subscription/mock/upgrade',
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
      '/v1/subscription/mock/downgrade',
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

  async importCommunitySong(publishedSongId: string): Promise<{ song: SongDto; status: number }> {
    const { data, status } = await this.requestWithStatus(
      `/v1/songs/community/import/${encodeURIComponent(publishedSongId)}`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({}),
      },
      parseSongDto,
    );

    return { song: data, status };
  }

  async voteCommunitySongUp(songId: string): Promise<CommunitySongVotesDto> {
    return this.request(
      `/v1/community/${encodeURIComponent(songId)}/vote/up`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({}),
      },
      parseCommunitySongVotesDto,
    );
  }

  async voteCommunitySongDown(songId: string): Promise<CommunitySongVotesDto> {
    return this.request(
      `/v1/community/${encodeURIComponent(songId)}/vote/down`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({}),
      },
      parseCommunitySongVotesDto,
    );
  }

  async clearCommunitySongVote(songId: string): Promise<CommunitySongVotesDto> {
    return this.request(
      `/v1/community/${encodeURIComponent(songId)}/vote`,
      { method: 'DELETE' },
      parseCommunitySongVotesDto,
    );
  }

  async adoptCommunitySong(publishedSongId: string): Promise<CommunitySongCardDto> {
    return this.request(
      `/v1/community/${encodeURIComponent(publishedSongId)}/adopt`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({}),
      },
      parseCommunitySongCardDto,
    );
  }

  async disownCommunitySong(publishedSongId: string): Promise<void> {
    await this.request(
      `/v1/community/${encodeURIComponent(publishedSongId)}/disown`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({}),
      },
      () => undefined,
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    parse: (payload: unknown) => T,
  ): Promise<T> {
    const { data } = await this.requestWithStatus(path, init, parse);
    return data;
  }

  private async requestWithStatus<T>(
    path: string,
    init: RequestInit,
    parse: (payload: unknown) => T,
  ): Promise<{ data: T; status: number }> {
    const url = joinPath(this.options.baseUrl, path);
    const method = init.method ?? 'GET';
    let response: Response;

    console.info(`[BassTab API] ${method} ${url}`);

    try {
      response = await this.fetchImpl(url, {
        ...init,
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...init.headers,
        },
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`BassTab API request failed (${method} ${url}): ${detail}`);
    }

    if (!response.ok) {
      if (response.status === 401) {
        notifyBassTabApiUnauthorized();
      }

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
      return { data: parse(undefined), status: response.status };
    }

    const json = await response.json();
    if (__DEV__) {
      console.info('[BassTab API] response body', JSON.stringify(json));
    }
    return { data: parse(json), status: response.status };
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
    console.info('[BassTabApi] env backend base URL detected', baseUrl);
    return createBassTabApi({ baseUrl });
  }

  if (isProductionRuntime) {
    console.info('[BassTabApi] production runtime detected, using default API host', productionBaseUrl);
    return createBassTabApi({ baseUrl: productionBaseUrl });
  }

  return null;
};
