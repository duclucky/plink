import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_CHECKS,
  ROWS,
  evaluate,
  type Play,
  type ScaleId,
} from '../../shared/game';
import { isSoundless, playNote, playThunk, setMuted } from '../audio';
import { Board } from './Board';
import { loadBoard, saveBoard } from './drafts';
import { useMuted } from './useMuted';
import { usePlayback } from './usePlayback';
import { PlayIcon, StopIcon } from './icons';

export type PuzzleProps = {
  /** Names this box on the device, so unchecked pins survive a reload. */
  id: string;
  scale: ScaleId;
  notes: readonly number[];
  /** Checks already made on an earlier visit. */
  initial: Play | null;
  /** Called after every check with all guesses so far and the listens used. */
  onCheck: (guesses: number[][], listens: number) => void;
  /** Called once the tune has played back at the end. */
  onDone: (play: Play) => void;
};

const startingPins = (
  notes: readonly number[],
  guesses: readonly number[][]
): (number | null)[] => {
  const last = guesses[guesses.length - 1];
  return notes.map((note, i) => {
    if (guesses.some((g) => g[i] === note)) return note;
    return last?.[i] ?? null;
  });
};

export const Puzzle = ({
  id,
  scale,
  notes,
  initial,
  onCheck,
  onDone,
}: PuzzleProps) => {
  const [guesses, setGuesses] = useState<number[][]>(initial?.guesses ?? []);
  const [saved] = useState(() => {
    const draft = loadBoard(id, notes.length);
    return draft && draft.checks === (initial?.guesses.length ?? 0)
      ? draft
      : null;
  });
  const [pins, setPins] = useState(() => {
    const fromChecks = startingPins(notes, initial?.guesses ?? []);
    // Pins moved since the last check come back; proven pins stay put.
    return fromChecks.map((pin, i) =>
      pin !== null && pin === notes[i] ? pin : (saved?.pins[i] ?? pin)
    );
  });
  const [listens, setListens] = useState(saved?.listens ?? 0);
  const [heard, setHeard] = useState(
    (initial?.guesses.length ?? 0) > 0 || (saved?.listens ?? 0) > 0
  );
  const [ending, setEnding] = useState<Play | null>(null);
  const muted = useMuted();
  const playback = usePlayback();
  const doneTimer = useRef<number | null>(null);
  const finishing = ending !== null;

  useEffect(
    () => () => {
      if (doneTimer.current !== null) window.clearTimeout(doneTimer.current);
    },
    []
  );

  useEffect(() => {
    if (finishing) saveBoard(id, null);
    else saveBoard(id, { checks: guesses.length, pins, listens });
  }, [id, guesses.length, pins, listens, finishing]);

  const locked = useMemo(
    () => notes.map((note, i) => guesses.some((g) => g[i] === note)),
    [notes, guesses]
  );
  const ruledOut = useMemo(
    () =>
      notes.map((note, i) => [
        ...new Set(
          guesses
            .map((g) => g[i])
            .filter((row): row is number => row !== undefined && row !== note)
        ),
      ]),
    [notes, guesses]
  );

  const empty = pins.filter((pin) => pin === null).length;
  const stale = pins.filter(
    (pin, i) => pin !== null && ruledOut[i]?.includes(pin)
  ).length;
  const ready = empty === 0 && stale === 0;
  const checksLeft = MAX_CHECKS - guesses.length;
  const rightCount = locked.filter(Boolean).length;
  const silent = muted || isSoundless();

  const hint = ending
    ? ending.solved
      ? 'That is the tune. Listen.'
      : 'Out of checks. This is how it went.'
    : !heard
      ? 'Press Listen to hear the tune this box has lost.'
      : guesses.length === 0
        ? ready
          ? 'Check your pins. Right ones lock, wrong ones get crossed off.'
          : empty === pins.length
            ? 'Tap a hole to drop a pin: one in each column, higher rows sound higher. Tap a letter to hear its note.'
            : `${empty} more ${empty === 1 ? 'pin' : 'pins'} to go. Play mine to compare it with the tune.`
        : stale > 0
          ? `${rightCount} of ${notes.length} right. Move the ${stale === 1 ? 'red pin' : `${stale} red pins`} and check again.`
          : checksLeft === 1
            ? 'Last check. Listen once more if you are not sure.'
            : 'Ready when you are.';

  const place = (column: number, row: number) => {
    // The pin lands first: a device with no sound must still be playable.
    setPins((current) => current.map((pin, i) => (i === column ? row : pin)));
    // The player's own playback restarts from the change; the tune they are
    // listening to keeps playing so they can pin along with it.
    if (playback.kind === 'mine') playback.stop();
    playNote(scale, row);
  };

  const listen = () => {
    if (playback.kind === 'target') {
      playback.stop();
      return;
    }
    setHeard(true);
    setListens((n) => n + 1);
    playback.start('target', scale, notes);
  };

  const check = () => {
    const guess = pins.filter((pin): pin is number => pin !== null);
    if (!ready || finishing || guess.length !== notes.length) return;
    playback.stop();
    const next = [...guesses, guess];
    const play = evaluate(notes, next);
    guess.forEach((row, i) => {
      if (row === notes[i] && !locked[i]) playNote(scale, row, i * 0.07);
      else if (row !== notes[i]) playThunk(i * 0.07);
    });
    setGuesses(next);
    onCheck(next, listens);
    if (!play.done) return;
    setEnding(play);
    doneTimer.current = window.setTimeout(
      () => {
        // A lost box shows and plays the answer, so the player learns it.
        if (!play.solved) setPins([...notes]);
        playback.start('target', scale, notes, {
          step: play.solved ? 0.24 : 0.34,
          onEnd: () => onDone(play),
        });
      },
      notes.length * 70 + 650
    );
  };

  return (
    <div className="puzzle">
      <p className="hint" aria-live="polite">
        {hint}
      </p>
      {silent && !finishing && (
        <p className="notice notice-sound" role="status">
          {muted ? (
            <>
              Sound is off, and this is a game for the ears.
              <button
                type="button"
                className="btn btn-quiet btn-small"
                onClick={() => {
                  setMuted(false);
                  playNote(scale, ROWS - 1);
                }}
              >
                Turn sound on
              </button>
            </>
          ) : (
            'This device will not play sound here. You can still play by the crosses, but four checks are tight without the tune.'
          )}
        </p>
      )}
      <Board
        scale={scale}
        pins={pins}
        locked={ending && !ending.solved ? notes.map(() => true) : locked}
        ruledOut={ruledOut}
        playhead={playback.playhead}
        showWrong={!ending}
        disabled={finishing}
        onPin={place}
        onTine={(row) => playNote(scale, row)}
      />
      {!finishing && (
        <>
          <div className="transport">
            <button
              type="button"
              className={`btn btn-listen${playback.kind === 'target' ? ' is-playing' : ''}`}
              onClick={listen}
            >
              {playback.kind === 'target' ? <StopIcon /> : <PlayIcon />}
              Listen
            </button>
            <button
              type="button"
              className={`btn btn-quiet${playback.kind === 'mine' ? ' is-playing' : ''}`}
              disabled={empty === pins.length}
              onClick={() => {
                if (playback.kind === 'mine') playback.stop();
                else playback.start('mine', scale, pins);
              }}
            >
              {playback.kind === 'mine' ? <StopIcon /> : <PlayIcon />}
              Play mine
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-wide"
            disabled={!ready}
            onClick={check}
          >
            Check my pins
          </button>
          <div
            className="checks"
            aria-label={`${checksLeft} of ${MAX_CHECKS} checks left`}
          >
            {Array.from({ length: MAX_CHECKS }, (_, i) => (
              <span
                key={i}
                className={`tooth${i < guesses.length ? ' is-used' : ''}`}
              />
            ))}
            <span className="checks-label">
              {checksLeft === 1 ? 'last check' : `${checksLeft} checks left`}
              {listens > 0
                ? ` · ${listens} ${listens === 1 ? 'listen' : 'listens'}`
                : ''}
            </span>
          </div>
          <p className="fineprint">
            Four checks to fix the box. Listening is free, but every listen
            shows on your result.
          </p>
        </>
      )}
    </div>
  );
};
