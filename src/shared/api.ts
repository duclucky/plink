import type { Play, ScaleId, TuneError } from './game';

export type Me = {
  loggedIn: boolean;
  name: string | null;
  streak: number;
  best: number;
  /** Checks used on each of the last seven boxes, oldest first; null = not played, 0 = not solved. */
  roll: (number | null)[];
  /** Snoovatar image, when Reddit has one. */
  avatar: string | null;
  /** May take any tune off the shelf. */
  moderator: boolean;
  /** Asked to wear the streak as user flair. */
  flair: boolean;
};

export type DailyView = {
  day: number;
  scale: ScaleId;
  notes: number[];
  /** The tune's real name, shown once the box is finished. */
  title: string;
  credit: string;
};

export type TuneCard = {
  id: string;
  day: number;
  name: string;
  author: string;
  /** The author's snoovatar, when Reddit has one. */
  avatar: string | null;
  house: boolean;
  scale: ScaleId;
  notes: number[];
  hearts: number;
  solves: number;
  mine: boolean;
  hearted: boolean;
  play: Play | null;
};

/** People who fixed the daily box in 1..4 checks, then people who missed it. */
export type Histogram = [number, number, number, number, number];

export type InitResponse = {
  type: 'init';
  today: number;
  /** Milliseconds until the next box opens, by the server's clock. */
  nextIn: number;
  daily: DailyView;
  play: Play | null;
  histogram: Histogram;
  /** Times this player heard the tune before finishing, once finished. */
  listens: number | null;
  /** Whether this player already posted the result as a comment. */
  commented: boolean;
  encore: TuneCard | null;
  /** How the tune this player pinned yesterday did. */
  news: TuneNews | null;
  /** Snoovatars of a few redditors who fixed this box. */
  faces: string[];
  me: Me;
  /** Tunes pinned by redditors on this box's day. */
  shelfCount: number;
  myTuneId: string | null;
};

export type TuneNews = {
  id: string;
  name: string;
  solves: number;
  hearts: number;
  /** It is today's Encore. */
  encore: boolean;
};

export type PlayRequest = {
  /** 'daily' or a tune id. */
  id: string;
  day: number;
  guesses: number[][];
  /** Times the player has heard the tune so far. */
  listens?: number;
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
  /** Where the next page of `fresh` starts, or null on the last page. */
  nextFresh: number | null;
  house: TuneCard[];
  mine: TuneCard | null;
  canPublish: boolean;
};

export type PublishRequest = {
  scale: ScaleId;
  notes: number[];
  /** The day the player believes it is; a mismatch means a new box opened. */
  day?: number;
};

export type RemoveResponse = { type: 'remove'; ok: boolean };
export type ReportResponse = { type: 'report'; ok: boolean };
export type CommentPreview = { type: 'preview'; text: string };
export type CommentResponse = { type: 'comment'; ok: boolean };
export type FlairResponse = { type: 'flair'; ok: boolean; text: string };

export type PublishError =
  TuneError | 'login' | 'locked' | 'already' | 'duplicate' | 'newday';

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
  newday:
    'A new box opened while you were writing. Your tune is kept: fix the new box, then pin it.',
};
