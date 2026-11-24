import { describe, expect, it } from 'vitest';
import { DAY_MS, EPOCH_MS, dayNumber, weekdayOf } from './day';
import {
  MAX_NOTES,
  MIN_NOTES,
  ROWS,
  evaluate,
  shareText,
  tuneError,
  tuneName,
} from './game';
import { CLASSICS, dailyPuzzle, workshopTune } from './melodies';
import {
  getInit,
  getShelf,
  heartTune,
  publishTune,
  removeTune,
  reportTune,
  submitPlay,
  type Actor,
} from './service';
import { createMemoryStore } from './store';

const at = (day: number) => EPOCH_MS + (day - 1) * DAY_MS + 60_000;
const ann: Actor = { userId: 't2_ann', username: 'ann' };
const bob: Actor = { userId: 't2_bob', username: 'bob' };
const guest: Actor = { userId: undefined, username: undefined };

const solveDaily = (
  store: ReturnType<typeof createMemoryStore>,
  who: Actor,
  day: number,
  wrongFirst = 0
) => {
  const notes = dailyPuzzle(day).notes;
  const wrong = notes.map((n) => (n + 1) % ROWS);
  const guesses = [...Array.from({ length: wrongFirst }, () => wrong), notes];
  return submitPlay(store, who, { id: 'daily', day, guesses }, at(day));
};

describe('days', () => {
  it('opens box 1 on Monday 23 Nov 2026 at 12:00 UTC', () => {
    expect(dayNumber(EPOCH_MS)).toBe(1);
    expect(dayNumber(EPOCH_MS + DAY_MS - 1)).toBe(1);
    expect(dayNumber(EPOCH_MS + DAY_MS)).toBe(2);
    expect(weekdayOf(1)).toBe(0);
    expect(weekdayOf(7)).toBe(6);
  });
});

describe('daily content', () => {
  it('gives every one of 400 days a valid, stable tune', () => {
    for (let day = 1; day <= 400; day++) {
      const p = dailyPuzzle(day);
      expect(tuneError(p.scale, p.notes), `day ${day}`).toBeNull();
      expect(dailyPuzzle(day)).toEqual(p);
    }
  });
  it('plays a real, named tune every day and repeats after seven weeks', () => {
    expect(CLASSICS).toHaveLength(49);
    expect(new Set(CLASSICS.map((c) => c.title)).size).toBe(49);
    expect(new Set(CLASSICS.map((c) => c.notes.join(''))).size).toBe(49);
    expect(dailyPuzzle(1).title).toBe('Hot Cross Buns');
    expect(dailyPuzzle(7).title).toBe('Ode to Joy');
    expect(dailyPuzzle(39).title).toBe('Auld Lang Syne');
    expect(dailyPuzzle(50)).toMatchObject({ title: 'Hot Cross Buns' });
    for (const c of CLASSICS)
      expect(tuneError(c.scale, c.notes), c.title).toBeNull();
  });
  it('grows through the week: short on Monday, ten pins on Sunday', () => {
    for (let week = 0; week < 7; week++) {
      const lengths = Array.from(
        { length: 7 },
        (_, d) => dailyPuzzle(week * 7 + d + 1).notes.length
      );
      expect(lengths[0], `week ${week + 1}`).toBeLessThanOrEqual(7);
      expect(lengths[6], `week ${week + 1}`).toBe(10);
      expect(
        [...lengths].sort((a, b) => a - b),
        `week ${week + 1}`
      ).toEqual(lengths);
    }
  });
  it('makes valid workshop tunes of 6, 8 and 10 notes', () => {
    for (let day = 1; day <= 60; day++) {
      expect([0, 1, 2].map((i) => workshopTune(day, i).notes.length)).toEqual([
        MIN_NOTES,
        8,
        MAX_NOTES,
      ]);
      for (const i of [0, 1, 2]) {
        const t = workshopTune(day, i);
        expect(tuneError(t.scale, t.notes)).toBeNull();
      }
    }
  });
});

