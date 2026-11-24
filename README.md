# Plink

A daily music box for Reddit. Every day a small music box loses its pins.
Listen to the tune, put the pins back, then pin a tune of your own for other
redditors to fix.

Built with [Devvit Web](https://developers.reddit.com/docs) (React, Hono,
Redis) for the [Reddit's Game of the Day](https://redditgameofday2026.devpost.com/)
hackathon.

## How to play

1. Press **Listen**. The box plays a short tune of 6 to 10 notes.
2. Put one pin in each column of the board. Higher rows sound higher. Tap a
   note name on the left to hear that note, and **Play mine** to hear your
   pins.
3. Press **Check my pins**. Right pins turn green and lock. Wrong pins turn
   red, and their holes are crossed off for good.
4. Fix it in five checks or fewer. Fewer is better.

No sound? The box can still be fixed: each column has five holes, a crossed-off
hole never comes back, so the fifth check is always right.

After today's box:

- **Your result**: your score, how everyone else on Reddit did, your streak on
  a punched paper roll, and a result you can copy into the comments.
- **The shelf**: tunes other redditors pinned today. Fix one and you may leave
  it a heart.
- **Pin your own**: one tune a day, 6 to 10 pins, in one of five moods. The box
  names it for you, so there is nothing to type.
- **Encore**: the best-loved tune of the day comes back the next day, with its
  author's name, at the top of the shelf.

## A week of boxes

A new box opens every day at 12:00 UTC, and the week gets harder as it goes.

| Day      | Pins | Shape                                       |
| -------- | ---- | ------------------------------------------- |
| Mon, Tue | 6    | Small steps                                 |
| Wed, Thu | 7, 8 | A few leaps                                 |
| Fri, Sat | 8, 9 | Wide leaps, moodier scales                  |
| Sunday   | 6-10 | A classic everyone knows, named once solved |

Weekday tunes are generated from the day number, so every player gets the same
box and the game never runs out. Sunday classics are public-domain melodies
(Beethoven, Grieg, Dvořák, folk songs).

## Try it without Reddit

```sh
npm install
npm run demo        # dev server with the whole game running in the browser
npm run build:demo  # one self-contained file: dist/demo/index.html
```

The demo uses the same screens and the same game rules as the Reddit build. Its
"server" is the shared game service running in the page, with a handful of
pretend players so the shelf and the results are not empty.

## Run it on Reddit

You need Node 24 and a Reddit account that has joined
[developers.reddit.com](https://developers.reddit.com).

```sh
npm install
npm run login   # once
npm run dev     # devvit playtest: installs the app on your test subreddit
```

Installing the app posts today's box. After that a scheduled job posts a new
box every day at 12:00 UTC, and moderators can use **Post today's Plink** in
the subreddit menu.

## How it is built

```
src/shared   Game rules, daily tunes, API types and the game service.
             The service talks to a small Store interface, so the same code
             runs on Devvit Redis, in unit tests and in the demo.
src/server   Hono routes on Devvit: /api/* for the game, /internal/* for the
             daily scheduler, the install trigger and the moderator menu.
src/client   React screens. splash.tsx is the inline post, game.tsx is the
             expanded game. Sound is synthesised with the Web Audio API, so
             there are no audio files.
```

- Progress, results, streaks, tunes and hearts live in Redis, keyed by day and
  by user. Nothing important is kept in the browser.
- Every check is graded again on the server. Hearts only count from players
  who solved the tune, and never from its author.
- Player tunes are only notes on a five-note scale. There is no free text
  anywhere in the game.

## Checks

```sh
npm run test:types
npm run lint
npm run test:unit
npm run build
```

## Credits

- Started from Reddit's [devvit-template-react](https://github.com/reddit/devvit-template-react) (BSD-3-Clause).
- Display type: [Fraunces](https://github.com/undercasetype/Fraunces) (SIL Open Font License 1.1).
