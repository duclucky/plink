import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { ensureDailyPost } from '../core/post';

export const schedulerRoutes = new Hono();

/** Runs at 12:00 UTC, when the day number turns over. */
schedulerRoutes.post('/daily-post', async (c) => {
  const post = await ensureDailyPost();
  console.log(`Plink #${post.day}: post ${post.id} (new: ${post.created})`);
  return c.json<TaskResponse>({ status: 'ok' }, 200);
});
