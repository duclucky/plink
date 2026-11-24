import { useEffect, useRef } from 'react';
import { calm } from './fx';
import type { Sparks } from './sparkEngine';

export type Spark = {
  /** Changes for every new burst. */
  id: number;
  /** Where the burst starts, as fractions of the layer's width and height. */
  x: number;
  y: number;
};

/** Brass sparks over the board. The particle engine loads on the first one. */
export const Sparkles = ({ spark }: { spark: Spark | null }) => {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const sparks = useRef<Sparks | null>(null);

  useEffect(
    () => () => {
      sparks.current?.destroy();
      sparks.current = null;
    },
    []
  );

  useEffect(() => {
    const el = canvas.current;
    if (!spark || !el || calm()) return;
    let live = true;
    const fire = (engine: Sparks) =>
      engine.burst(spark.x * el.width, spark.y * el.height);

    if (sparks.current) {
      fire(sparks.current);
      return;
    }
    void import('./sparkEngine').then(({ createSparks }) => {
      if (!live) return;
      if (!sparks.current) {
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        el.width = el.clientWidth * ratio;
        el.height = el.clientHeight * ratio;
        sparks.current = createSparks(el);
      }
      if (sparks.current) fire(sparks.current);
    });
    return () => {
      live = false;
    };
  }, [spark]);

  return <canvas ref={canvas} className="sparkles" aria-hidden="true" />;
};
