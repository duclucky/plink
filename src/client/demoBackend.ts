import { ROWS } from '../shared/game';
import { dailyPuzzle } from '../shared/melodies';
import {
  getInit,
  getShelf,
  heartTune,
  publishTune,
  submitPlay,
  type Actor,
} from '../shared/service';
import {
  createMemoryStore,
  emptyMemoryData,
  type MemoryData,
  type Store,
} from '../shared/store';
import { DAY_MS, dayNumber } from '../shared/day';
import type { Backend } from './backend';

const STORAGE_KEY = 'plink:demo:v1';
const you: Actor = { userId: 't2_demo_you', username: 'you' };

const CROWD = [
  'quiet_otter',
  'brasscomb',
  'lowtide_lea',
  'pinwright',
  'tin_robin',
  'mossy_stair',
  'half_past_tea',
  'lanternfish',
  'oddsock',
  'clockmoth',
  'paper_harbor',
  'softpedal',
];

const CROWD_TUNES = [
  { scale: 'sunny', notes: [0, 2, 3, 2, 4, 3, 2, 0] },
  { scale: 'dusky', notes: [0, 1, 2, 4, 3, 2, 1, 2, 1, 0] },
  { scale: 'meadow', notes: [2, 3, 4, 3, 2, 0] },
  { scale: 'misty', notes: [0, 2, 3, 4, 3, 2, 1, 0] },
  { scale: 'plain', notes: [4, 4, 3, 2, 3, 1, 0] },
] as const;

const load = (): MemoryData | null => {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (!text) return null;
    const data: MemoryData = JSON.parse(text);
    return data.strings && data.hashes && data.zsets ? data : null;
  } catch {
    return null;
  }
};

const save = (data: MemoryData) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // The demo still works for this visit without storage.
  }
};

/** Fills one day with pretend redditors so the demo looks lived in. */
const seedDay = async (store: Store, day: number, now: number) => {
  if (await store.get(`demo:seeded:${day}`)) return;
  await store.set(`demo:seeded:${day}`, '1');
  const notes = dailyPuzzle(day).notes;
  const wrong = notes.map((n) => (n + 2) % ROWS);
  const spread = [1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 2];
  const crowd = CROWD.map((name) => ({
    userId: `t2_demo_${name}`,
    username: name,
  }));
  for (const [i, actor] of crowd.entries()) {
    const misses = (spread[(i + day) % spread.length] ?? 3) - 1;
    await submitPlay(
      store,
      actor,
      {
        id: 'daily',
        day,
        guesses: [...Array.from({ length: misses }, () => wrong), notes],
      },
      now
    );
  }
  for (let n = 1; n <= 5; n++) {
    await store.hIncrBy(
      `hist:${day}`,
      String(n),
      [9, 31, 58, 37, 14][n - 1] ?? 0
    );
  }
  for (const [i, tune] of CROWD_TUNES.entries()) {
    const author = crowd[(i + day) % crowd.length];
    if (!author) continue;
    const made = await publishTune(
      store,
      author,
      {
        scale: tune.scale,
        notes: [...tune.notes].map((n, k) => (k === 1 ? (n + day) % ROWS : n)),
      },
      now
    );
    if (!made.ok) continue;
    const fans = crowd
      .filter((c) => c.userId !== author.userId)
      .slice(0, 9 - i * 2);
    for (const fan of fans) {
      await submitPlay(
        store,
        fan,
        { id: made.tune.id, day, guesses: [made.tune.notes] },
        now
      );
      await heartTune(store, fan, made.tune.id);
    }
  }
};

/** The demo runs a week ahead so there is always a yesterday to draw an Encore from. */
const clock = () => Date.now() + 7 * DAY_MS;

/** The whole game running in the browser, for trying Plink outside Reddit. */
export const createDemoBackend = (): Backend => {
  const data = load() ?? emptyMemoryData();
  const store = createMemoryStore(data, save);
  const ready = (async () => {
    const now = clock();
    const today = dayNumber(now);
    if (today > 1) await seedDay(store, today - 1, now - DAY_MS);
    await seedDay(store, today, now);
  })();
  return {
    init: async () => {
      await ready;
      return getInit(store, you, undefined, clock());
    },
    play: async (request) => {
      await ready;
      return submitPlay(store, you, request, clock());
    },
    shelf: async (day, from) => {
      await ready;
      return getShelf(store, you, day, clock(), from);
    },
    publish: async (request) => {
      await ready;
      return publishTune(store, you, request, clock());
    },
    heart: async (id) => {
      await ready;
      return heartTune(store, you, id);
    },
  };
};

export const resetDemo = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
};
