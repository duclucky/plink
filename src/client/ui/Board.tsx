import { animate } from 'animejs';
import {
  AnimatePresence,
  type TargetAndTransition,
  type Transition,
} from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useRef } from 'react';
import { ROWS, SCALES, type ScaleId } from '../../shared/game';
import { calm } from './fx';
import { GUTTER, HEIGHT, ROW_H, TOP, WIDTH } from './geometry';

type PinMove = {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  transition: Transition;
};

const PIN_MOVES: Record<'set' | 'right' | 'wrong', PinMove> = {
  set: {
    initial: { scale: 1.7, opacity: 0.2 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: 'spring', stiffness: 620, damping: 17 },
  },
  right: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.42, 1] },
    transition: { duration: 0.42, ease: 'easeOut' },
  },
  wrong: {
    initial: { x: 0 },
    animate: { x: [0, -3.5, 3.5, -2, 0] },
    transition: { duration: 0.38, ease: 'easeInOut' },
  },
};

/** Flicks a comb tine and lets it ring out. */
const twang = (tine: SVGRectElement) =>
  calm()
    ? null
    : animate(tine, {
        translateX: [
          { to: 4, duration: 50, ease: 'outQuad' },
          { to: 0, duration: 520, ease: 'outElastic(1, 0.35)' },
        ],
      });

export type BoardProps = {
  scale: ScaleId;
  /** Row of the pin in each column, or null while the column is empty. */
  pins: readonly (number | null)[];
  /** Columns already proven right; their pins cannot move. */
  locked: readonly boolean[];
  /** Rows already proven wrong, per column. */
  ruledOut: readonly (readonly number[])[];
  /** Column the comb is passing while a tune plays. */
  playhead: number | null;
  /**
   * Row sounding at the playhead, when showing it gives nothing away: the
   * player's own pins, or the tune once it is solved.
   */
  sounding: number | null;
  /** Show red crosses on pins that the last check found wrong. */
  showWrong: boolean;
  disabled: boolean;
  onPin: (column: number, row: number) => void;
  /** Tapping a note name on the comb sounds that note. */
  onTine: (row: number) => void;
};

