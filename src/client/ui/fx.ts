import Ola from 'ola';
import { useEffect, useRef, useState } from 'react';

/** True when the player asked their device for less motion. */
export const calm = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts from zero up to `target`, and glides to each later value. */
export const useEased = (target: number, ms = 700) => {
  const [value, setValue] = useState(0);
  const glide = useRef<{ value: number } | null>(null);

  useEffect(() => {
    if (calm()) return;
    const gliding = (glide.current ??= Ola(0, ms));
    gliding.value = target;
    let frame = 0;
    const started = performance.now();
    const tick = () => {
      setValue(gliding.value);
      if (performance.now() - started < ms + 50) {
        frame = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  return calm() ? target : value;
};