describe('rules', () => {
  it('stops at the solving check and at four checks', () => {
    const notes = [0, 1, 2, 3, 4, 0];
    const wrong = [1, 1, 1, 1, 1, 1];
    expect(evaluate(notes, [wrong, notes, wrong])).toEqual({
      guesses: [wrong, notes],
      solved: true,
      done: true,
    });
    const lost = evaluate(
      notes,
      Array.from({ length: 7 }, () => wrong)
    );
    expect(lost.guesses).toHaveLength(4);
    expect(lost).toMatchObject({ solved: false, done: true });
  });
  it('rejects tunes that are too short, too long or one note', () => {
    expect(tuneError('sunny', [0, 1, 2, 3, 4])).toBe('length');
    expect(
      tuneError(
        'sunny',
        Array.from({ length: 11 }, (_, i) => i % 5)
      )
    ).toBe('length');
    expect(tuneError('sunny', [0, 0, 0, 0, 1, 1])).toBe('flat');
    expect(tuneError('loud', [0, 1, 2, 3, 4, 0])).toBe('scale');
    expect(tuneError('sunny', [0, 1, 2, 3, 5, 0])).toBe('notes');
  });
  it('names a tune from its notes and writes a share card', () => {
    const tune = { scale: 'sunny' as const, notes: [0, 1, 2, 3, 4, 0] };
    expect(tuneName(tune)).toBe(tuneName({ ...tune }));
    const play = evaluate(tune.notes, [[0, 1, 2, 3, 4, 1], tune.notes]);
    expect(shareText('Plink #3', tune.notes, play)).toBe(
      'Plink #3 2/4\n🟩🟩🟩🟩🟩⬜\n🟩🟩🟩🟩🟩🟩'
    );
  });
});

describe('playing the daily box', () => {
  it('saves progress, counts the solve once and builds a streak', async () => {
    const store = createMemoryStore();
    const first = await solveDaily(store, ann, 3, 2);
    expect(first.play).toMatchObject({ solved: true, done: true });
    expect(first.histogram).toEqual([0, 0, 1, 0, 0]);
    expect(first.me).toMatchObject({ streak: 1, best: 1 });
    const again = await solveDaily(store, ann, 3, 0);
    expect(again.play.guesses).toHaveLength(3);
    expect(again.histogram).toEqual([0, 0, 1, 0, 0]);
    const next = await solveDaily(store, ann, 4, 0);
    expect(next.me).toMatchObject({ streak: 2, best: 2 });
    expect(next.me?.roll.slice(-2)).toEqual([3, 1]);
    const init = await getInit(store, ann, 3, at(6));
    expect(init.today).toBe(6);
    expect(init.daily.day).toBe(3);
    expect(init.play?.solved).toBe(true);
    expect(init.me.streak).toBe(0);
    expect(init.me.best).toBe(2);
  });
  it('does not move the streak for an old box', async () => {
    const store = createMemoryStore();
    const old = await submitPlay(
      store,
      ann,
      { id: 'daily', day: 2, guesses: [dailyPuzzle(2).notes] },
      at(5)
    );
    expect(old.me?.streak).toBe(0);
    expect(old.histogram).toEqual([1, 0, 0, 0, 0]);
  });
  it('lets guests play without saving and refuses future or malformed boxes', async () => {
    const store = createMemoryStore();
    const res = await solveDaily(store, guest, 2);
    expect(res.play.solved).toBe(true);
    expect(res.histogram).toEqual([0, 0, 0, 0, 0]);
    await expect(
      submitPlay(store, ann, { id: 'daily', day: 9, guesses: [] }, at(2))
    ).rejects.toThrow();
    await expect(
      submitPlay(store, ann, { id: 'daily', day: 2, guesses: [[9]] }, at(2))
    ).rejects.toThrow();
    await expect(
      submitPlay(store, ann, { id: 'nope', day: 2, guesses: [] }, at(2))
    ).rejects.toThrow();
  });
});

