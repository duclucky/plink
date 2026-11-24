import * as m from 'motion/react-m';
import type { ShelfResponse, TuneCard } from '../../shared/api';
import { SCALES } from '../../shared/game';
import { CheckIcon, HeartIcon } from './icons';

const status = (card: TuneCard) => {
  if (card.mine) return 'yours';
  if (card.play?.solved) return `fixed in ${card.play.guesses.length}`;
  if (card.play) return 'in progress';
  return 'fix it';
};

/** A tiny picture of a tune's size, without giving the notes away. */
const Blank = ({ length }: { length: number }) => (
  <span className="blank" aria-hidden="true">
    {Array.from({ length }, (_, i) => (
      <i key={i} />
    ))}
  </span>
);

const ROW_MOVES = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0 },
};

export const TuneRow = ({
  card,
  badge,
  onOpen,
}: {
  card: TuneCard;
  badge?: string | undefined;
  onOpen: (card: TuneCard) => void;
}) => (
  <m.button
    type="button"
    className={`tune${card.play?.solved || card.mine ? ' is-done' : ''}`}
    onClick={() => onOpen(card)}
    variants={ROW_MOVES}
    whileTap={{ scale: 0.98 }}
  >
    <span className="tune-main">
      <span className="tune-name">
        {card.name}
        {badge ? <span className="badge">{badge}</span> : null}
      </span>
      <span className="tune-by">
        {card.house ? `by ${card.author}` : `by u/${card.author}`} ·{' '}
        {SCALES[card.scale].label.toLowerCase()} · {card.notes.length} pins
      </span>
      <Blank length={card.notes.length} />
    </span>
    <span className="tune-side">
      <span className="tune-status">{status(card)}</span>
      <span className="tune-stats">
        <span className={card.hearted ? 'is-hearted' : ''}>
          <HeartIcon /> {card.hearts}
        </span>
        <span>
          <CheckIcon /> {card.solves}
        </span>
      </span>
    </span>
  </m.button>
);

export type ShelfProps = {
  shelf: ShelfResponse | null;
  encore: TuneCard | null;
  today: number;
  loggedIn: boolean;
  dailyDone: boolean;
  onOpen: (card: TuneCard) => void;
  onCompose: () => void;
};

export const Shelf = ({
  shelf,
  encore,
  today,
  loggedIn,
  dailyDone,
  onOpen,
  onCompose,
}: ShelfProps) => {
  if (!shelf) return <p className="hint">Dusting the shelf…</p>;
  const loved = shelf.top.filter((card) => card.hearts > 0 && !card.mine);
  const leader = loved[0] ?? null;
  const listed = new Set(loved.map((card) => card.id));
  const fresh = shelf.fresh.filter(
    (card) => !listed.has(card.id) && !card.mine
  );
  const why =
    shelf.day !== today
      ? 'This shelf is closed. Today’s box has a new one.'
      : !loggedIn
        ? 'Log in to Reddit to pin a tune of your own.'
        : !dailyDone
          ? 'Fix today’s box first, then pin a tune of your own.'
          : null;

  return (
    <m.div
      className="shelf"
      initial="hidden"
      animate="shown"
      transition={{ staggerChildren: 0.045, delayChildren: 0.05 }}
    >
      <p className="hint">
        Tunes pinned by redditors today. Fix one, and leave a heart if you liked
        it. The best-loved tune plays as tomorrow’s Encore.
      </p>

      {shelf.mine ? (
        <section>
          <h3 className="section-title">Your tune</h3>
          <TuneRow card={shelf.mine} onOpen={onOpen} />
        </section>
      ) : shelf.canPublish ? (
        <button
          type="button"
          className="btn btn-primary btn-wide"
          onClick={onCompose}
        >
          Pin a tune of your own
        </button>
      ) : why ? (
        <p className="notice">{why}</p>
      ) : null}

      {encore && (
        <section>
          <h3 className="section-title">Today’s Encore</h3>
          <TuneRow
            card={encore}
            badge="yesterday’s favourite"
            onOpen={onOpen}
          />
        </section>
      )}

      {loved.length > 0 && (
        <section>
          <h3 className="section-title">Best loved</h3>
          {loved.map((card) => (
            <TuneRow
              key={card.id}
              card={card}
              badge={card.id === leader?.id ? 'tomorrow’s Encore?' : undefined}
              onOpen={onOpen}
            />
          ))}
        </section>
      )}

      {fresh.length > 0 && (
        <section>
          <h3 className="section-title">Just pinned</h3>
          {fresh.map((card) => (
            <TuneRow key={card.id} card={card} onOpen={onOpen} />
          ))}
        </section>
      )}

      <section>
        <h3 className="section-title">From the workshop</h3>
        {shelf.house.map((card) => (
          <TuneRow key={card.id} card={card} onOpen={onOpen} />
        ))}
      </section>
    </m.div>
  );
};
