import { context, reddit, redis } from '@devvit/web/server';
import { dayNumber, weekdayOf } from '../../shared/day';
import { dailyPuzzle } from '../../shared/melodies';

const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const postKey = (day: number) => `day:${day}:post`;
const lockKey = (day: number) => `day:${day}:posting`;
const LOCK_SECONDS = 120;
const DAY_SECONDS = 24 * 60 * 60;

export type DailyPost = { id: string | null; day: number; created: boolean };

/**
 * Posts today's box once; later calls return the same post. The scheduler, the
 * install trigger and the moderator menu can all fire together, so only the
 * first caller posts. The others get `id: null` while that post is on its way.
 */
export const ensureDailyPost = async (
  now: number = Date.now()
): Promise<DailyPost> => {
  const day = dayNumber(now);
  const existing = await redis.get(postKey(day));
  if (existing) return { id: existing, day, created: false };

  const turn = await redis.incrBy(lockKey(day), 1);
  if (turn !== 1) return { id: null, day, created: false };
  // Only the caller that took the lock times it, so a later call cannot
  // shorten a lock that is being held for the day.
  await redis.expire(lockKey(day), LOCK_SECONDS);

  let id: string;
  try {
    id = await submitDailyPost(day);
  } catch (error) {
    await redis.del(lockKey(day));
    throw error;
  }
  // The post is up. Hold the lock for the whole day before saving its id, so
  // a failed save can never lead to a second post.
  await redis.expire(lockKey(day), DAY_SECONDS);
  await redis.set(postKey(day), id);
  return { id, day, created: true };
};

const submitDailyPost = async (day: number) => {
  const notes = dailyPuzzle(day).notes.length;
  const weekday = WEEKDAY_NAMES[weekdayOf(day)] ?? 'Today';
  const post = await reddit.submitCustomPost({
    subredditName: context.subredditName,
    title: `Plink #${day}: ${weekday}'s music box (${notes} pins)`,
    entry: 'default',
    postData: { day },
    textFallback: {
      text: `Plink #${day}. A music box lost its ${notes} pins. Listen to the tune, put the pins back in five checks or fewer, then pin a tune of your own for others to fix. Open this post in the Reddit app or on new Reddit to play.`,
    },
  });
  return post.id;
};
