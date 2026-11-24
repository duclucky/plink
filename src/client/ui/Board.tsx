import { motion, useReducedMotion } from 'motion/react';
import { ROWS, SCALES, type ScaleId } from '../../shared/game';

const WIDTH = 360;
const GUTTER = 32;
const ROW_H = 40;
const TOP = 29;
const HEIGHT = TOP + ROW_H * ROWS + 8;
const COLORS = ['#ff7853', '#d4f76c', '#7ed8d0', '#ae9de8', '#f2cf6f'];

export type BoardProps = {
  scale: ScaleId;
  pins: readonly (number | null)[];
  locked: readonly boolean[];
  ruledOut: readonly (readonly number[])[];
  playhead: number | null;
  showWrong: boolean;
  disabled: boolean;
  onPin: (column: number, row: number) => void;
  onTine: (row: number) => void;
};

export const Board = ({
  scale,
  pins,
  locked,
  ruledOut,
  playhead,
  showWrong,
  disabled,
  onPin,
  onTine,
}: BoardProps) => {
  const still = useReducedMotion();
  const columns = pins.length;
  const colW = (WIDTH - GUTTER - 4) / columns;
  const x = (column: number) => GUTTER + colW * (column + 0.5);
  const y = (row: number) => TOP + ROW_H * (ROWS - 1 - row + 0.5);
  const names = SCALES[scale].names;
  const padW = Math.min(32, colW - 7);
  return (
    <div className="sequencer">
      <div className="sequencer-label">
        <span>
          <i /> THE SEQUENCER
        </span>
        <span>{columns} NOTES / 5 TONES</span>
      </div>
      <div className={`sequencer-scroll${columns > 8 ? ' is-long' : ''}`}>
        <svg
          className="board"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="group"
          aria-label={`Pin board, ${columns} columns by ${ROWS} notes`}
        >
          {pins.map((_, column) => (
            <text
              className="column-number"
              key={column}
              x={x(column)}
              y="17"
              textAnchor="middle"
            >
              {String(column + 1).padStart(2, '0')}
            </text>
          ))}
          {playhead !== null && (
            <motion.rect
              className="board-playhead"
              initial={false}
              animate={{ x: x(playhead) - colW / 2 }}
              transition={{ duration: still ? 0 : 0.12 }}
              y={25}
              width={colW}
              height={HEIGHT - 29}
              rx="8"
            />
          )}
          {Array.from({ length: ROWS }, (_, row) => (
            <g
              key={row}
              className="tine"
              role="button"
              tabIndex={0}
              aria-label={`Hear note ${names[row]}`}
              onPointerDown={() => onTine(row)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onTine(row);
                }
              }}
            >
              <rect
                x="0"
                y={y(row) - 18}
                width="30"
                height="36"
                fill="transparent"
              />
              <text
                className="board-tine-name"
                x="12"
                y={y(row) + 5}
                textAnchor="middle"
                fill={COLORS[row]}
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
              const choose = () => {
                if (!blocked) onPin(column, row);
              };
              return (
                <g
                  key={`${column}-${row}`}
                  className={`cell cell-${state}${column === 0 && pins.every((p) => p === null) ? ' is-cue' : ''}`}
                  role="button"
                  tabIndex={blocked ? -1 : 0}
                  aria-label={`Column ${column + 1}, note ${names[row]}${isPin ? ', pinned' : ''}${isLocked && isPin ? ', correct' : ''}${out ? ', wrong' : ''}`}
                  aria-disabled={blocked}
                  onPointerDown={choose}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      choose();
                    }
                  }}
                >
                  <rect
                    x={x(column) - colW / 2}
                    y={y(row) - ROW_H / 2}
                    width={colW}
                    height={ROW_H}
                    fill="transparent"
                  />
                  <rect
                    className="pad"
                    x={x(column) - padW / 2}
                    y={y(row) - 16}
                    width={padW}
                    height="32"
                    rx="7"
                  />
                  {state === 'free' && (
                    <circle
                      className="hole"
                      cx={x(column)}
                      cy={y(row)}
                      r="2.5"
                    />
                  )}
                  {state === 'out' && (
                    <path
                      className="out-mark"
                      d={`M${x(column) - 3} ${y(row) - 3}l6 6m0-6l-6 6`}
                    />
                  )}
                  {isPin && (
                    <motion.g
                      className="pin"
                      key={state}
                      initial={still ? false : { scale: 0.4, opacity: 0.3 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 550,
                        damping: 18,
                        delay: state === 'right' ? column * 0.045 : 0,
                      }}
                      style={{ transformOrigin: `${x(column)}px ${y(row)}px` }}
                    >
                      <rect
                        className="pin-body"
                        x={x(column) - padW / 2}
                        y={y(row) - 16}
                        width={padW}
                        height="32"
                        rx="7"
                        style={
                          state === 'set' ? { fill: COLORS[row] } : undefined
                        }
                      />
                      {state === 'right' ? (
                        <path
                          className="pin-mark"
                          d={`M${x(column) - 5} ${y(row)}l3.5 4l6.5-8`}
                        />
                      ) : state === 'wrong' ? (
                        <path
                          className="pin-mark"
                          d={`M${x(column) - 4} ${y(row) - 4}l8 8m0-8l-8 8`}
                        />
                      ) : (
                        <circle
                          cx={x(column)}
                          cy={y(row)}
                          r="3"
                          fill="#252621"
                        />
                      )}
                    </motion.g>
                  )}
                </g>
              );
            })
          )}
        </svg>
      </div>
      <div className="sequencer-legend">
        <span>↑ HIGHER</span>
        <span>
          {columns > 8 ? 'SWIPE TO SEE ALL NOTES →' : 'TAP A PAD · MAKE A NOTE'}
        </span>
        <span>LOWER ↓</span>
      </div>
    </div>
  );
};