describe('the four-check rule', () => {
  it('lets a box be lost, counts the miss and keeps the listens', async () => {
    const store = createMemoryStore();
    const notes = dailyPuzzle(2).notes;
    const wrong = notes.map((n) => (n + 1) % ROWS);
    const res = await submitPlay(
      store,
      ann,
      {
        id: 'daily',
        day: 2,
        guesses: [wrong, wrong, wrong, wrong],
        listens: 6,
      },
      at(2)
    );
    expect(res.play).toMatchObject({ solved: false, done: true });
    expect(res.histogram).toEqual([0, 0, 0, 0, 1]);
    const init = await getInit(store, ann, 2, at(2));
    expect(init.listens).toBe(6);
    expect(init.me.streak).toBe(0);
  });

  it('keeps the streak when a box is finished just after the day turns', async () => {
    const store = createMemoryStore();
    await solveDaily(store, ann, 2);
    await solveDaily(store, ann, 3);
    // Box 4 is finished three minutes into day 5.
    await submitPlay(
      store,
      ann,
      { id: 'daily', day: 4, guesses: [dailyPuzzle(4).notes] },
      at(5) + 120_000
    );
    expect((await getInit(store, ann, 5, at(5) + 180_000)).me.streak).toBe(3);
    const next = await solveDaily(store, ann, 5);
    expect(next.me?.streak).toBe(4);
  });
});

describe('looking after tunes', () => {
  const tune = { scale: 'dusky' as const, notes: [0, 2, 4, 2, 1, 0, 3] };
  it('lets the author take a tune down and pin another', async () => {
    const store = createMemoryStore();
    await solveDaily(store, ann, 2);
    const made = await publishTune(store, ann, tune, at(2));
    if (!made.ok) throw new Error('publish failed');
    expect((await removeTune(store, bob, made.tune.id)).ok).toBe(false);
    expect((await removeTune(store, ann, made.tune.id)).ok).toBe(true);
    const shelf = await getShelf(store, ann, 2, at(2));
    expect(shelf.mine).toBeNull();
    expect(shelf.fresh).toHaveLength(0);
    expect(shelf.canPublish).toBe(true);
    expect((await publishTune(store, ann, tune, at(2))).ok).toBe(true);
  });

  it('lets a moderator remove a tune and hides one after three reports', async () => {
    const store = createMemoryStore();
    await solveDaily(store, ann, 2);
    const made = await publishTune(store, ann, tune, at(2));
    if (!made.ok) throw new Error('publish failed');
    const id = made.tune.id;
    expect((await reportTune(store, ann, id)).ok).toBe(false);
    for (const name of ['b', 'b', 'c']) {
      await reportTune(store, { userId: `t2_${name}`, username: name }, id);
    }
    expect((await getShelf(store, bob, 2, at(2))).fresh).toHaveLength(1);
    await reportTune(store, { userId: 't2_d', username: 'd' }, id);
    expect((await getShelf(store, bob, 2, at(2))).fresh).toHaveLength(0);
    const mod: Actor = { userId: 't2_mod', username: 'mod', moderator: true };
    expect((await removeTune(store, mod, id)).ok).toBe(true);
  });

  it('refuses the day’s own tune in another mood and a late pin', async () => {
    const store = createMemoryStore();
    await solveDaily(store, ann, 2);
    const copy = { scale: 'misty' as const, notes: dailyPuzzle(2).notes };
    expect(await publishTune(store, ann, copy, at(2))).toMatchObject({
      error: 'duplicate',
    });
    expect(
      await publishTune(store, ann, { ...tune, day: 1 }, at(2))
    ).toMatchObject({ error: 'newday' });
  });

  it('tells the author the next day how their tune did, and needs a heart for an Encore', async () => {
    const store = createMemoryStore();
    await solveDaily(store, ann, 2);
    await solveDaily(store, bob, 2);
    const made = await publishTune(store, ann, tune, at(2));
    if (!made.ok) throw new Error('publish failed');
    expect((await getInit(store, bob, 3, at(3))).encore).toBeNull();
    expect((await getInit(store, ann, 3, at(3))).news).toMatchObject({
      name: made.tune.name,
      solves: 0,
      hearts: 0,
      encore: false,
    });
  });
});

