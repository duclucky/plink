import { createTimeline } from 'animejs';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { InitResponse } from '../../shared/api';
import { weekdayOf } from '../../shared/day';
import { ROWS } from '../../shared/game';
import type { Backend } from '../backend';
import { calm, useEased } from './fx';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** A music-box drum with pins that say nothing about today's answer. */
const Drum = ({ day, columns }: { day: number; columns: number }) => {
  const width = 300;
  const height = 120;
  const colW = (width - 40) / columns;
  const drum = useRef<SVGSVGElement | null>(null);

  // The comb sweeps the drum and every pin it passes rings.
  useEffect(() => {
    const svg = drum.current;
    const comb = svg?.querySelector('.drum-comb');
    if (!svg || !comb || calm()) return;
    const sweep = 2600;
    const turn = createTimeline({ loop: true, loopDelay: 1100 });
    turn.add(
      comb,
      {
        translateX: [0, width - 40],
        opacity: [
          { to: 1, duration: 200 },
          { to: 1, duration: sweep - 500 },
          { to: 0, duration: 300 },
        ],
        duration: sweep,
        ease: 'linear',
      },
      0
    );
    svg.querySelectorAll<SVGCircleElement>('.drum-pin').forEach((pin) => {
      const at = Number(pin.dataset.column ?? 0);
      turn.add(
        pin,
        {
          scale: [
            { to: 1.55, duration: 110, ease: 'outQuad' },
            { to: 1, duration: 520, ease: 'outElastic(1, 0.45)' },
          ],
        },
        ((at + 0.5) / columns) * sweep
      );
    });
    return () => {
      turn.revert();
    };
  }, [columns, day]);

  return (
    <svg
      ref={drum}
      className="drum"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <rect
        className="drum-body"
        x="6"
        y="10"
        width={width - 12}
        height={height - 20}
        rx="18"
      />
      {Array.from({ length: ROWS }, (_, row) => (
        <line
          key={row}
          className="board-lane"
          x1="20"
          x2={width - 20}
          y1={26 + row * 17}
          y2={26 + row * 17}
        />
      ))}
      {Array.from({ length: columns }, (_, column) => {
        const row = (column * 3 + day * 2 + (column % 2)) % ROWS;
        const missing = (column + day) % 3 !== 0;
        return missing ? (
          <circle
            key={column}
            className="drum-hole"
            cx={20 + colW * (column + 0.5)}
            cy={26 + row * 17}
            r="4"
          />
        ) : (
          <circle
            key={column}
            className="drum-pin"
            data-column={column}
            cx={20 + colW * (column + 0.5)}
            cy={26 + row * 17}
            r="6.5"
          />
        );
      })}
      <line className="drum-comb" x1="20" x2="20" y1="16" y2={height - 16} />
    </svg>
  );
};

export type SplashProps = {
  backend: Backend;
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const Splash = ({ backend, onOpen }: SplashProps) => {
  const [init, setInit] = useState<InitResponse | null>(null);

  useEffect(() => {
    let live = true;
    backend
      .init()
      .then((data) => {
        if (live) setInit(data);
      })
      .catch(() => {
        // The splash still opens the game without its numbers.
      });
    return () => {
      live = false;
    };
  }, [backend]);

  const day = init?.daily.day;
  const pins = init?.daily.notes.length ?? 8;
  const play = init?.play ?? null;
  const fixed = init ? init.histogram.reduce((sum, n) => sum + n, 0) : 0;
  const streak = init?.me.streak ?? 0;
  const fixedShown = Math.round(useEased(fixed, 900));

  const pitch = play?.done
    ? `You fixed it in ${play.guesses.length}. Now fix a redditor’s tune, or pin your own.`
    : play
      ? `You have used ${play.guesses.length} of 5 checks. The box is waiting.`
      : `This music box has lost its ${pins} pins. Listen to the tune, then put them back.`;

  const action = play?.done
    ? 'Open the shelf'
    : play
      ? 'Keep fixing'
      : 'Open the box';

  return (
    <main className="splash">
      <p className="eyebrow">
        {day === undefined
          ? 'A daily music box'
          : `${DAY_NAMES[weekdayOf(day)] ?? 'Today'}’s music box`}
      </p>
      <h1 className="splash-title">
        Plink
        {day === undefined ? (
          ''
        ) : (
          <span className="splash-number"> #{day}</span>
        )}
      </h1>
      <Drum day={day ?? 1} columns={pins} />
      <p className="splash-pitch">{pitch}</p>
      <button
        type="button"
        className="btn btn-primary btn-big"
        onClick={onOpen}
      >
        {action}
      </button>
      <p className="splash-stats">
        {fixed > 0
          ? `${fixedShown.toLocaleString('en-US')} ${fixed === 1 ? 'redditor has' : 'redditors have'} fixed it`
          : 'Be the first to fix it'}
        {streak > 0 ? ` · your streak: ${streak}` : ''}
      </p>
    </main>
  );
};
