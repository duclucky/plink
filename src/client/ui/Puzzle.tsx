import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MAX_CHECKS,
  evaluate,
  type Play,
  type ScaleId,
} from '../../shared/game';
import { playNote, playThunk } from '../audio';
import { Board } from './Board';
import { usePlayback } from './usePlayback';
import { PlayIcon, StopIcon } from './icons';

export type PuzzleProps = {
  scale: ScaleId;
  notes: readonly number[];
  /** Checks already made on an earlier visit. */
  initial: Play | null;
  /** Called after every check with all guesses so far. */
  onCheck: (guesses: number[][]) => void;
  /** Called once the solved tune has played back. */
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
  scale,
  notes,
  initial,
  onCheck,
  onDone,
}: PuzzleProps) => {
  const [guesses, setGuesses] = useState<number[][]>(initial?.guesses ?? []);
  const [pins, setPins] = useState(() =>
    startingPins(notes, initial?.guesses ?? [])
  );
  const [heard, setHeard] = useState((initial?.guesses.length ?? 0) > 0);
  const [finishing, setFinishing] = useState(false);
  const playback = usePlayback();
  const doneTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (doneTimer.current !== null) window.clearTimeout(doneTimer.current);
    },
    []
  );

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

  const hint = finishing
    ? 'That’s your tune. Take a little victory lap.'
    : !heard
      ? 'Start with Listen. Then tap a pad in each column to rebuild the melody.'
      : guesses.length === 0
        ? ready
          ? 'All notes in. Check your mix. The right notes stay locked.'
          : 'One note per column. Tap a letter to hear its pitch. Go higher for higher notes.'
        : stale > 0
          ? `${rightCount} of ${notes.length} in tune. Move the coral notes and give it another spin.`
          : 'Ready when you are.';

  const place = (column: number, row: number) => {
    playback.stop();
    playNote(scale, row);
    setPins((current) => current.map((pin, i) => (i === column ? row : pin)));
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
    onCheck(next);
    if (!play.done) return;
    setFinishing(true);
    doneTimer.current = window.setTimeout(
      () => {
        playback.start('target', scale, notes, {
          step: 0.24,
          onEnd: () => onDone(play),
        });
      },
      notes.length * 70 + 650
    );
  };

  return (
    <div className={`puzzle${finishing ? ' is-solved' : ''}`}>
      <div className="page-intro">
        <h2>
          {finishing ? 'Now that’s a good sound.' : 'Find the missing notes.'}
        </h2>
        <span className="mini-sticker" aria-hidden="true">
          {finishing ? '✳' : '♫'}
        </span>
      </div>
      <p className="hint" aria-live="polite">
        {hint}
      </p>
      <Board
        scale={scale}
        pins={pins}
        locked={locked}
        ruledOut={ruledOut}
        playhead={playback.playhead}
        showWrong
        disabled={finishing}
        onPin={place}
        onTine={(row) => playNote(scale, row)}
      />
      <div className="transport">
        <button
          type="button"
          className={`btn btn-listen${playback.kind === 'target' ? ' is-playing' : ''}`}
          disabled={finishing}
          onClick={() => {
            if (playback.kind === 'target') {
              playback.stop();
              return;
            }
            setHeard(true);
            playback.start('target', scale, notes);
          }}
        >
          {playback.kind === 'target' ? <StopIcon /> : <PlayIcon />}
          Listen
        </button>
        <button
          type="button"
          className={`btn btn-quiet${playback.kind === 'mine' ? ' is-playing' : ''}`}
          disabled={finishing || empty === pins.length}
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
        disabled={!ready || finishing}
        onClick={check}
      >
        {finishing ? 'You found your groove!' : 'Check my notes'}
      </button>
      {!finishing && (
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
          </span>
        </div>
      )}
      <p className="fineprint">
        Good notes lock in. Crossed pads are out. Make it click.
      </p>
    </div>
  );
};
