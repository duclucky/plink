import { useState } from 'react';
import type { Histogram, Me, TuneCard, TuneNews } from '../../shared/api';
import { weekdayLabel } from '../../shared/day';
import { MAX_CHECKS, grade, type Play, type ScaleId } from '../../shared/game';
import { Faces } from './Avatar';
import { usePlayback } from './usePlayback';
import { clockText } from './useNow';
import { verdict } from './verdict';
import { HeartIcon, PlayIcon, StopIcon } from './icons';

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

const BUCKETS = ['1', '2', '3', '4', 'X'];

const HistogramChart = ({
  histogram,
  mine,
}: {
  histogram: Histogram;
  mine: number;
}) => {
  const most = Math.max(1, ...histogram);
  return (
    <div className="histogram">
      {histogram.map((count, i) => (
        <div key={i} className={`bar-row${mine === i ? ' is-mine' : ''}`}>
          <span className="bar-label">{BUCKETS[i]}</span>
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
  );
};

const StreakRoll = ({ me, today }: { me: Me; today: number }) => (
  <div className="roll">
    {me.roll.map((checks, i) => {
      const day = today - me.roll.length + 1 + i;
      return (
        <div
          key={i}
          className={`roll-day${checks ? ' is-punched' : ''}${day === today ? ' is-today' : ''}`}
        >
          <span className="roll-hole">
            {checks ? checks : checks === 0 ? '×' : ''}
          </span>
          <span className="roll-label">
            {day >= 1 ? weekdayLabel(day) : ''}
          </span>
        </div>
      );
    })}
  </div>
);

/** How the tune this player pinned yesterday did. */
export const NewsLine = ({ news }: { news: TuneNews }) => (
  <p className="news">
    {news.encore ? 'Your tune is today’s Encore. ' : ''}
    Yesterday {news.solves} {news.solves === 1 ? 'redditor' : 'redditors'} fixed
    your <em>{news.name}</em> · <HeartIcon /> {news.hearts}
  </p>
);

export type ResultProps = {
  day: number;
  today: number;
  /** Milliseconds until the next box, already counting down. */
  nextIn: number;
  scale: ScaleId;
  notes: readonly number[];
  title: string;
  credit: string;
  play: Play;
  listens: number | null;
  histogram: Histogram;
  faces: readonly string[];
  me: Me;
  encore: TuneCard | null;
  news: TuneNews | null;
  shelfCount: number;
  canPublish: boolean;
  /** The comment that would be posted, while the player is deciding. */
  commentDraft: string | null;
  commented: boolean;
  onShare: () => void;
  onShelf: () => void;
  onCompose: () => void;
  onEncore: (card: TuneCard) => void;
  onCommentAsk: () => void;
  onCommentPost: () => void;
  onCommentCancel: () => void;
  onFlair: () => void;
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
  listens,
  histogram,
  faces,
  me,
  encore,
  news,
  shelfCount,
  canPublish,
  commentDraft,
  commented,
  onShare,
  onShelf,
  onCompose,
  onEncore,
  onCommentAsk,
  onCommentPost,
  onCommentCancel,
  onFlair,
}: ResultProps) => {
  const [more, setMore] = useState(false);
  const players = histogram.reduce((sum, n) => sum + n, 0);
  const encoreOpen =
    encore !== null && !encore.mine && encore.play?.done !== true;
  // One thing to do next, in order: the Encore, a tune of your own, the shelf.
  const next = encoreOpen
    ? {
        label: `Fix today’s Encore by u/${encore.author}`,
        go: () => onEncore(encore),
      }
    : canPublish
      ? { label: 'Pin a tune of your own', go: onCompose }
      : {
          label:
            shelfCount > 0
              ? `Fix redditors’ tunes (${shelfCount})`
              : 'Open the shelf',
          go: onShelf,
        };

  return (
    <div className="result">
      <header className="result-head">
        <p className="eyebrow">
          Plink #{day} {play.solved ? 'fixed' : 'stays broken'}
        </p>
        <h2 className="result-score">
          {play.solved ? play.guesses.length : 'X'}
          <span className="result-of">/{MAX_CHECKS}</span>
        </h2>
        <p className="result-verdict">
          {verdict(play)}
          {listens !== null
            ? ` · ${listens} ${listens === 1 ? 'listen' : 'listens'}`
            : ''}
        </p>
        <p className="result-title">
          {play.solved ? 'You rebuilt ' : 'It was '}
          <em>{title}</em>
          {credit ? ` (${credit})` : ''}.
        </p>
      </header>
      <GuessGrid notes={notes} play={play} />
      {me.loggedIn && (
        <p className="result-line">
          {me.streak > 0 ? (
            <strong>{me.streak}-day streak</strong>
          ) : (
            'No streak yet'
          )}
          {day === today ? ` · next box in ${clockText(nextIn)}` : ''}
        </p>
      )}
      {news && <NewsLine news={news} />}

      <button
        type="button"
        className="btn btn-primary btn-wide"
        onClick={next.go}
      >
        {next.label}
      </button>

      {commentDraft === null ? (
        <div className="transport">
          <ReplayButton scale={scale} notes={notes} />
          {me.loggedIn && !commented ? (
            <button
              type="button"
              className="btn btn-quiet"
              onClick={onCommentAsk}
            >
              Comment my result
            </button>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={onShare}>
              Copy result
            </button>
          )}
        </div>
      ) : (
        <section className="panel confirm">
          <h3 className="panel-title">Post this as your comment?</h3>
          <pre className="comment-preview">{commentDraft}</pre>
          <p className="fineprint">
            It is posted from your account, u/{me.name}, in this post’s results
            thread. Nothing is posted unless you press the button.
          </p>
          <div className="transport">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onCommentPost}
            >
              Post comment
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={onCommentCancel}
            >
              Not now
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        className="link"
        aria-expanded={more}
        onClick={() => setMore((open) => !open)}
      >
        <Faces urls={faces} />
        {players === 1
          ? '1 redditor played'
          : `${players.toLocaleString('en-US')} redditors played`}{' '}
        · {more ? 'hide' : 'how Reddit did'}
      </button>
      {more && (
        <section className="panel">
          <HistogramChart
            histogram={histogram}
            mine={play.solved ? play.guesses.length - 1 : MAX_CHECKS}
          />
          {me.loggedIn && (
            <>
              <h3 className="panel-title">
                Your paper roll
                <span className="panel-note">best streak {me.best}</span>
              </h3>
              <StreakRoll me={me} today={today} />
              <div className="transport">
                <button
                  type="button"
                  className="btn btn-quiet"
                  disabled={me.flair}
                  onClick={onFlair}
                >
                  {me.flair
                    ? 'Streak shown as your flair'
                    : 'Wear my streak as flair'}
                </button>
                {me.loggedIn && !commented && (
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={onShare}
                  >
                    Copy result
                  </button>
                )}
              </div>
            </>
          )}
          {next.go !== onShelf && (
            <button type="button" className="link" onClick={onShelf}>
              {shelfCount > 0
                ? `Open the shelf (${shelfCount} ${shelfCount === 1 ? 'tune' : 'tunes'} by redditors)`
                : 'Open the shelf'}
            </button>
          )}
        </section>
      )}
    </div>
  );
};
