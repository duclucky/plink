import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import type {
  CommentPreview,
  CommentResponse,
  ErrorResponse,
  FlairResponse,
  HeartResponse,
  InitResponse,
  PlayResponse,
  PublishResponse,
  RemoveResponse,
  ReportResponse,
  ShelfResponse,
} from '../../shared/api';
import {
  ServiceError,
  claimComment,
  getInit,
  getShelf,
  heartTune,
  publishTune,
  releaseComment,
  removeTune,
  reportTune,
  resultComment,
  streakFlair,
  submitPlay,
  wearStreak,
  type Actor,
} from '../../shared/service';
import { resultsThread } from '../core/post';
import { redisStore } from '../core/redisStore';

export const api = new Hono();

const MOD_CACHE_SECONDS = 600;

/** Whether the player moderates this subreddit, asked of Reddit every ten minutes. */
const isModerator = async (userId: string, username: string) => {
  const key = `mod:${userId}`;
  const cached = await redis.get(key);
  if (cached !== undefined) return cached === '1';
  const mods = await reddit
    .getModerators({ subredditName: context.subredditName, username })
    .all()
    .catch(() => []);
  const moderator = mods.some((mod) => mod.id === userId);
  await redis.set(key, moderator ? '1' : '0');
  await redis.expire(key, MOD_CACHE_SECONDS);
  return moderator;
};

const actor = async (): Promise<Actor> => {
  const { userId, username } = context;
  return {
    userId,
    username,
    moderator: userId && username ? await isModerator(userId, username) : false,
    avatar: async () =>
      username
        ? ((await reddit.getSnoovatarUrl(username).catch(() => undefined)) ??
          null)
        : null,
  };
};

/** Shows the streak as the player's flair here; a failure never breaks play. */
const showFlair = async (text: string) => {
  const { username } = context;
  if (!username) return false;
  try {
    await reddit.setUserFlair({
      subredditName: context.subredditName,
      username,
      text,
    });
    return true;
  } catch (error) {
    console.error('Plink flair not set:', error);
    return false;
  }
};

const postDay = () => {
  const day = context.postData?.day;
  return typeof day === 'number' ? day : undefined;
};

type Body = Record<string, unknown>;

const readBody = async (request: Request): Promise<Body> => {
  const body: unknown = await request.json().catch(() => null);
  return typeof body === 'object' && body !== null ? { ...body } : {};
};

api.onError((error, c) => {
  if (error instanceof ServiceError) {
    return c.json<ErrorResponse>(
      { type: 'error', message: error.message },
      error.status
    );
  }
  console.error('Plink API error:', error);
  return c.json<ErrorResponse>(
    { type: 'error', message: 'The music box jammed. Try again.' },
    500
  );
});

api.get('/init', async (c) =>
  c.json<InitResponse>(
    await getInit(redisStore, await actor(), postDay(), Date.now())
  )
);

api.post('/play', async (c) => {
  const body = await readBody(c.req.raw);
  const guesses = Array.isArray(body.guesses) ? body.guesses : [];
  const result = await submitPlay(
    redisStore,
    await actor(),
    {
      id: typeof body.id === 'string' ? body.id : '',
      day: typeof body.day === 'number' ? body.day : (postDay() ?? 0),
      guesses,
      listens: typeof body.listens === 'number' ? body.listens : 0,
    },
    Date.now()
  );
  // A player who chose to wear the streak sees it move with each box.
  if (result.me?.flair && result.play.done) {
    await showFlair(streakFlair(result.me.streak));
  }
  return c.json<PlayResponse>(result);
});

api.get('/shelf', async (c) => {
  const asked = Number(c.req.query('day'));
  const day = Number.isInteger(asked) ? asked : postDay();
  const from = Number(c.req.query('from') ?? 0);
  return c.json<ShelfResponse>(
    await getShelf(redisStore, await actor(), day, Date.now(), from)
  );
});

api.post('/tune', async (c) => {
  const body = await readBody(c.req.raw);
  return c.json<PublishResponse>(
    await publishTune(
      redisStore,
      await actor(),
      { scale: body.scale, notes: body.notes, day: body.day },
      Date.now()
    )
  );
});

api.post('/heart', async (c) => {
  const body = await readBody(c.req.raw);
  return c.json<HeartResponse>(
    await heartTune(
      redisStore,
      await actor(),
      typeof body.id === 'string' ? body.id : ''
    )
  );
});

api.post('/remove', async (c) => {
  const body = await readBody(c.req.raw);
  return c.json<RemoveResponse>(
    await removeTune(
      redisStore,
      await actor(),
      typeof body.id === 'string' ? body.id : ''
    )
  );
});

api.post('/report', async (c) => {
  const body = await readBody(c.req.raw);
  return c.json<ReportResponse>(
    await reportTune(
      redisStore,
      await actor(),
      typeof body.id === 'string' ? body.id : ''
    )
  );
});

/** The exact words that would be posted, shown before the player agrees. */
api.get('/comment', async (c) => {
  const draft = await resultComment(
    redisStore,
    await actor(),
    postDay(),
    Date.now()
  );
  if (!draft) throw new ServiceError(400, 'Finish the box first.');
  return c.json<CommentPreview>({ type: 'preview', text: draft.text });
});

/** Posts the player's result as their own comment, only when they press it. */
api.post('/comment', async (c) => {
  const who = await actor();
  const { postId } = context;
  const draft = await resultComment(redisStore, who, postDay(), Date.now());
  if (!draft || !who.userId || !postId) {
    throw new ServiceError(400, 'Finish the box first.');
  }
  if (!(await claimComment(redisStore, who.userId, draft.day))) {
    return c.json<CommentResponse>({ type: 'comment', ok: false });
  }
  try {
    const parent = await resultsThread(draft.day, postId).catch(() => postId);
    await reddit.submitComment({
      id: parent.startsWith('t1_') ? `t1_${parent.slice(3)}` : postId,
      text: draft.text.replace(/\n/g, '\n\n'),
      runAs: 'USER',
    });
  } catch (error) {
    await releaseComment(redisStore, who.userId, draft.day);
    throw error;
  }
  return c.json<CommentResponse>({ type: 'comment', ok: true });
});

/** Wears the streak as user flair in this subreddit, on the player's request. */
api.post('/flair', async (c) => {
  const text = await wearStreak(redisStore, await actor(), Date.now());
  if (!text) throw new ServiceError(400, 'Log in to Reddit first.');
  return c.json<FlairResponse>({
    type: 'flair',
    ok: await showFlair(text),
    text,
  });
});
