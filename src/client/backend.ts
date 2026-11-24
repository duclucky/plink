import type {
  HeartResponse,
  InitResponse,
  PlayRequest,
  PlayResponse,
  PublishRequest,
  PublishResponse,
  ShelfResponse,
} from '../shared/api';

/** Everything the screens ask of the server. */
export type Backend = {
  init(): Promise<InitResponse>;
  play(request: PlayRequest): Promise<PlayResponse>;
  /** `from` skips that many of the newest tunes, for a later page. */
  shelf(day: number, from?: number): Promise<ShelfResponse>;
  publish(request: PublishRequest): Promise<PublishResponse>;
  heart(id: string): Promise<HeartResponse>;
};

const call = async <T>(path: string, body?: unknown): Promise<T> => {
  const response = await fetch(
    path,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: T = await response.json();
  return data;
};

export const httpBackend: Backend = {
  init: () => call('/api/init'),
  play: (request) => call('/api/play', request),
  shelf: (day, from = 0) => call(`/api/shelf?day=${day}&from=${from}`),
  publish: (request) => call('/api/tune', request),
  heart: (id) => call('/api/heart', { id }),
};
