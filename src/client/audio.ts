import { SCALES, type ScaleId } from '../shared/game';

/** Seconds between two pins when a tune plays. */
export const STEP = 0.34;

const MUTE_KEY = 'plink:muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

try {
  muted = window.localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Call from a tap: browsers only start audio after a gesture. */
const engine = () => {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return master ? { ctx, master } : null;
};

export const isMuted = () => muted;

export const setMuted = (next: boolean) => {
  muted = next;
  if (ctx && master) {
    master.gain.setTargetAtTime(next ? 0 : 0.9, ctx.currentTime, 0.01);
  }
  try {
    window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    // Storage can be unavailable inside the webview; mute still works.
  }
};

/** One music-box tine: a pure tone, a faint octave and a short bright tick. */
const tine = (midi: number, when: number) => {
  const e = engine();
  if (!e) return;
  const base = frequency(midi);
  const partials = [
    { ratio: 1, level: 0.42, decay: 1.5 },
    { ratio: 2.005, level: 0.16, decay: 0.7 },
    { ratio: 5.4, level: 0.07, decay: 0.12 },
  ];
  for (const partial of partials) {
    const osc = e.ctx.createOscillator();
    const gain = e.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = base * partial.ratio;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(partial.level, when + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + partial.decay);
    osc.connect(gain).connect(e.master);
    osc.start(when);
    osc.stop(when + partial.decay + 0.05);
  }
};

export const playNote = (scale: ScaleId, row: number, delay = 0) => {
  const e = engine();
  const midi = SCALES[scale].midi[row];
  if (!e || midi === undefined) return;
  tine(midi, e.ctx.currentTime + 0.02 + delay);
};

/** A soft wooden knock for a pin in the wrong place. */
export const playThunk = (delay = 0) => {
  const e = engine();
  if (!e) return;
  const when = e.ctx.currentTime + 0.02 + delay;
  const osc = e.ctx.createOscillator();
  const gain = e.ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(170, when);
  osc.frequency.exponentialRampToValueAtTime(70, when + 0.12);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.3, when + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
  osc.connect(gain).connect(e.master);
  osc.start(when);
  osc.stop(when + 0.2);
};
