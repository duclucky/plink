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

/** Posts today's box once; later calls return the same post. */
export const ensureDailyPost = async (now: number = Date.now()) => {
  const day = dayNumber(now);
  const existing = await redis.get(postKey(day));
  if (existing) return { id: existing, day, created: false };

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
  await redis.set(postKey(day), post.id);
  return { id: post.id, day, created: true };
};
