import type { Histogram, Me } from '../../shared/api';
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
      Hear it again
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
        How Reddit did
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
      Your paper roll
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
}: ResultProps) => (
  <div className="result daily-result">
    <div className="repair-certificate">
      <div className="certificate-top">
        <span>THE PLINK WORKSHOP</span>
        <span>NO. {String(day).padStart(3, '0')}</span>
      </div>
      <header className="result-head">
        <div className="repair-stamp" aria-hidden="true">
          <span>BACK IN</span>
          <strong>TUNE</strong>
          <span>✦ ✦ ✦</span>
        </div>
        <p className="eyebrow">
          DAILY BOX · {play.solved ? 'REPAIRED' : 'CLOSED'}
        </p>
        <h2 className="result-score">
          {play.solved ? play.guesses.length : 'X'}
          <span className="result-of">/{MAX_CHECKS}</span>
        </h2>
        <p className="result-verdict">{verdict(play)}</p>
        {title && (
          <p className="result-title">
            You rebuilt <em>{title}</em>
            {credit ? ` · ${credit}` : ''}
          </p>
        )}
      </header>
      <GuessGrid notes={notes} play={play} />
      <div className="result-meta">
        <div>
          <strong>
            {me.streak}
            <span>{me.streak === 1 ? ' day' : ' days'}</span>
          </strong>
          <span>YOUR STREAK</span>
        </div>
        <div>
          <strong>{day === today ? untilNext(nextIn) : 'Tomorrow'}</strong>
          <span>UNTIL THE NEXT BOX</span>
        </div>
      </div>
      <p className="certificate-note">
        A little patience. A little music. Nicely done.
      </p>
    </div>
    {canPublish && (
      <button
        type="button"
        className="btn btn-primary btn-wide"
        onClick={onCompose}
      >
        Pin a melody of your own <span aria-hidden="true">↗</span>
      </button>
    )}
    <div className="transport">
      <ReplayButton scale={scale} notes={notes} />
      <button type="button" className="btn btn-quiet" onClick={onShare}>
        Copy result <span aria-hidden="true">↗</span>
      </button>
    </div>
    <button
      type="button"
      className={`btn btn-wide ${canPublish ? 'btn-text' : 'btn-primary'}`}
      onClick={onShelf}
    >
      Explore the shelf · {shelfCount} melodies{' '}
      <span aria-hidden="true">→</span>
    </button>
    <details className="result-details">
      <summary>
        Your week & the workshop <span aria-hidden="true">+</span>
      </summary>
      <HistogramChart
        histogram={histogram}
        mine={play.solved ? play.guesses.length : null}
      />
      {me.loggedIn && <StreakRoll me={me} today={today} />}
    </details>
  </div>
);
