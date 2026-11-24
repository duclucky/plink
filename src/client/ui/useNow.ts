import { useEffect, useState } from 'react';

/** The time, refreshed every second, for countdowns that really count down. */
export const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
};

const two = (n: number) => String(n).padStart(2, '0');

/** 4:07:32 style, down to the second. */
export const clockText = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}:${two(minutes)}:${two(total % 60)}`;
};
