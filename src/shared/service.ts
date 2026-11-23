import type {
  DailyView,
  HeartResponse,
  Histogram,
  InitResponse,
  Me,
  PlayRequest,
  PlayResponse,
  PublishResponse,
  ShelfResponse,
  TuneCard,
} from './api';
import { DAY_MS, dayNumber, dayStart } from './day';
import {
  MAX_CHECKS,
  decodeNotes,
  encodeNotes,
  evaluate,
  isGuess,
  isPrefix,
  isScaleId,
  signature,
  tuneError,
  tuneName,
  type Play,
  type ScaleId,
} from './game';
import {
  WORKSHOP_AUTHOR,
  WORKSHOP_COUNT,
  dailyPuzzle,
  parseWorkshopId,
  workshopId,
  workshopTune,
} from './melodies';
import type { Store } from './store';

export type Actor = {
  userId: string | undefined;
  username: string | undefined;
};

export class ServiceError extends Error {
  readonly status: 400 | 404;
  constructor(status: 400 | 404, message: string) {
    super(message);
    this.status = status;
  }
}

const SHELF_PAGE = 20;
const ROLL_DAYS = 7;
const DAILY = 'daily';

const keys = {
  plays: (day: number, userId: string) => `plays:${day}:${userId}`,
  hist: (day: number) => `hist:${day}`,
  user: (userId: string) => `user:${userId}`,
  roll: (userId: string) => `roll:${userId}`,
  top: (day: number) => `shelf:${day}:top`,
  fresh: (day: number) => `shelf:${day}:new`,
  tune: (id: string) => `tune:${id}`,
  tuneBy: (day: number) => `tuneby:${day}`,
  tuneSig: (day: number) => `tunesig:${day}`,
  hearts: (id: string) => `hearts:${id}`,
  encore: (day: number) => `encore:${day}`,
  seq: (day: number) => `tuneseq:${day}`,
};

const noPlays: Record<string, string> = {};

const doneField = (id: string) => `${id}!`;

