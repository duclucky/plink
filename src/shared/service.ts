import type {
  DailyView,
  HeartResponse,
  Histogram,
  InitResponse,
  Me,
  PlayRequest,
  PlayResponse,
  PublishResponse,
  RemoveResponse,
  ReportResponse,
  ShelfResponse,
  TuneCard,
  TuneNews,
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
  shareText,
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
  /** May take any tune off the shelf. */
  moderator?: boolean;
  /** Looks up the player's snoovatar; only called when a face is needed. */
  avatar?: () => Promise<string | null>;
};

export class ServiceError extends Error {
  readonly status: 400 | 404;
  constructor(status: 400 | 404, message: string) {
    super(message);
    this.status = status;
  }
}

const SHELF_PAGE = 20;
/** Reports from this many redditors take a tune off the shelf. */
const REPORTS_TO_HIDE = 3;
const FACES = 5;
const DAY_SECONDS = 86_400;
/**
 * Everything that names a redditor lapses on its own: a day's plays and tunes
 * after five weeks, a streak after two months without a play. Reddit asks
 * apps not to keep a deleted account's data, and nothing here is needed
 * longer than that.
 */
const DAY_TTL = 35 * DAY_SECONDS;
const PLAYER_TTL = 60 * DAY_SECONDS;
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
  names: (day: number) => `tunenames:${day}`,
  reports: (id: string) => `reports:${id}`,
  faces: (day: number) => `faces:${day}`,
};

const keep = (store: Store, seconds: number, ...names: string[]) =>
  Promise.all(names.map((name) => store.expire(name, seconds)));

const noPlays: Record<string, string> = {};

const doneField = (id: string) => `${id}!`;
const listensField = (id: string) => `${id}@`;
const commentField = (id: string) => `${id}#`;

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

/**
 * A finished play is kept in its own field, written once. A late check from
 * another tab can overwrite the running play but never the finished one.
 */
const savedPlay = (
  notes: readonly number[],
  plays: Record<string, string> | undefined,
  field: string
) =>
  playFrom(notes, plays?.[doneField(field)]) ?? playFrom(notes, plays?.[field]);

const clampDay = (day: number | undefined, today: number) =>
  day !== undefined && Number.isInteger(day) && day >= 1 && day <= today
    ? day
    : today;