export const Board = ({
  scale,
  pins,
  locked,
  ruledOut,
  playhead,
  sounding,
  showWrong,
  disabled,
  onPin,
  onTine,
}: BoardProps) => {
  const columns = pins.length;
  const colW = (WIDTH - GUTTER - 8) / columns;
  const x = (column: number) => GUTTER + colW * (column + 0.5);
  const y = (row: number) => TOP + ROW_H * (ROWS - 1 - row + 0.5);
  const radius = Math.min(13, colW * 0.36);
  const names = SCALES[scale].names;
  const tines = useRef<(SVGRectElement | null)[]>([]);

  const pluck = (row: number) => {
    const tine = tines.current[row];
    if (tine) twang(tine);
  };

  useEffect(() => {
    const tine = sounding === null ? null : tines.current[sounding];
    if (!tine) return;
    const pulse = twang(tine);
    return () => {
      pulse?.cancel();
    };
  }, [sounding, playhead]);

  return (
    <svg
      className="board"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="group"
      aria-label={`Pin board, ${columns} columns by ${ROWS} notes`}
    >
      <rect
        className="board-bed"
        x={GUTTER - 4}
        y={2}
        width={WIDTH - GUTTER + 2}
        height={HEIGHT - 4}
        rx={12}
      />
      <AnimatePresence>
        {playhead !== null && (
          <m.rect
            key="playhead"
            className="board-playhead"
            x={0}
            y={5}
            width={colW - 2}
            height={HEIGHT - 10}
            rx={8}
            initial={{ opacity: 0, x: x(playhead) - colW / 2 + 1 }}
            animate={{ opacity: 1, x: x(playhead) - colW / 2 + 1 }}
            exit={{ opacity: 0 }}
            transition={{
              x: { type: 'spring', stiffness: 700, damping: 40 },
              opacity: { duration: 0.18 },
            }}
          />
        )}
      </AnimatePresence>
      {Array.from({ length: ROWS }, (_, row) => (
        <g
          key={row}
          className="tine"
          role="button"
          aria-label={`Hear note ${names[row]}`}
          onPointerDown={() => {
            pluck(row);
            onTine(row);
          }}
        >
          <line
            className="board-lane"
            x1={GUTTER + 2}
            x2={WIDTH - 8}
            y1={y(row)}
            y2={y(row)}
          />
          <rect
            ref={(el) => {
              tines.current[row] = el;
            }}
            className="board-tine"
            x={2}
            y={y(row) - 12}
            width={24}
            height={24}
            rx={6}
          />
          <text
            className="board-tine-name"
            x={14}
            y={y(row) + 4.5}
            textAnchor="middle"
          >
            {names[row]}
          </text>
        </g>
      ))}
      {pins.map((pin, column) =>
        Array.from({ length: ROWS }, (_, row) => {
          const isPin = pin === row;
          const isLocked = locked[column] === true;
          const out = ruledOut[column]?.includes(row) === true;
          const wrongPin = isPin && out && showWrong;
          const state = isPin
            ? isLocked
              ? 'right'
              : wrongPin
                ? 'wrong'
                : 'set'
            : out
              ? 'out'
              : 'free';
          const blocked = disabled || isLocked || (out && !isPin);
          const move =
            PIN_MOVES[state === 'right' || state === 'wrong' ? state : 'set'];
          return (
            <g
              key={`${column}-${row}`}
              className={`cell cell-${state}`}
              role="button"
              aria-label={`Column ${column + 1}, note ${names[row]}${isPin ? ', pinned' : ''}${isLocked && isPin ? ', correct' : ''}${out ? ', wrong' : ''}`}
              aria-disabled={blocked}
              onPointerDown={() => {
                if (blocked) return;
                pluck(row);
                onPin(column, row);
              }}
            >
              <rect
                x={x(column) - colW / 2}
                y={y(row) - ROW_H / 2}
                width={colW}
                height={ROW_H}
                fill="transparent"
              />
              {state === 'free' && (
                <circle className="hole" cx={x(column)} cy={y(row)} r={3} />
              )}
              {state === 'out' && (
                <g className="ruled-out">
                  <circle cx={x(column)} cy={y(row)} r={radius * 0.55} />
                  <line
                    x1={x(column) - 4}
                    y1={y(row) + 4}
                    x2={x(column) + 4}
                    y2={y(row) - 4}
                  />
                </g>
              )}
              {isPin && sounding === row && playhead === column && (
                <m.circle
                  key={`ping-${playhead}`}
                  className="pin-ping"
                  cx={x(column)}
                  cy={y(row)}
                  r={radius}
                  initial={{ scale: 1, opacity: 0.75 }}
                  animate={{ scale: 2.3, opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              )}
              {isPin && (
                <m.g
                  className="pin"
                  key={state}
                  initial={move.initial}
                  animate={move.animate}
                  transition={{
                    ...move.transition,
                    delay: state === 'set' ? 0 : column * 0.07,
                  }}
                >
                  <circle
                    className="pin-shadow"
                    cx={x(column)}
                    cy={y(row) + 2}
                    r={radius}
                  />
                  <circle
                    className="pin-body"
                    cx={x(column)}
                    cy={y(row)}
                    r={radius}
                  />
                  <circle
                    className="pin-shine"
                    cx={x(column) - radius * 0.3}
                    cy={y(row) - radius * 0.35}
                    r={radius * 0.28}
                  />
                  {state === 'right' && (
                    <path
                      className="pin-mark"
                      d={`M${x(column) - 5} ${y(row)} l3.5 4 l6.5 -8`}
                    />
                  )}
                  {state === 'wrong' && (
                    <path
                      className="pin-mark"
                      d={`M${x(column) - 4.5} ${y(row) - 4.5} l9 9 m0 -9 l-9 9`}
                    />
                  )}
                </m.g>
              )}
            </g>
          );
        })
      )}
    </svg>
  );
};
