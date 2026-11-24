import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type {
  InitResponse,
  PublishError,
  ShelfResponse,
  TuneCard,
} from '../shared/api';
import { evaluate, shareText, type Play, type ScaleId } from '../shared/game';
import type { Backend } from './backend';
import { Composer } from './ui/Composer';
import { MuteButton } from './ui/MuteButton';
import { Puzzle } from './ui/Puzzle';
import { GuessGrid, ReplayButton, Result } from './ui/Result';
import { verdict } from './ui/verdict';
import { Shelf } from './ui/Shelf';
import { copyText, type Host } from './ui/host';
import { HeartIcon } from './ui/icons';

type View =
  | { name: 'daily' }
  | { name: 'shelf' }
  | { name: 'tune'; card: TuneCard; finished: boolean }
  | { name: 'compose' };

export type AppProps = {
  backend: Backend;
  host: Host;
};

export const App = ({ backend, host }: AppProps) => {
  const appRef = useRef<HTMLElement>(null);
  const still = useReducedMotion();
  const [init, setInit] = useState<InitResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState<View>({ name: 'daily' });
  const [dailyShown, setDailyShown] = useState(false);
  const [shelf, setShelf] = useState<ShelfResponse | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<PublishError | null>(null);

  const [attempt, setAttempt] = useState(0);
  const routeKey =
    view.name === 'tune'
      ? `${view.card.id}:${view.finished}`
      : view.name === 'daily' && dailyShown
        ? 'daily-result'
        : view.name;
  useEffect(() => {
    appRef.current?.closest('.demo-frame')?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [routeKey]);

  useEffect(() => {
    let live = true;
    backend
      .init()
      .then((data) => {
        if (!live) return;
        setInit(data);
        setDailyShown(data.play?.done === true);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [backend, attempt]);

  const load = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  const day = init?.daily.day;
  const refreshShelf = useCallback(() => {
    if (day === undefined) return;
    backend
      .shelf(day)
      .then(setShelf)
      .catch(() => host.toast('The shelf would not open. Try again.'));
  }, [backend, day, host]);

  if (failed) {
    return (
      <main className="app">
        <div className="empty">
          <p className="hint">A little static. Let’s try again.</p>
          <button type="button" className="btn btn-primary" onClick={load}>
            Try again
          </button>
        </div>
      </main>
    );
  }
  if (!init) {
    return (
      <main className="app">
        <div className="empty">
          <p className="hint">Finding our rhythm…</p>
        </div>
      </main>
    );
  }

  const { daily, today, me } = init;
  const dailyDone = init.play?.done === true;

  const openShelf = () => {
    setView({ name: 'shelf' });
    refreshShelf();
  };

  const checkDaily = (guesses: number[][]) => {
    const play = evaluate(daily.notes, guesses);
    setInit((current) => (current ? { ...current, play } : current));
    backend
      .play({ id: 'daily', day: daily.day, guesses })
      .then((res) =>
        setInit((current) =>
          current
            ? {
                ...current,
                play:
                  res.play.guesses.length >= play.guesses.length
                    ? res.play
                    : play,
                histogram: res.histogram ?? current.histogram,
                me: res.me ?? current.me,
              }
            : current
        )
      )
      .catch(() => host.toast('Could not save that check. Keep going.'));
  };

  const checkTune = (card: TuneCard, guesses: number[][]) => {
    const play = evaluate(card.notes, guesses);
    setView({ name: 'tune', card: { ...card, play }, finished: false });
    backend
      .play({ id: card.id, day: card.day, guesses })
      .then((res) =>
        setView((current) =>
          current.name === 'tune' && current.card.id === card.id
            ? {
                ...current,
                card: {
                  ...current.card,
                  solves: res.solves ?? current.card.solves,
                },
              }
            : current
        )
      )
      .catch(() => host.toast('Could not save that check. Keep going.'));
  };

  const heart = (card: TuneCard) => {
    backend
      .heart(card.id)
      .then((res) => {
        if (!res.ok) return;
        const loved = { ...card, hearted: true, hearts: res.hearts };
        setView((current) =>
          current.name === 'tune' && current.card.id === card.id
            ? { ...current, card: loved }
            : current
        );
        setInit((current) =>
          current && current.encore?.id === card.id
            ? { ...current, encore: loved }
            : current
        );
      })
      .catch(() => host.toast('That heart did not stick. Try again.'));
  };

  const publish = (scale: ScaleId, notes: number[]) => {
    setPublishing(true);
    setPublishError(null);
    backend
      .publish({ scale, notes })
      .then((res) => {
        if (!res.ok) {
          setPublishError(res.error);
          return;
        }
        setInit((current) =>
          current
            ? {
                ...current,
                myTuneId: res.tune.id,
                shelfCount: current.shelfCount + 1,
              }
            : current
        );
        host.toast(`“${res.tune.name}” is on the shelf.`);
        openShelf();
      })
      .catch(() => host.toast('Could not pin that tune. Try again.'))
      .finally(() => setPublishing(false));
  };

  const share = async (label: string, notes: readonly number[], play: Play) => {
    const ok = await copyText(shareText(label, notes, play));
    host.toast(
      ok
        ? 'Result copied. Paste it in the comments.'
        : 'Could not copy on this device.'
    );
  };

  const back =
    view.name === 'daily'
      ? null
      : view.name === 'shelf'
        ? () => setView({ name: 'daily' })
        : openShelf;

  const heading =
    view.name === 'daily'
      ? `Daily mix #${daily.day}`
      : view.name === 'shelf'
        ? 'The B-side'
        : view.name === 'compose'
          ? 'Make a tune'
          : view.card.name;

  const sub =
    view.name === 'tune'
      ? view.card.house
        ? `by ${view.card.author}`
        : `by u/${view.card.author}`
      : view.name === 'daily' && me.streak > 0
        ? `${me.streak}-day streak`
        : view.name === 'daily'
          ? 'One fresh tune, every day'
          : null;

  return (
    <main className="app" ref={appRef}>
      <header className="topbar">
        {back ? (
          <button
            type="button"
            className="icon-btn"
            aria-label="Back"
            onClick={back}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                d="M14.5 5.5L8 12l6.5 6.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
        ) : (
          <span className="topbar-logo" aria-label="Plink">
            p<span>.</span>
          </span>
        )}
        <div className="topbar-title">
          <h1>{heading}</h1>
          {sub && <p>{sub}</p>}
        </div>
        <MuteButton />
      </header>

      <motion.div
        className="stage"
        key={view.name === 'tune' ? view.card.id : view.name}
        initial={still ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {view.name === 'daily' && !(dailyDone && dailyShown) && (
          <Puzzle
            scale={daily.scale}
            notes={daily.notes}
            initial={init.play}
            onCheck={checkDaily}
            onDone={() => setDailyShown(true)}
          />
        )}
        {view.name === 'daily' && dailyDone && dailyShown && init.play && (
          <Result
            day={daily.day}
            today={today}
            nextIn={init.nextIn}
            scale={daily.scale}
            notes={daily.notes}
            title={daily.title}
            credit={daily.credit}
            play={init.play}
            histogram={init.histogram}
            me={me}
            shelfCount={init.shelfCount}
            canPublish={
              me.loggedIn && daily.day === today && init.myTuneId === null
            }
            onShare={() => {
              if (init.play)
                void share(`Plink #${daily.day}`, daily.notes, init.play);
            }}
            onShelf={openShelf}
            onCompose={() => {
              setPublishError(null);
              setView({ name: 'compose' });
            }}
          />
        )}
        {view.name === 'shelf' && (
          <Shelf
            shelf={shelf}
            encore={init.encore}
            today={today}
            loggedIn={me.loggedIn}
            dailyDone={dailyDone}
            onOpen={(card) =>
              setView({
                name: 'tune',
                card,
                finished: card.mine || card.play?.done === true,
              })
            }
            onCompose={() => {
              setPublishError(null);
              setView({ name: 'compose' });
            }}
          />
        )}
        {view.name === 'compose' && (
          <Composer
            busy={publishing}
            error={publishError}
            onPublish={publish}
          />
        )}
        {view.name === 'tune' && !view.finished && (
          <Puzzle
            scale={view.card.scale}
            notes={view.card.notes}
            initial={view.card.play}
            onCheck={(guesses) => checkTune(view.card, guesses)}
            onDone={() =>
              setView((current) =>
                current.name === 'tune'
                  ? { ...current, finished: true }
                  : current
              )
            }
          />
        )}
        {view.name === 'tune' && view.finished && (
          <div className="result">
            <header className="result-head">
              {view.card.mine ? (
                <>
                  <p className="eyebrow">Your tune today</p>
                  <h2 className="result-score">{view.card.solves}</h2>
                  <p className="result-verdict">
                    {view.card.solves === 1
                      ? 'redditor fixed it'
                      : 'redditors fixed it'}{' '}
                    · <HeartIcon /> {view.card.hearts}
                  </p>
                </>
              ) : view.card.play ? (
                <>
                  <p className="eyebrow">Fixed</p>
                  <h2 className="result-score">
                    {view.card.play.guesses.length}
                    <span className="result-of">/5</span>
                  </h2>
                  <p className="result-verdict">{verdict(view.card.play)}</p>
                </>
              ) : null}
            </header>
            {view.card.play && !view.card.mine && (
              <GuessGrid notes={view.card.notes} play={view.card.play} />
            )}
            <div className="transport">
              <ReplayButton scale={view.card.scale} notes={view.card.notes} />
              {!view.card.mine && view.card.play?.solved && (
                <button
                  type="button"
                  className={`btn btn-quiet btn-heart${view.card.hearted ? ' is-hearted' : ''}`}
                  disabled={view.card.hearted || !me.loggedIn}
                  onClick={() => heart(view.card)}
                >
                  <HeartIcon size={16} />
                  {view.card.hearted
                    ? `Loved · ${view.card.hearts}`
                    : 'Leave a heart'}
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-wide"
              onClick={openShelf}
            >
              Back to the shelf
            </button>
          </div>
        )}
      </motion.div>
    </main>
  );
};
