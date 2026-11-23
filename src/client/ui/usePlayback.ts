import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScaleId } from '../../shared/game';
import { STEP, playNote } from '../audio';

export type Playback = {
  /** Column sounding right now. */
  playhead: number | null;
  /** Which tune is playing, e.g. 'target' or 'mine'. */
  kind: string | null;
  start: (
    kind: string,
    scale: ScaleId,
    notes: readonly (number | null)[],
    options?: { step?: number; onEnd?: () => void }
  ) => void;
  stop: () => void;
};

/** Plays a tune one column at a time and reports where the comb is. */
export const usePlayback = (): Playback => {
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const stop = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setPlayhead(null);
    setKind(null);
  }, []);

  const start = useCallback<Playback['start']>(
    (nextKind, scale, notes, options) => {
      stop();
      const step = (options?.step ?? STEP) * 1000;
      setKind(nextKind);
      notes.forEach((row, i) => {
        timers.current.push(
          window.setTimeout(() => {
            setPlayhead(i);
            if (row !== null) playNote(scale, row);
          }, i * step)
        );
      });
      timers.current.push(
        window.setTimeout(
          () => {
            setPlayhead(null);
            setKind(null);
            options?.onEnd?.();
          },
          notes.length * step + 200
        )
      );
    },
    [stop]
  );

  useEffect(() => stop, [stop]);

  return { playhead, kind, start, stop };
};
