import type { Play, ScaleId, TuneError } from './game';

export type Me = {
  loggedIn: boolean;
  name: string | null;
  streak: number;
  best: number;
  /** Checks used on each of the last seven boxes, oldest first; null = not played, 0 = not solved. */
  roll: (number | null)[];
};

export type DailyView = {
  day: number;
  scale: ScaleId;
  notes: number[];
  title: string | null;
  credit: string | null;
};

export type TuneCard = {
  id: string;
  day: number;
  name: string;
  author: string;
  house: boolean;
  scale: ScaleId;
  notes: number[];
  hearts: number;
  solves: number;
  mine: boolean;
  hearted: boolean;
  play: Play | null;
};

/** People who finished the daily box in 1..5 checks. */
export type Histogram = [number, number, number, number, number];

export type InitResponse = {
  type: 'init';
  today: number;
  /** Milliseconds until the next box opens, by the server's clock. */
  nextIn: number;
  daily: DailyView;
  play: Play | null;
  histogram: Histogram;
  encore: TuneCard | null;
  me: Me;
  shelfCount: number;
  myTuneId: string | null;
};

export type PlayRequest = {
  /** 'daily' or a tune id. */
  id: string;
  day: number;
  guesses: number[][];
};

export type PlayResponse = {
  type: 'play';
  play: Play;
  histogram: Histogram | null;
  me: Me | null;
  solves: number | null;
};

export type ShelfResponse = {
  type: 'shelf';
  day: number;
  top: TuneCard[];
  fresh: TuneCard[];
  house: TuneCard[];
  mine: TuneCard | null;
  canPublish: boolean;
};

export type PublishRequest = { scale: ScaleId; notes: number[] };

export type PublishError =
  TuneError | 'login' | 'locked' | 'already' | 'duplicate';

export type PublishResponse =
  | { type: 'tune'; ok: true; tune: TuneCard }
  | { type: 'tune'; ok: false; error: PublishError };

export type HeartRequest = { id: string };

export type HeartResponse = {
  type: 'heart';
  ok: boolean;
  hearts: number;
};

export type ErrorResponse = { type: 'error'; message: string };

export const PUBLISH_ERRORS: Record<PublishError, string> = {
  scale: 'Pick one of the five moods.',
  length: 'A tune needs 6 to 10 pins.',
  notes: 'Every column needs one pin.',
  flat: 'Use at least three different notes.',
  login: 'Log in to Reddit to pin a tune.',
  locked: "Fix today's box first, then pin your own.",
  already: 'You already pinned a tune today. Come back tomorrow.',
  duplicate: 'Someone pinned that exact tune today. Change a note.',
};
