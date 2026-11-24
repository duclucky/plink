import Proton, {
  Alpha,
  CanvasRenderer,
  Color,
  Emitter,
  Gravity,
  Life,
  Mass,
  Radius,
  Rate,
  Scale,
  Span,
  Velocity,
} from 'proton-engine';

type Engine = typeof Proton;

const isEngine = (value: unknown): value is Engine =>
  typeof value === 'function';

/**
 * The package ships one CommonJS file, and bundlers disagree on whether its
 * default import is the class or the whole module.
 */
const findEngine = (): Engine | null => {
  if (isEngine(Proton)) return Proton;
  const inner: unknown = Reflect.get(Proton, 'default');
  return isEngine(inner) ? inner : null;
};

const COLORS = ['#fff3cf', '#f5cf7a', '#e0a53a', '#9fe0a0'];
const BURST_MS = 1400;

export type Sparks = {
  /** Fires one burst at a point given in canvas pixels. */
  burst: (x: number, y: number) => void;
  destroy: () => void;
};

/** Brass sparks drawn on a canvas, one burst at a time. */
export const createSparks = (canvas: HTMLCanvasElement): Sparks | null => {
  const Engine = findEngine();
  if (!Engine) return null;
  const proton = new Engine();
  proton.addRenderer(new CanvasRenderer(canvas));
  let frame = 0;
  let quietAt = 0;

  const tick = () => {
    proton.update();
    if (performance.now() < quietAt) {
      frame = requestAnimationFrame(tick);
    } else {
      frame = 0;
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return {
    burst: (x, y) => {
      const emitter = new Emitter();
      emitter.rate = new Rate(new Span(9, 13), 0.1);
      emitter.addInitialize(new Mass(1));
      emitter.addInitialize(new Radius(1.5, 4.5));
      emitter.addInitialize(new Life(0.5, 1.1));
      emitter.addInitialize(
        new Velocity(new Span(1.2, 3.4), new Span(0, 360), 'polar')
      );
      emitter.addBehaviour(new Color(COLORS));
      emitter.addBehaviour(new Alpha(1, 0));
      emitter.addBehaviour(new Scale(1, 0.25));
      emitter.addBehaviour(new Gravity(2.2));
      emitter.p.x = x;
      emitter.p.y = y;
      emitter.emit('once', true);
      proton.addEmitter(emitter);
      quietAt = performance.now() + BURST_MS;
      if (frame === 0) frame = requestAnimationFrame(tick);
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      proton.destroy();
    },
  };
};
