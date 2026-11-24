import { useState } from 'react';
import { PUBLISH_ERRORS, type PublishError } from '../../shared/api';
import {
  MAX_NOTES,
  MIN_NOTES,
  SCALES,
  SCALE_IDS,
  tuneError,
  tuneName,
  type ScaleId,
} from '../../shared/game';
import { playNote } from '../audio';
import { Board } from './Board';
import { usePlayback } from './usePlayback';
import { PlayIcon, StopIcon } from './icons';

export type ComposerProps = {
  busy: boolean;
  error: PublishError | null;
  onPublish: (scale: ScaleId, notes: number[]) => void;
};

const noRows: number[] = [];

export const Composer = ({ busy, error, onPublish }: ComposerProps) => {
  const [scale, setScale] = useState<ScaleId>('sunny');
  const [pins, setPins] = useState<(number | null)[]>(() =>
    Array.from({ length: 8 }, () => null)
  );
  const playback = usePlayback();

  const notes = pins.filter((pin): pin is number => pin !== null);
  const full = notes.length === pins.length;
  const problem = full ? tuneError(scale, notes) : 'notes';
  const message = error
    ? PUBLISH_ERRORS[error]
    : full && problem
      ? PUBLISH_ERRORS[problem]
      : null;

  const resize = (length: number) => {
    playback.stop();
    setPins((current) => Array.from({ length }, (_, i) => current[i] ?? null));
  };

  return (
    <div className="composer">
      <div className="page-heading">
        <p className="eyebrow">FROM YOUR WORKBENCH</p>
        <h2>Leave a little melody.</h2>
      </div>
      <p className="hint">
        Pin a tune for other redditors to fix. One pin per column; they will
        only hear it.
      </p>
      <div className="moods" role="radiogroup" aria-label="Mood">
        {SCALE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={scale === id}
            className={`chip${scale === id ? ' is-on' : ''}`}
            onClick={() => {
              setScale(id);
              playback.start('mood', id, [0, 1, 2, 3, 4], { step: 0.11 });
            }}
          >
            {SCALES[id].label}
          </button>
        ))}
      </div>
      <Board
        scale={scale}
        pins={pins}
        locked={pins.map(() => false)}
        ruledOut={pins.map(() => noRows)}
        playhead={playback.playhead}
        showWrong={false}
        disabled={busy}
        onTine={(row) => playNote(scale, row)}
        onPin={(column, row) => {
          playback.stop();
          playNote(scale, row);
          setPins((current) =>
            current.map((pin, i) => (i === column ? row : pin))
          );
        }}
      />
      <div className="transport">
        <div className="stepper" aria-label="Number of pins">
          <button
            type="button"
            className="btn btn-quiet btn-square"
            aria-label="Fewer pins"
            disabled={pins.length <= MIN_NOTES}
            onClick={() => resize(pins.length - 1)}
          >
            −
          </button>
          <span className="stepper-value">{pins.length} pins</span>
          <button
            type="button"
            className="btn btn-quiet btn-square"
            aria-label="More pins"
            disabled={pins.length >= MAX_NOTES}
            onClick={() => resize(pins.length + 1)}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className={`btn btn-quiet${playback.kind === 'mine' ? ' is-playing' : ''}`}
          disabled={notes.length === 0}
          onClick={() => {
            if (playback.kind === 'mine') playback.stop();
            else playback.start('mine', scale, pins);
          }}
        >
          {playback.kind === 'mine' ? <StopIcon /> : <PlayIcon />}
          Play
        </button>
      </div>
      <p className="tune-preview" aria-live="polite">
        {message ? (
          <span className="is-error">{message}</span>
        ) : full ? (
          <>
            This one is called <em>{tuneName({ scale, notes })}</em>.
          </>
        ) : (
          `${pins.length - notes.length} more ${pins.length - notes.length === 1 ? 'pin' : 'pins'} to go.`
        )}
      </p>
      <button
        type="button"
        className="btn btn-primary btn-wide"
        disabled={busy || !full || problem !== null}
        onClick={() => onPublish(scale, notes)}
      >
        {busy ? 'Pinning…' : 'Put it on the shelf'}
      </button>
      <p className="fineprint">
        One tune a day. Tunes are named by the box, so there is nothing to type.
      </p>
    </div>
  );
};