type StoredTune = {
  id: string;
  day: number;
  name: string;
  scale: ScaleId;
  notes: number[];
  author: string;
  authorId: string | null;
  avatar: string | null;
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
      name: tuneName(tune),
      scale: tune.scale,
      notes: tune.notes,
      author: WORKSHOP_AUTHOR,
      authorId: null,
      avatar: null,
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
    name: fields.name ?? tuneName({ scale: fields.scale, notes }),
    scale: fields.scale,
    notes,
    author: fields.author ?? 'someone',
    authorId: fields.authorId ?? null,
    avatar: fields.avatar ? fields.avatar : null,
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
      name: tune.name,
      author: tune.author,
      avatar: tune.avatar,
      house: tune.house,
      scale: tune.scale,
      notes: tune.notes,
      hearts: tune.hearts,
      solves: tune.solves,
      mine: userId !== undefined && tune.authorId === userId,
      hearted: userId
        ? (await store.hGet(keys.hearts(tune.id), userId)) !== undefined
        : false,
      play: savedPlay(tune.notes, playsByDay.get(tune.day), tune.id),
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
    toCount(h.x),
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
      avatar: null,
      moderator: false,
      flair: false,
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
    avatar: user.avatar ? user.avatar : null,
    moderator: actor.moderator === true,
    flair: user.flair === '1',
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
  // A tune nobody loved is not a favourite: no hearts, no Encore.
  const winner = best && best.hearts > 0 ? best : null;
  await store.set(keys.encore(day), winner ? winner.id : '-');
  await keep(store, DAY_TTL, keys.encore(day));
  return winner;
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
  const [plays, histogram, encoreTune, me, shelfCount, myTuneId, faces, past] =
    await Promise.all([
      userId ? store.hGetAll(keys.plays(day, userId)) : noPlays,
      readHistogram(store, day),
      encoreFor(store, day),
      readMe(store, actor, today),
      store.zCard(keys.fresh(day)),
      userId ? store.hGet(keys.tuneBy(day), userId) : undefined,
      store.zTop(keys.faces(day), FACES),
      // News about yesterday's tune belongs on today's box only.
      userId && day === today && day > 1
        ? store.hGet(keys.tuneBy(day - 1), userId)
        : undefined,
    ]);
  const [encore] = encoreTune ? await toCards(store, actor, [encoreTune]) : [];
  const pastTune = past ? await loadTune(store, past) : null;
  const news: TuneNews | null = pastTune
    ? {
        id: pastTune.id,
        name: pastTune.name,
        solves: pastTune.solves,
        hearts: pastTune.hearts,
        encore: encoreTune?.id === pastTune.id,
      }
    : null;
  const play = savedPlay(daily.notes, plays, DAILY);
  const heard = plays[listensField(DAILY)];
  return {
    type: 'init',
    today,
    nextIn: Math.max(0, dayStart(today) + DAY_MS - now),
    daily,
    play,
    listens: play?.done && heard !== undefined ? toCount(heard) : null,
    commented: plays[commentField(DAILY)] !== undefined,
    histogram,
    encore: encore ?? null,
    news,
    faces: faces.map((face) => face.member),
    me,
    shelfCount,
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
  const previous = savedPlay(notes, await store.hGetAll(playsKey), field);
  const stale =
    previous !== null &&
    (previous.done ||
      incoming.guesses.length <= previous.guesses.length ||
      !isPrefix(previous.guesses, incoming.guesses));
  const play: Play = stale && previous ? previous : incoming;
  let solves = tune ? tune.solves : null;

  if (!stale && incoming.guesses.length > 0) {
    const saved = incoming.guesses.map(encodeNotes).join(',');
    await store.hSet(playsKey, { [field]: saved });
    const first =
      incoming.done && (await store.hSetNX(playsKey, doneField(field), saved));
    if (first) {
      const heard = Number(request.listens);
      const listens = Number.isFinite(heard)
        ? Math.max(0, Math.min(99, Math.floor(heard)))
        : 0;
      await store.hSet(playsKey, { [listensField(field)]: String(listens) });
    }
    if (first && isDaily) {
      const checks = incoming.solved ? incoming.guesses.length : 0;
      await store.hIncrBy(
        keys.hist(day),
        incoming.solved ? String(checks) : 'x',
        1
      );
      await store.hSet(keys.roll(userId), { [String(day)]: String(checks) });
      // A box opened before the day turned and finished after still counts.
      if (day >= today - 1) {
        await bumpStreak(store, userId, day, incoming.solved);
      }
      const face = incoming.solved ? await actor.avatar?.() : null;
      if (face) {
        await Promise.all([
          store.zAdd(keys.faces(day), face, now),
          store.hSet(keys.user(userId), { avatar: face }),
        ]);
      }
      await keep(store, DAY_TTL, keys.faces(day));
      await keep(store, PLAYER_TTL, keys.user(userId), keys.roll(userId));
    }
    if (first && tune && incoming.solved && tune.authorId !== userId) {
      solves = await store.hIncrBy(keys.tune(tune.id), 'solves', 1);
    }
    await keep(store, DAY_TTL, playsKey);
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
  now: number,
  /** How many of the newest tunes to skip: the start of a later page. */
  freshFrom = 0
): Promise<ShelfResponse> => {
  const today = dayNumber(now);
  const day = clampDay(postDay, today);
  const userId = actor.userId;
  const from = Number.isInteger(freshFrom) && freshFrom > 0 ? freshFrom : 0;
  const [topIds, freshIds, freshCount, myId] = await Promise.all([
    store.zTop(keys.top(day), SHELF_PAGE),
    store.zTop(keys.fresh(day), SHELF_PAGE, from),
    store.zCard(keys.fresh(day)),
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
    nextFresh: from + SHELF_PAGE < freshCount ? from + SHELF_PAGE : null,
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
  request: { scale: unknown; notes: unknown; day?: unknown },
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
  if (typeof request.day === 'number' && request.day !== today) {
    return fail('newday');
  }
  if (!(await dailyDone(store, userId, today))) return fail('locked');

  // The day's own tunes cannot be pinned again, in any mood.
  const pins = encodeNotes(rows);
  const taken = [
    dailyPuzzle(today).notes,
    ...Array.from(
      { length: WORKSHOP_COUNT },
      (_, i) => workshopTune(today, i).notes
    ),
  ].map(encodeNotes);
  if (taken.includes(pins)) return fail('duplicate');
  if (!(await store.hSetNX(keys.tuneBy(today), userId, ''))) {
    return fail('already');
  }
  const sig = signature({ scale, notes: rows });
  const seq = await store.incrBy(keys.seq(today), 1);
  const id = `${today}-${seq}`;
  if (!(await store.hSetNX(keys.tuneSig(today), sig, id))) {
    await store.hDel(keys.tuneBy(today), userId);
    return fail('duplicate');
  }
  // Two tunes on one shelf never share a name: a taken name is rolled again.
  let name = tuneName({ scale, notes: rows });
  for (let salt = 0; salt < 8; salt++) {
    name = tuneName({ scale, notes: rows }, salt);
    if (await store.hSetNX(keys.names(today), name, id)) break;
  }
  try {
    const avatar = (await actor.avatar?.()) ?? '';
    await store.hSet(keys.tune(id), {
      name,
      scale,
      notes: pins,
      author: actor.username ?? 'someone',
      authorId: userId,
      avatar,
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
    await keep(
      store,
      DAY_TTL,
      keys.tune(id),
      keys.tuneBy(today),
      keys.tuneSig(today),
      keys.names(today),
      keys.top(today),
      keys.fresh(today),
      keys.seq(today)
    );
  } catch (error) {
    // Take a half-saved tune off both lists, then give the player their one
    // tune back. If the lists cannot be cleared the tune stays the player's.
    await Promise.all([
      store.zRem(keys.top(today), id),
      store.zRem(keys.fresh(today), id),
    ]);
    await Promise.all([
      store.hDel(keys.tuneBy(today), userId),
      store.hDel(keys.tuneSig(today), sig),
      store.hDel(keys.names(today), name),
    ]);
    throw error;
  }
  const tune = await loadTune(store, id);
  const [card] = tune ? await toCards(store, actor, [tune]) : [];
  return card ? { type: 'tune', ok: true, tune: card } : fail('notes');
};

/** Takes a tune off the shelf for good: its author can, and so can a moderator. */
export const removeTune = async (
  store: Store,
  actor: Actor,
  id: string
): Promise<RemoveResponse> => {
  const tune = await loadTune(store, id);
  const userId = actor.userId;
  const allowed =
    tune !== null &&
    !tune.house &&
    userId !== undefined &&
    (tune.authorId === userId || actor.moderator === true);
  if (!tune || !allowed) return { type: 'remove', ok: false };
  await Promise.all([
    store.zRem(keys.top(tune.day), id),
    store.zRem(keys.fresh(tune.day), id),
  ]);
  await Promise.all([
    tune.authorId
      ? store.hDel(keys.tuneBy(tune.day), tune.authorId)
      : Promise.resolve(),
    store.hDel(keys.tuneSig(tune.day), signature(tune)),
    store.hDel(keys.names(tune.day), tune.name),
    store.del(keys.tune(id)),
    store.del(keys.hearts(id)),
    store.del(keys.reports(id)),
  ]);
  return { type: 'remove', ok: true };
};

/** One report per redditor; enough of them take the tune off the shelf. */
export const reportTune = async (
  store: Store,
  actor: Actor,
  id: string
): Promise<ReportResponse> => {
  const tune = await loadTune(store, id);
  const userId = actor.userId;
  if (!tune || tune.house || !userId || tune.authorId === userId) {
    return { type: 'report', ok: false };
  }
  if (await store.hSetNX(keys.reports(id), userId, '1')) {
    const reports = await store.hIncrBy(keys.tune(id), 'reports', 1);
    await keep(store, DAY_TTL, keys.reports(id));
    if (reports >= REPORTS_TO_HIDE) {
      await Promise.all([
        store.zRem(keys.top(tune.day), id),
        store.zRem(keys.fresh(tune.day), id),
      ]);
    }
  }
  return { type: 'report', ok: true };
};

/**
 * The words a player may post as a comment: their own finished result, built
 * here from what the server saved, with no tune name to spoil the box.
 */
export const resultComment = async (
  store: Store,
  actor: Actor,
  postDay: number | undefined,
  now: number
) => {
  const userId = actor.userId;
  if (!userId) return null;
  const day = clampDay(postDay, dayNumber(now));
  const notes = dailyPuzzle(day).notes;
  const plays = await store.hGetAll(keys.plays(day, userId));
  const play = savedPlay(notes, plays, DAILY);
  if (!play?.done) return null;
  const heard = plays[listensField(DAILY)];
  return {
    day,
    posted: plays[commentField(DAILY)] !== undefined,
    text: shareText(
      `Plink #${day}`,
      notes,
      play,
      heard === undefined ? null : toCount(heard)
    ),
  };
};

/** True the first time only, so one result is never posted twice. */
export const claimComment = (store: Store, userId: string, day: number) =>
  store.hSetNX(keys.plays(day, userId), commentField(DAILY), '1');

export const releaseComment = (store: Store, userId: string, day: number) =>
  store.hDel(keys.plays(day, userId), commentField(DAILY));

/** Remembers that the player wants their streak as flair; returns its text. */
export const wearStreak = async (store: Store, actor: Actor, now: number) => {
  const userId = actor.userId;
  if (!userId) return null;
  await store.hSet(keys.user(userId), { flair: '1' });
  const me = await readMe(store, actor, dayNumber(now));
  return streakFlair(me.streak);
};

export const streakFlair = (streak: number) =>
  streak > 0 ? `Plink streak: ${streak}` : 'Plink player';

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
  if (!savedPlay(tune.notes, plays, tune.id)?.solved) return no;
  if (!(await store.hSetNX(keys.hearts(id), userId, '1'))) {
    return { type: 'heart', ok: true, hearts: tune.hearts };
  }
  // A heart that was not fully counted is handed back, so a retry counts it.
  const handBack = () => store.hDel(keys.hearts(id), userId);
  const hearts = await store
    .hIncrBy(keys.tune(id), 'hearts', 1)
    .catch(async (error: unknown) => {
      await handBack();
      throw error;
    });
  await keep(store, DAY_TTL, keys.hearts(id));
  if (!tune.house) {
    await store
      .zIncrBy(keys.top(tune.day), id, 1)
      .catch(async (error: unknown) => {
        await store.hIncrBy(keys.tune(id), 'hearts', -1);
        await handBack();
        throw error;
      });
  }
  return { type: 'heart', ok: true, hearts };
};
