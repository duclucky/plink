import { Hono } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { ensureDailyPost } from '../core/post';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await ensureDailyPost();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Plink #${post.day} is post ${post.id ?? 'pending'}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Failed to create post' },
      400
    );
  }
});
