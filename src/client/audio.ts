import { SCALES, type ScaleId } from '../shared/game';

/** Seconds between two pins when a tune plays. */
export const STEP = 0.34;

const MUTE_KEY = 'plink:muted';
const LEVEL = 0.6;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let broken = false;
let muted = false;
const muteListeners = new Set<() => void>();

try {
  muted = window.localStorage.getItem(MUTE_KEY) === '1';
} catch {
  muted = false;
}

const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/**
 * iOS plays Web Audio on the ringer channel, which the silent switch mutes.
 * Asking for the playback session moves it to the media channel.
 */
const askForPlayback = () => {
  try {
    const session: unknown = Reflect.get(navigator, 'audioSession');
    if (typeof session === 'object' && session !== null) {
      Reflect.set(session, 'type', 'playback');
    }
  } catch {
    // Older browsers have no audio session; nothing to ask.
  }
};

/**
 * The audio engine, or null on a device that cannot make sound. The game must
 * keep working without it. Call from a tap: browsers start audio on a gesture.
 */
const engine = () => {
  if (broken) return null;
  try {
    if (!ctx) {
      askForPlayback();
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : LEVEL;
      // Ten right pins can ring at once; the compressor keeps them clean.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 12;
      master.connect(limiter).connect(ctx.destination);
    }
    // 'interrupted' (after a call on iOS) needs the same nudge as 'suspended'.
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    return master ? { ctx, master } : null;
  } catch {
    broken = true;
    return null;
  }
};

/** Starts the audio engine early, on the first touch anywhere in the game. */
export const primeAudio = () => {
  engine();
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Resolves once the audio clock is really moving. Right after the engine
 * starts the clock stands still, and notes scheduled then pile up on one
 * instant.
 */
const whenRunning = async () => {
  const e = engine();
  if (!e) return null;
  const from = e.ctx.currentTime;
  for (let i = 0; i < 40; i++) {
    if (e.ctx.state === 'running' && e.ctx.currentTime > from) return e;
    await sleep(25);
  }
  return e.ctx.state === 'running' ? e : null;
};

export const isMuted = () => muted;

/** True on a device where the browser refused to make sound at all. */
export const isSoundless = () => broken;

export const onMuteChange = (listener: () => void) => {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
};

export const setMuted = (next: boolean) => {
  muted = next;
  if (ctx && master) {
    master.gain.setTargetAtTime(next ? 0 : LEVEL, ctx.currentTime, 0.01);
  }
  try {
    window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    // Storage can be unavailable inside the webview; mute still works.
  }
  muteListeners.forEach((listener) => listener());
};

type Voice = { stop: (when?: number) => void };

/** One music-box tine: a pure tone, a faint octave and a short bright tick. */
const tine = (
  e: { ctx: AudioContext; master: GainNode },
  midi: number,
  when: number
): Voice[] => {
  const base = frequency(midi);
  const partials = [
    { ratio: 1, level: 0.42, decay: 1.5 },
    { ratio: 2.005, level: 0.16, decay: 0.7 },
    { ratio: 5.4, level: 0.07, decay: 0.12 },
  ];
  return partials.map((partial) => {
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
    return osc;
  });
};

export const playNote = (scale: ScaleId, row: number, delay = 0) => {
  const e = engine();
  const midi = SCALES[scale].midi[row];
  if (!e || midi === undefined) return;
  try {
    tine(e, midi, e.ctx.currentTime + 0.02 + delay);
  } catch {
    // A note that cannot sound must never stop a pin from being placed.
  }
};

/**
 * A wooden knock for a pin in the wrong place: a low thump for good speakers
 * and a short click around 600 Hz that small phone speakers can carry.
 */
export const playThunk = (delay = 0) => {
  const e = engine();
  if (!e) return;
  try {
    const when = e.ctx.currentTime + 0.02 + delay;
    const parts: {
      type: OscillatorType;
      from: number;
      to: number;
      level: number;
      length: number;
    }[] = [
      { type: 'triangle', from: 170, to: 70, level: 0.3, length: 0.16 },
      { type: 'square', from: 640, to: 420, level: 0.07, length: 0.06 },
    ];
    for (const part of parts) {
      const osc = e.ctx.createOscillator();
      const gain = e.ctx.createGain();
      osc.type = part.type;
      osc.frequency.setValueAtTime(part.from, when);
      osc.frequency.exponentialRampToValueAtTime(part.to, when + part.length);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(part.level, when + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + part.length);
      osc.connect(gain).connect(e.master);
      osc.start(when);
      osc.stop(when + part.length + 0.04);
    }
  } catch {
    // Silent is fine; the red crosses still show the result.
  }
};

export type TuneRun = { stop: () => void };

/**
 * Plays a whole tune on the audio clock, so notes keep their spacing even on
 * the first play, and reports each column as it sounds. Without sound the
 * columns still step through on a plain timer.
 */
export const playTune = (
  scale: ScaleId,
  rows: readonly (number | null)[],
  step: number,
  onStep: (column: number) => void,
  onEnd: () => void
): TuneRun => {
  let live = true;
  const timers: number[] = [];
  const voices: Voice[] = [];

  const at = (ms: number, run: () => void) => {
    timers.push(
      window.setTimeout(() => {
        if (live) run();
      }, ms)
    );
  };

  void whenRunning().then((e) => {
    if (!live) return;
    const lead = 0.06;
    const start = e ? e.ctx.currentTime + lead : 0;
    rows.forEach((row, i) => {
      const midi = row === null ? undefined : SCALES[scale].midi[row];
      if (e && midi !== undefined) {
        try {
          voices.push(...tine(e, midi, start + i * step));
        } catch {
          // Keep stepping through the columns without this note.
        }
      }
      at((lead + i * step) * 1000, () => onStep(i));
    });
    at((lead + rows.length * step) * 1000 + 200, onEnd);
  });

  return {
    stop: () => {
      live = false;
      timers.forEach((id) => window.clearTimeout(id));
      voices.forEach((voice) => {
        try {
          voice.stop();
        } catch {
          // Already finished.
        }
      });
    },
  };
};