const toCount = (text: string | undefined) => {
  const n = Number(text ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

const parseGuesses = (text: string | undefined) =>
  text ? text.split(',').map(decodeNotes) : [];

const playFrom = (notes: readonly number[], text: string | undefined) => {
  const guesses = parseGuesses(text).filter((g) => g.length === notes.length);
  return guesses.length > 0 ? evaluate(notes, guesses) : null;
};

const clampDay = (day: number | undefined, today: number) =>
  day !== undefined && Number.isInteger(day) && day >= 1 && day <= today
    ? day
    : today;

type StoredTune = {
  id: string;
  day: number;
  scale: ScaleId;
  notes: number[];
  author: string;
  authorId: string | null;
  house: boolean;
  hearts: number;
  solves: number;
  seq: number;
};

const loadTune = async (
  store: Store,
  id: string
): Promise<StoredTune | null> => {
  const fields = await store.hGetAll(keys.tune(id));
  const workshop = parseWorkshopId(id);
  if (workshop) {
    const tune = workshopTune(workshop.day, workshop.index);
    return {
      id,
      day: workshop.day,
      scale: tune.scale,
      notes: tune.notes,
      author: WORKSHOP_AUTHOR,
      authorId: null,
      house: true,
      hearts: toCount(fields.hearts),
      solves: toCount(fields.solves),
      seq: workshop.index,
    };
  }
  const notes = decodeNotes(fields.notes ?? '');
  if (!isScaleId(fields.scale) || tuneError(fields.scale, notes)) return null;
  return {
    id,
    day: toCount(fields.day),
    scale: fields.scale,
    notes,
    author: fields.author ?? 'someone',
    authorId: fields.authorId ?? null,
    house: false,
    hearts: toCount(fields.hearts),
    solves: toCount(fields.solves),
    seq: toCount(fields.seq),
  };
};

const toCards = async (
  store: Store,
  actor: Actor,
  tunes: readonly StoredTune[]
): Promise<TuneCard[]> => {
  const userId = actor.userId;
  const days = [...new Set(tunes.map((t) => t.day))];
  const playsByDay = new Map<number, Record<string, string>>();
  if (userId) {
    await Promise.all(
      days.map(async (day) => {
        playsByDay.set(day, await store.hGetAll(keys.plays(day, userId)));
      })
    );
  }
  return Promise.all(
    tunes.map(async (tune) => ({
      id: tune.id,
      day: tune.day,
      name: tuneName(tune),
      author: tune.author,
      house: tune.house,
      scale: tune.scale,
      notes: tune.notes,
      hearts: tune.hearts,
      solves: tune.solves,
      mine: userId !== undefined && tune.authorId === userId,
      hearted: userId
        ? (await store.hGet(keys.hearts(tune.id), userId)) !== undefined
        : false,
      play: playFrom(tune.notes, playsByDay.get(tune.day)?.[tune.id]),
    }))
  );
};

const loadTunes = async (store: Store, ids: readonly string[]) => {
  const tunes = await Promise.all(ids.map((id) => loadTune(store, id)));
  return tunes.filter((t): t is StoredTune => t !== null);
};

const readHistogram = async (store: Store, day: number): Promise<Histogram> => {
  const h = await store.hGetAll(keys.hist(day));
  return [
    toCount(h['1']),
    toCount(h['2']),
    toCount(h['3']),
    toCount(h['4']),
    toCount(h['5']),
  ];
};

const readMe = async (
  store: Store,
  actor: Actor,
  today: number
): Promise<Me> => {
  const userId = actor.userId;
  if (!userId) {
    return {
      loggedIn: false,
      name: null,
      streak: 0,
      best: 0,
      roll: Array.from({ length: ROLL_DAYS }, () => null),
    };
  }
  const [user, roll] = await Promise.all([
    store.hGetAll(keys.user(userId)),
    store.hGetAll(keys.roll(userId)),
  ]);
  const alive = toCount(user.last) >= today - 1;
  return {
    loggedIn: true,
    name: actor.username ?? null,
    streak: alive ? toCount(user.streak) : 0,
    best: toCount(user.best),
    roll: Array.from({ length: ROLL_DAYS }, (_, i) => {
      const value = roll[String(today - ROLL_DAYS + 1 + i)];
      return value === undefined ? null : toCount(value);
    }),
  };
};

/** Yesterday's best-loved player tune, fixed the first time a day is opened. */
const encoreFor = async (store: Store, day: number) => {
  if (day < 2) return null;
  const saved = await store.get(keys.encore(day));
  if (saved !== undefined) return saved === '-' ? null : loadTune(store, saved);
  const ranked = await store.zTop(keys.top(day - 1), 5);
  const tunes = await loadTunes(
    store,
    ranked.map((r) => r.member)
  );
  const best = [...tunes].sort(
    (a, b) => b.hearts - a.hearts || b.solves - a.solves || a.seq - b.seq
  )[0];
  await store.set(keys.encore(day), best ? best.id : '-');
  return best ?? null;
};

export const getInit = async (
  store: Store,
  actor: Actor,
  postDay: number | undefined,
  now: number
): Promise<InitResponse> => {
  const today = dayNumber(now);
  const day = clampDay(postDay, today);
  const puzzle = dailyPuzzle(day);
  const daily: DailyView = {
    day,
    scale: puzzle.scale,
    notes: puzzle.notes,
    title: puzzle.title,
    credit: puzzle.credit,
  };
  const userId = actor.userId;
  const [plays, histogram, encoreTune, me, shelfCount, myTuneId] =
    await Promise.all([
      userId ? store.hGetAll(keys.plays(day, userId)) : noPlays,
      readHistogram(store, day),
      encoreFor(store, day),
      readMe(store, actor, today),
      store.zCard(keys.fresh(day)),
      userId ? store.hGet(keys.tuneBy(day), userId) : undefined,
    ]);
  const [encore] = encoreTune ? await toCards(store, actor, [encoreTune]) : [];
  return {
    type: 'init',
    today,
    nextIn: Math.max(0, dayStart(today) + DAY_MS - now),
    daily,
    play: playFrom(daily.notes, plays[DAILY]),
    histogram,
    encore: encore ?? null,
    me,
    shelfCount: shelfCount + WORKSHOP_COUNT,
    myTuneId: myTuneId ?? null,
  };
};

const bumpStreak = async (
  store: Store,
  userId: string,
  day: number,
  solved: boolean
) => {
  const user = await store.hGetAll(keys.user(userId));
  const last = toCount(user.last);
  if (last >= day) return;
  if (!solved) {
    await store.hSet(keys.user(userId), { streak: '0' });
    return;
  }
  const streak = last === day - 1 ? toCount(user.streak) + 1 : 1;
  await store.hSet(keys.user(userId), {
    streak: String(streak),
    best: String(Math.max(streak, toCount(user.best))),
    last: String(day),
  });
};

export const submitPlay = async (
  store: Store,
  actor: Actor,
  request: PlayRequest,
  now: number
): Promise<PlayResponse> => {
  const today = dayNumber(now);
  const isDaily = request.id === DAILY;
  const tune = isDaily ? null : await loadTune(store, String(request.id));
  if (!isDaily && !tune) throw new ServiceError(404, 'That tune is gone.');
  const day = tune ? tune.day : request.day;
  if (!Number.isInteger(day) || day < 1 || day > today) {
    throw new ServiceError(400, 'That box is not open yet.');
  }
  const notes = tune ? tune.notes : dailyPuzzle(day).notes;
  const guesses: unknown = request.guesses;
  if (
    !Array.isArray(guesses) ||
    guesses.length > MAX_CHECKS ||
    !guesses.every((g): g is number[] => isGuess(g, notes.length))
  ) {
    throw new ServiceError(400, 'Those pins do not fit this box.');
  }
  const incoming = evaluate(notes, guesses);
  const histogram = async () => (isDaily ? readHistogram(store, day) : null);
  const userId = actor.userId;
  if (!userId) {
    return {
      type: 'play',
      play: incoming,
      histogram: await histogram(),
      me: null,
      solves: tune ? tune.solves : null,
    };
  }

  const field = isDaily ? DAILY : request.id;
  const playsKey = keys.plays(day, userId);
  const previous = playFrom(notes, await store.hGet(playsKey, field));
  const stale =
    previous !== null &&
    (previous.done ||
      incoming.guesses.length <= previous.guesses.length ||
      !isPrefix(previous.guesses, incoming.guesses));
  const play: Play = stale && previous ? previous : incoming;
  let solves = tune ? tune.solves : null;

  if (!stale && incoming.guesses.length > 0) {
    await store.hSet(playsKey, {
      [field]: incoming.guesses.map(encodeNotes).join(','),
    });
    const first =
      incoming.done && (await store.hSetNX(playsKey, doneField(field), '1'));
    if (first && isDaily) {
      const checks = incoming.solved ? incoming.guesses.length : 0;
      if (incoming.solved) {
        await store.hIncrBy(keys.hist(day), String(checks), 1);
      }
      await store.hSet(keys.roll(userId), { [String(day)]: String(checks) });
      if (day === today) await bumpStreak(store, userId, day, incoming.solved);
    }
    if (first && tune && incoming.solved && tune.authorId !== userId) {
      solves = await store.hIncrBy(keys.tune(tune.id), 'solves', 1);
    }
  }

  return {
    type: 'play',
    play,
    histogram: await histogram(),
    me: isDaily ? await readMe(store, actor, today) : null,
    solves,
  };
};

const dailyDone = async (store: Store, userId: string, day: number) =>
  (await store.hGet(keys.plays(day, userId), doneField(DAILY))) !== undefined;

export const getShelf = async (
  store: Store,
  actor: Actor,
  postDay: number | undefined,
  now: number
): Promise<ShelfResponse> => {
  const today = dayNumber(now);
  const day = clampDay(postDay, today);
  const userId = actor.userId;
  const [topIds, freshIds, myId] = await Promise.all([
    store.zTop(keys.top(day), SHELF_PAGE),
    store.zTop(keys.fresh(day), SHELF_PAGE),
    userId ? store.hGet(keys.tuneBy(day), userId) : undefined,
  ]);
  const house = Array.from({ length: WORKSHOP_COUNT }, (_, i) =>
    workshopId(day, i)
  );
  const ids = [
    ...new Set([
      ...topIds.map((r) => r.member),
      ...freshIds.map((r) => r.member),
      ...house,
      ...(myId ? [myId] : []),
    ]),
  ];
  const cards = await toCards(store, actor, await loadTunes(store, ids));
  const byId = new Map(cards.map((card) => [card.id, card]));
  const cardsFor = (list: readonly string[]) =>
    list
      .map((id) => byId.get(id))
      .filter((c): c is TuneCard => c !== undefined);
  return {
    type: 'shelf',
    day,
    top: cardsFor(topIds.map((r) => r.member)).sort(
      (a, b) => b.hearts - a.hearts || b.solves - a.solves
    ),
    fresh: cardsFor(freshIds.map((r) => r.member)),
    house: cardsFor(house),
    mine: (myId ? byId.get(myId) : undefined) ?? null,
    canPublish:
      userId !== undefined &&
      day === today &&
      !myId &&
      (await dailyDone(store, userId, day)),
  };
};

export const publishTune = async (
  store: Store,
  actor: Actor,
  request: { scale: unknown; notes: unknown },
  now: number
): Promise<PublishResponse> => {
  const fail = (error: Extract<PublishResponse, { ok: false }>['error']) =>
    ({ type: 'tune', ok: false, error }) as const;
  const userId = actor.userId;
  if (!userId) return fail('login');
  const { scale, notes } = request;
  const problem = tuneError(scale, notes);
  if (problem) return fail(problem);
  if (!isScaleId(scale) || !Array.isArray(notes)) return fail('notes');
  const rows = notes.filter((n): n is number => typeof n === 'number');
  const today = dayNumber(now);
  if (!(await dailyDone(store, userId, today))) return fail('locked');

  const sig = signature({ scale, notes: rows });
  const taken = [
    signature(dailyPuzzle(today)),
    ...Array.from({ length: WORKSHOP_COUNT }, (_, i) =>
      signature(workshopTune(today, i))
    ),
  ];
  if (taken.includes(sig)) return fail('duplicate');
  if (!(await store.hSetNX(keys.tuneBy(today), userId, ''))) {
    return fail('already');
  }
  const seq = await store.incrBy(keys.seq(today), 1);
  const id = `${today}-${seq}`;
  if (!(await store.hSetNX(keys.tuneSig(today), sig, id))) {
    await store.hDel(keys.tuneBy(today), userId);
    return fail('duplicate');
  }
  await store.hSet(keys.tune(id), {
    scale,
    notes: encodeNotes(rows),
    author: actor.username ?? 'someone',
    authorId: userId,
    day: String(today),
    seq: String(seq),
    hearts: '0',
    solves: '0',
  });
  await Promise.all([
    store.hSet(keys.tuneBy(today), { [userId]: id }),
    store.zAdd(keys.top(today), id, 0),
    store.zAdd(keys.fresh(today), id, seq),
  ]);
  const tune = await loadTune(store, id);
  const [card] = tune ? await toCards(store, actor, [tune]) : [];
  return card ? { type: 'tune', ok: true, tune: card } : fail('notes');
};

/** A heart is earned: only people who solved a tune can give one. */
export const heartTune = async (
  store: Store,
  actor: Actor,
  id: string
): Promise<HeartResponse> => {
  const tune = await loadTune(store, id);
  if (!tune) throw new ServiceError(404, 'That tune is gone.');
  const no: HeartResponse = { type: 'heart', ok: false, hearts: tune.hearts };
  const userId = actor.userId;
  if (!userId || tune.authorId === userId) return no;
  const plays = await store.hGetAll(keys.plays(tune.day, userId));
  if (!playFrom(tune.notes, plays[tune.id])?.solved) return no;
  if (!(await store.hSetNX(keys.hearts(id), userId, '1'))) {
    return { type: 'heart', ok: true, hearts: tune.hearts };
  }
  const hearts = await store.hIncrBy(keys.tune(id), 'hearts', 1);
  if (!tune.house) await store.zIncrBy(keys.top(tune.day), id, 1);
  return { type: 'heart', ok: true, hearts };
};
