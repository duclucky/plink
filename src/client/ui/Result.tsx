import type { Histogram, Me } from '../../shared/api';
import { motion, useReducedMotion } from 'motion/react';
import { weekdayLabel } from '../../shared/day';
import { MAX_CHECKS, grade, type Play, type ScaleId } from '../../shared/game';
import { usePlayback } from './usePlayback';
import { verdict } from './verdict';
import { PlayIcon, StopIcon } from './icons';

export const GuessGrid = ({
  notes,
  play,
}: {
  notes: readonly number[];
  play: Play;
}) => (
  <div className="guess-grid" aria-label="Your checks">
    {play.guesses.map((guess, i) => (
      <div className="guess-row" key={i}>
        {grade(notes, guess).map((ok, column) => (
          <span key={column} className={`dot${ok ? ' is-right' : ''}`} />
        ))}
      </div>
    ))}
  </div>
);

export const ReplayButton = ({
  scale,
  notes,
}: {
  scale: ScaleId;
  notes: readonly number[];
}) => {
  const playback = usePlayback();
  const playing = playback.kind !== null;
  return (
    <button
      type="button"
      className={`btn btn-quiet${playing ? ' is-playing' : ''}`}
      onClick={() => {
        if (playing) playback.stop();
        else playback.start('replay', scale, notes);
      }}
    >
      {playing ? <StopIcon /> : <PlayIcon />}
      Replay tune
    </button>
  );
};

const HistogramChart = ({
  histogram,
  mine,
}: {
  histogram: Histogram;
  mine: number | null;
}) => {
  const total = histogram.reduce((sum, n) => sum + n, 0);
  const most = Math.max(1, ...histogram);
  return (
    <section className="panel">
      <h3 className="panel-title">
        The community mix
        <span className="panel-note">
          {total === 1
            ? '1 box fixed'
            : `${total.toLocaleString('en-US')} boxes fixed`}
        </span>
      </h3>
      <div className="histogram">
        {histogram.map((count, i) => (
          <div key={i} className={`bar-row${mine === i + 1 ? ' is-mine' : ''}`}>
            <span className="bar-label">{i + 1}</span>
            <span className="bar-track">
              <span
                className="bar"
                style={{ width: `${Math.max(3, (count / most) * 100)}%` }}
              />
            </span>
            <span className="bar-count">{count.toLocaleString('en-US')}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

const StreakRoll = ({ me, today }: { me: Me; today: number }) => (
  <section className="panel">
    <h3 className="panel-title">
      Your week in sound
      <span className="panel-note">
        {me.streak > 0
          ? `${me.streak}-day streak · best ${me.best}`
          : 'Fix today’s box to start a streak'}
      </span>
    </h3>
    <div className="roll">
      {me.roll.map((checks, i) => {
        const day = today - me.roll.length + 1 + i;
        return (
          <div
            key={i}
            className={`roll-day${checks ? ' is-punched' : ''}${day === today ? ' is-today' : ''}`}
          >
            <span className="roll-hole">{checks ? checks : ''}</span>
            <span className="roll-label">
              {day >= 1 ? weekdayLabel(day) : ''}
            </span>
          </div>
        );
      })}
    </div>
  </section>
);

const untilNext = (ms: number) => {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

export type ResultProps = {
  day: number;
  today: number;
  nextIn: number;
  scale: ScaleId;
  notes: readonly number[];
  title: string | null;
  credit: string | null;
  play: Play;
  histogram: Histogram;
  me: Me;
  shelfCount: number;
  canPublish: boolean;
  onShare: () => void;
  onShelf: () => void;
  onCompose: () => void;
};

export const Result = ({
  day,
  today,
  nextIn,
  scale,
  notes,
  title,
  credit,
  play,
  histogram,
  me,
  shelfCount,
  canPublish,
  onShare,
  onShelf,
  onCompose,
}: ResultProps) => {
  const still = useReducedMotion();
  return (
    <div className="result">
      <motion.section
        className="result-card"
        initial={still ? false : { scale: 0.92, rotate: -2 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      >
        <header className="result-head">
          <p className="eyebrow">
            DAILY MIX #{String(day).padStart(3, '0')} ·{' '}
            {play.solved ? 'NAILED IT' : 'THAT’S A WRAP'}
          </p>
          <h2 className="result-score">
            {play.solved ? play.guesses.length : 'X'}
            <span className="result-of">/{MAX_CHECKS}</span>
          </h2>
          <p className="result-verdict">
            {play.solved
              ? 'You found your groove.'
              : 'Another day, another tune.'}
          </p>
          {title && (
            <p className="result-title">
              You rebuilt <em>{title}</em>
              {credit ? ` (${credit})` : ''}.
            </p>
          )}
        </header>
        <GuessGrid notes={notes} play={play} />
        <p className="result-caption">
          {verdict(play)} · {play.guesses.length}{' '}
          {play.guesses.length === 1 ? 'check' : 'checks'}
        </p>
      </motion.section>
      <div className="result-meta">
        <div>
          <strong>
            {me.streak} {me.streak === 1 ? 'day' : 'days'}
          </strong>
          <span>YOUR STREAK · BEST {me.best}</span>
        </div>
        <div>
          <strong>{day === today ? untilNext(nextIn) : '12:00 UTC'}</strong>
          <span>
            {day === today ? 'UNTIL THE NEXT MIX' : 'A FRESH MIX DAILY'}
          </span>
        </div>
      </div>
      <div className="transport">
        <ReplayButton scale={scale} notes={notes} />
        <button type="button" className="btn btn-quiet" onClick={onShare}>
          Copy result
        </button>
      </div>
      {canPublish ? (
        <button
          type="button"
          className="btn btn-primary btn-wide"
          onClick={onCompose}
        >
          Make a tune. Pass it on. ↗
        </button>
      ) : null}
      {!canPublish && (
        <button
          type="button"
          className="btn btn-wide btn-primary"
          onClick={onShelf}
        >
          Find your next earworm ↗
        </button>
      )}
      {canPublish && (
        <div className="result-secondary">
          <button type="button" className="text-btn" onClick={onShelf}>
            Explore the B-side · {shelfCount} tunes
          </button>
        </div>
      )}
      <details className="stats-disclosure">
        <summary>The community mix & your week</summary>
        <HistogramChart
          histogram={histogram}
          mine={play.solved ? play.guesses.length : null}
        />
        {me.loggedIn && <StreakRoll me={me} today={today} />}
      </details>
    </div>
  );
};