describe('two tabs on one box', () => {
  it('keeps a solve when a slower tab saves an older check after it', async () => {
    const store = createMemoryStore();
    const notes = dailyPuzzle(2).notes;
    const wrong = notes.map((n) => (n + 1) % ROWS);
    await submitPlay(
      store,
      ann,
      { id: 'daily', day: 2, guesses: [wrong, notes] },
      at(2)
    );
    // The other tab read the box before the solve and writes its one check.
    await store.hSet('plays:2:t2_ann', { daily: wrong.join('') });
    const init = await getInit(store, ann, 2, at(2));
    expect(init.play).toMatchObject({ solved: true, done: true });
    expect(init.play?.guesses).toHaveLength(2);
  });
});

describe('the community shelf', () => {
  const tune = { scale: 'dusky' as const, notes: [0, 2, 4, 2, 1, 0, 3] };
  it('needs a login, a solved daily box and one new tune per day', async () => {
    const store = createMemoryStore();
    expect(await publishTune(store, guest, tune, at(2))).toMatchObject({
      ok: false,
      error: 'login',
    });
    expect(await publishTune(store, ann, tune, at(2))).toMatchObject({
      ok: false,
      error: 'locked',
    });
    await solveDaily(store, ann, 2);
    await solveDaily(store, bob, 2);
    expect(
      await publishTune(
        store,
        ann,
        { scale: 'dusky', notes: [0, 0, 0, 0, 0, 0] },
        at(2)
      )
    ).toMatchObject({ error: 'flat' });
    expect(await publishTune(store, ann, dailyPuzzle(2), at(2))).toMatchObject({
      error: 'duplicate',
    });
    const made = await publishTune(store, ann, tune, at(2));
    expect(made).toMatchObject({
      ok: true,
      tune: { author: 'ann', mine: true, hearts: 0 },
    });
    expect(
      await publishTune(
        store,
        ann,
        { ...tune, notes: [1, 2, 3, 2, 1, 0] },
        at(2)
      )
    ).toMatchObject({ error: 'already' });
    expect(await publishTune(store, bob, tune, at(2))).toMatchObject({
      error: 'duplicate',
    });
    expect(
      await publishTune(
        store,
        bob,
        { ...tune, notes: [1, 2, 3, 2, 1, 0] },
        at(2)
      )
    ).toMatchObject({ ok: true });
    const shelf = await getShelf(store, ann, 2, at(2));
    expect(shelf.fresh.map((t) => t.author)).toEqual(['bob', 'ann']);
    expect(shelf.house).toHaveLength(3);
    expect(shelf.mine?.author).toBe('ann');
    expect(shelf.canPublish).toBe(false);
  });
  it('gives the player their tune back when saving it fails', async () => {
    const memory = createMemoryStore();
    let broken = true;
    const store = {
      ...memory,
      zAdd: async (key: string, member: string, score: number) => {
        // Only the ranking write fails; the tune reaches the other list.
        if (broken && key.endsWith(':top')) throw new Error('redis is down');
        await memory.zAdd(key, member, score);
      },
    };
    await solveDaily(store, ann, 2);

    await expect(publishTune(store, ann, tune, at(2))).rejects.toThrow();
    expect((await getShelf(store, ann, 2, at(2))).canPublish).toBe(true);
    broken = false;
    expect(await publishTune(store, ann, tune, at(2))).toMatchObject({
      ok: true,
    });
    const shelf = await getShelf(store, bob, 2, at(2));
    expect(shelf.fresh.filter((card) => !card.house)).toHaveLength(1);
  });

  it('counts a heart on the retry when the first try failed halfway', async () => {
    const memory = createMemoryStore();
    let broken = true;
    const store = {
      ...memory,
      zIncrBy: async (key: string, member: string, amount: number) => {
        if (broken) throw new Error('redis is down');
        return memory.zIncrBy(key, member, amount);
      },
    };
    await solveDaily(store, ann, 2);
    await solveDaily(store, bob, 2);
    const made = await publishTune(store, ann, tune, at(2));
    if (!made.ok) throw new Error('publish failed');
    await submitPlay(
      store,
      bob,
      { id: made.tune.id, day: 2, guesses: [tune.notes] },
      at(2)
    );
    await expect(heartTune(store, bob, made.tune.id)).rejects.toThrow();
    broken = false;
    expect(await heartTune(store, bob, made.tune.id)).toMatchObject({
      ok: true,
      hearts: 1,
    });
    const shelf = await getShelf(store, bob, 2, at(2));
    expect(shelf.top[0]).toMatchObject({ id: made.tune.id, hearts: 1 });
  });

  it('pages through every tune pinned in a day', async () => {
    const store = createMemoryStore();
    const names = Array.from({ length: 45 }, (_, i) => `p${i}`);
    for (const [i, name] of names.entries()) {
      const who: Actor = { userId: `t2_${name}`, username: name };
      await solveDaily(store, who, 2);
      const notes = [i % 5, Math.floor(i / 5) % 5, Math.floor(i / 25), 3, 4, 0];
      const made = await publishTune(
        store,
        who,
        { scale: 'sunny', notes },
        at(2)
      );
      expect(made.ok).toBe(true);
    }
    const seen = new Set<string>();
    let from: number | null = 0;
    let pages = 0;
    while (from !== null) {
      const page: Awaited<ReturnType<typeof getShelf>> = await getShelf(
        store,
        bob,
        2,
        at(2),
        from
      );
      page.fresh.forEach((card) => seen.add(card.id));
      from = page.nextFresh;
      pages += 1;
    }
    expect(pages).toBe(3);
    expect(seen.size).toBe(45);
  });

  it('gives hearts only to solvers and makes the favourite the next Encore', async () => {
    const store = createMemoryStore();
    await solveDaily(store, ann, 2);
    await solveDaily(store, bob, 2);
    const a = await publishTune(store, ann, tune, at(2));
    const b = await publishTune(
      store,
      bob,
      { scale: 'sunny', notes: [1, 2, 3, 2, 1, 0] },
      at(2)
    );
    if (!a.ok || !b.ok) throw new Error('publish failed');
    expect((await heartTune(store, bob, a.tune.id)).ok).toBe(false);
    const solved = await submitPlay(
      store,
      bob,
      { id: a.tune.id, day: 2, guesses: [tune.notes] },
      at(2)
    );
    expect(solved.solves).toBe(1);
    expect(await heartTune(store, bob, a.tune.id)).toMatchObject({
      ok: true,
      hearts: 1,
    });
    expect(await heartTune(store, bob, a.tune.id)).toMatchObject({
      ok: true,
      hearts: 1,
    });
    expect((await heartTune(store, ann, a.tune.id)).ok).toBe(false);
    const own = await submitPlay(
      store,
      ann,
      { id: a.tune.id, day: 2, guesses: [tune.notes] },
      at(2)
    );
    expect(own.solves).toBe(1);
    const init = await getInit(store, bob, undefined, at(3));
    expect(init.encore).toMatchObject({
      id: a.tune.id,
      author: 'ann',
      hearts: 1,
      hearted: true,
    });
    expect(init.encore?.play?.solved).toBe(true);
    expect((await getInit(store, bob, 2, at(3))).encore).toBeNull();
    const house = (await getShelf(store, bob, 3, at(3))).house[0];
    if (!house) throw new Error('no house tune');
    await submitPlay(
      store,
      bob,
      { id: house.id, day: 3, guesses: [house.notes] },
      at(3)
    );
    expect(await heartTune(store, bob, house.id)).toMatchObject({
      ok: true,
      hearts: 1,
    });
  });
});
