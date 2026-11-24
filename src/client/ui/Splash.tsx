import { useEffect, useState, type MouseEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { InitResponse } from '../../shared/api';
import type { Backend } from '../backend';
import { PopArt } from './PopArt';
import { MuteButton } from './MuteButton';

export type SplashProps = {
  backend: Backend;
  onOpen: (event: MouseEvent<HTMLButtonElement>) => void;
};

export const Splash = ({ backend, onOpen }: SplashProps) => {
  const [init, setInit] = useState<InitResponse | null>(null);
  const still = useReducedMotion();
  useEffect(() => {
    let live = true;
    backend
      .init()
      .then((data) => {
        if (live) setInit(data);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [backend]);
  const play = init?.play;
  const fixed = init?.histogram.reduce((sum, n) => sum + n, 0) ?? 0;
  return (
    <main className="splash">
      <header className="splash-top">
        <span className="eyebrow">A DAILY MUSIC PUZZLE</span>
        <MuteButton />
      </header>
      <div className="splash-brand">
        <h1>
          plink<span>.</span>
        </h1>
        <span className="edition">
          VOL.
          <br />
          {String(init?.daily.day ?? 1).padStart(3, '0')}
        </span>
      </div>
      <div className="splash-tag">SMALL TUNE. BIG EARWORM.</div>
      <PopArt />
      <motion.div
        className="splash-copy"
        initial={still ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2>
          A little listening.
          <br />A little lightbulb moment.
        </h2>
        <p>
          {play?.done
            ? 'Daily tune: nailed it. More good sounds await.'
            : 'Hear the melody. Find the missing notes. Make something click.'}
        </p>
      </motion.div>
      <motion.button
        whileTap={still ? {} : { scale: 0.97 }}
        type="button"
        className="btn btn-primary btn-wide btn-big"
        onClick={onOpen}
      >
        {play?.done
          ? 'Back to the good stuff'
          : play
            ? 'Keep the rhythm going'
            : 'Let’s play'}
        <span className="arrow">↗</span>
      </motion.button>
      <div className="splash-bottom">
        <span className="people-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          {fixed > 0
            ? `${fixed.toLocaleString('en-US')} redditors found their rhythm`
            : 'One tune. A whole community.'}
        </span>
      </div>
      <footer className="splash-footer">
        <span>FRESH DAILY · 12:00 UTC</span>
        <span>MADE FOR REDDIT</span>
      </footer>
    </main>
  );
};
