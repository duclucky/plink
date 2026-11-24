import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type {
  ErrorResponse,
  HeartResponse,
  InitResponse,
  PlayResponse,
  PublishResponse,
  ShelfResponse,
} from '../../shared/api';
import {
  ServiceError,
  getInit,
  getShelf,
  heartTune,
  publishTune,
  submitPlay,
  type Actor,
} from '../../shared/service';
import { redisStore } from '../core/redisStore';

export const api = new Hono();

const actor = (): Actor => ({
  userId: context.userId,
  username: context.username,
});

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
    await getInit(redisStore, actor(), postDay(), Date.now())
  )
);

api.post('/play', async (c) => {
  const body = await readBody(c.req.raw);
  const guesses = Array.isArray(body.guesses) ? body.guesses : [];
  return c.json<PlayResponse>(
    await submitPlay(
      redisStore,
      actor(),
      {
        id: typeof body.id === 'string' ? body.id : '',
        day: typeof body.day === 'number' ? body.day : (postDay() ?? 0),
        guesses,
      },
      Date.now()
    )
  );
});

api.get('/shelf', async (c) => {
  const asked = Number(c.req.query('day'));
  const day = Number.isInteger(asked) ? asked : postDay();
  const from = Number(c.req.query('from') ?? 0);
  return c.json<ShelfResponse>(
    await getShelf(redisStore, actor(), day, Date.now(), from)
  );
});

api.post('/tune', async (c) => {
  const body = await readBody(c.req.raw);
  return c.json<PublishResponse>(
    await publishTune(
      redisStore,
      actor(),
      { scale: body.scale, notes: body.notes },
      Date.now()
    )
  );
});

api.post('/heart', async (c) => {
  const body = await readBody(c.req.raw);
  return c.json<HeartResponse>(
    await heartTune(
      redisStore,
      actor(),
      typeof body.id === 'string' ? body.id : ''
    )
  );
});
