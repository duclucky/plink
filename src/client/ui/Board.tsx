import { ROWS, SCALES, type ScaleId } from '../../shared/game';
import { Mechanism } from './Mechanism';

const WIDTH = 360;
const GUTTER = 34;
const ROW_H = 44;
const TOP = 24;
const HEIGHT = TOP + ROW_H * ROWS + 8;

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

  return (
    <div className={`music-case${playhead !== null ? ' is-running' : ''}`}>
      <div className="case-screws" aria-hidden="true">
        <i />
        <span>PRECISION MELODY WORKS</span>
        <i />
      </div>
      <div className="movement-window">
        <Mechanism running={playhead !== null} />
      </div>
      <div
        className="paper-scroll"
        tabIndex={columns > 7 ? 0 : undefined}
        role={columns > 7 ? 'region' : undefined}
        aria-label={columns > 7 ? 'Scrollable melody roll' : undefined}
      >
        <svg
          className="board"
          style={{
            minWidth: columns > 7 ? `${GUTTER + columns * 44}px` : undefined,
          }}
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
          {pins.map((_, column) => (
            <text
              key={column}
              className="column-number"
              x={x(column)}
              y={15}
              textAnchor="middle"
            >
              {String(column + 1).padStart(2, '0')}
            </text>
          ))}
          {pins.every((pin) => pin === null) && (
            <rect
              className="board-cue"
              x={x(0) - colW / 2 + 3}
              y={22}
              width={colW - 6}
              height={HEIGHT - 35}
              rx={18}
            />
          )}
          {playhead !== null && (
            <rect
              className="board-playhead"
              x={x(playhead) - colW / 2 + 1}
              y={5}
              width={colW - 2}
              height={HEIGHT - 10}
              rx={8}
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
              <line
                className="board-lane"
                x1={GUTTER + 2}
                x2={WIDTH - 8}
                y1={y(row)}
                y2={y(row)}
              />
              <rect
                className="board-tine"
                x={2}
                y={y(row) - 12}
                width={24}
                height={24}
                rx={3}
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
              return (
                <g
                  key={`${column}-${row}`}
                  className={`cell cell-${state}`}
                  role="button"
                  tabIndex={blocked ? -1 : 0}
                  aria-label={`Column ${column + 1}, note ${names[row]}${isPin ? ', pinned' : ''}${isLocked && isPin ? ', correct' : ''}${out ? ', wrong' : ''}`}
                  aria-disabled={blocked}
                  onPointerDown={() => {
                    if (!blocked) onPin(column, row);
                  }}
                  onKeyDown={(event) => {
                    if (
                      !blocked &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      onPin(column, row);
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
                  {state === 'free' && (
                    <g>
                      <circle
                        className="hole-rim"
                        cx={x(column)}
                        cy={y(row)}
                        r={5}
                      />
                      <circle
                        className="hole"
                        cx={x(column)}
                        cy={y(row)}
                        r={2.7}
                      />
                    </g>
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
                  {isPin && (
                    <g
                      className="pin"
                      key={state}
                      style={{
                        transformOrigin: `${x(column)}px ${y(row)}px`,
                        animationDelay:
                          state === 'set' ? '0ms' : `${column * 70}ms`,
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
                    </g>
                  )}
                </g>
              );
            })
          )}
        </svg>
      </div>
      <div className="case-footer">
        <span>
          {columns > 7
            ? 'SLIDE THE ROLL TO REACH EVERY NOTE →'
            : 'TAP A HOLE · PLACE A PIN'}
        </span>
        <span aria-hidden="true">✦</span>
      </div>
    </div>
  );
};
