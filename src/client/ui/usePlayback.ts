import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScaleId } from '../../shared/game';
import { STEP, playTune, type TuneRun } from '../audio';

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
  const run = useRef<TuneRun | null>(null);

  const stop = useCallback(() => {
    run.current?.stop();
    run.current = null;
    setPlayhead(null);
    setKind(null);
  }, []);

  const start = useCallback<Playback['start']>(
    (nextKind, scale, notes, options) => {
      stop();
      setKind(nextKind);
      run.current = playTune(
        scale,
        notes,
        options?.step ?? STEP,
        setPlayhead,
        () => {
          run.current = null;
          setPlayhead(null);
          setKind(null);
          options?.onEnd?.();
        }
      );
    },
    [stop]
  );

  useEffect(
    () => () => {
      run.current?.stop();
    },
    []
  );

  return { playhead, kind, start, stop };
};
