import { redis } from '@devvit/web/server';
import type { Store } from '../../shared/store';

/** The game's Store, backed by the app's Devvit Redis. */
export const redisStore: Store = {
  get: (key) => redis.get(key),
  set: async (key, value) => {
    await redis.set(key, value);
  },
  incrBy: (key, amount) => redis.incrBy(key, amount),
  hGet: (key, field) => redis.hGet(key, field),
  hGetAll: async (key) => (await redis.hGetAll(key)) ?? {},
  hSet: async (key, fields) => {
    await redis.hSet(key, fields);
  },
  hSetNX: async (key, field, value) =>
    (await redis.hSetNX(key, field, value)) === 1,
  hIncrBy: (key, field, amount) => redis.hIncrBy(key, field, amount),
  hDel: async (key, field) => {
    await redis.hDel(key, [field]);
  },
  zAdd: async (key, member, score) => {
    await redis.zAdd(key, { member, score });
  },
  zRem: async (key, member) => {
    await redis.zRem(key, [member]);
  },
  zIncrBy: (key, member, amount) => redis.zIncrBy(key, member, amount),
  zTop: (key, count, offset = 0) =>
    redis.zRange(key, offset, offset + count - 1, {
      by: 'rank',
      reverse: true,
    }),
  zCard: (key) => redis.zCard(key),
};
