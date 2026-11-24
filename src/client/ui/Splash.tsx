import { useEffect, useState, type MouseEvent } from 'react';
import type { InitResponse } from '../../shared/api';
import { weekdayOf } from '../../shared/day';
import type { Backend } from '../backend';
import { MakerMark, Mechanism } from './Mechanism';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
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
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [backend]);
  const day = init?.daily.day;
  const fixed = init?.histogram.reduce((sum, n) => sum + n, 0) ?? 0;
  return (
    <main className="splash">
      <header className="splash-masthead">
        <span className="wordmark">
          <MakerMark /> plink
        </span>
        <span className="edition">
          THE DAILY MUSIC BOX
          <br />
          {day ? `VOL. ${String(day).padStart(3, '0')}` : 'MADE FOR REDDIT'}
        </span>
      </header>
      <div className="splash-heading">
        <p className="eyebrow">
          <span className="live-dot" />{' '}
          {day
            ? `${DAYS[weekdayOf(day)]}’s little ritual`
            : 'A little daily ritual'}
        </p>
        <h1>
          A little tune.
          <br />
          <em>A little tinkering.</em>
        </h1>
      </div>
      <div className="hero-object">
        <Mechanism hero />
        <span className="object-caption">
          WALNUT · BRASS · A FEW MISSING NOTES
        </span>
      </div>
      <p className="splash-pitch">
        {init?.play?.done ? (
          'Your box is singing again. There are more little melodies on the shelf.'
        ) : (
          <>
            Someone has unpinned the melody.
            <br />
            Listen closely. Put it back together.
          </>
        )}
      </p>
      <button
        type="button"
        className="btn btn-primary btn-big"
        onClick={onOpen}
      >
        <span>
          {init?.play?.done
            ? 'Reopen the box'
            : init?.play
              ? 'Keep tinkering'
              : 'Open the box'}
        </span>
        <span aria-hidden="true">↗</span>
      </button>
      <div className="splash-footer">
        <p>
          <span className="small-star">✳</span> A fresh melody, every day.
        </p>
        <p>
          {fixed > 0
            ? `${fixed} boxes brought back to life`
            : 'A quiet moment, made for you'}{' '}
          <span className="footer-dot">·</span> by Plink
        </p>
      </div>
    </main>
  );
};
