export const ROWS = 5;
export const MAX_CHECKS = 4;
export const MIN_NOTES = 6;
export const MAX_NOTES = 10;

export type ScaleId = 'sunny' | 'dusky' | 'plain' | 'meadow' | 'misty';

export type Scale = {
  id: ScaleId;
  label: string;
  /** MIDI note per row, lowest first. */
  midi: readonly [number, number, number, number, number];
  names: readonly [string, string, string, string, string];
  /** Row the scale feels at rest on. */
  home: number;
};

export const SCALES: Record<ScaleId, Scale> = {
  sunny: {
    id: 'sunny',
    label: 'Sunny',
    midi: [72, 74, 76, 79, 81],
    names: ['C', 'D', 'E', 'G', 'A'],
    home: 0,
  },
  dusky: {
    id: 'dusky',
    label: 'Dusky',
    midi: [69, 72, 74, 76, 79],
    names: ['A', 'C', 'D', 'E', 'G'],
    home: 0,
  },
  plain: {
    id: 'plain',
    label: 'Plain',
    midi: [72, 74, 76, 77, 79],
    names: ['C', 'D', 'E', 'F', 'G'],
    home: 0,
  },
  meadow: {
    id: 'meadow',
    label: 'Meadow',
    midi: [74, 76, 79, 81, 83],
    names: ['D', 'E', 'G', 'A', 'B'],
    home: 2,
  },
  misty: {
    id: 'misty',
    label: 'Misty',
    midi: [69, 71, 72, 76, 77],
    names: ['A', 'B', 'C', 'E', 'F'],
    home: 0,
  },
};

export const SCALE_IDS: readonly ScaleId[] = [
  'sunny',
  'dusky',
  'plain',
  'meadow',
  'misty',
];

export const isScaleId = (value: unknown): value is ScaleId =>
  typeof value === 'string' && SCALE_IDS.some((id) => id === value);

export type Tune = {
  scale: ScaleId;
  /** One row index (0 = lowest) per column. */
  notes: number[];
};

export const isRow = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 0 &&
  value < ROWS;

export const isGuess = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) && value.length === length && value.every(isRow);

export type TuneError = 'scale' | 'length' | 'notes' | 'flat';

/** A tune worth solving: right size, real rows, at least three pitches. */
export const tuneError = (scale: unknown, notes: unknown): TuneError | null => {
  if (!isScaleId(scale)) return 'scale';
  if (!Array.isArray(notes)) return 'notes';
  if (notes.length < MIN_NOTES || notes.length > MAX_NOTES) return 'length';
  if (!notes.every(isRow)) return 'notes';
  if (new Set(notes).size < 3) return 'flat';
  return null;
};

export const grade = (notes: readonly number[], guess: readonly number[]) =>
  notes.map((note, i) => guess[i] === note);

export type Play = {
  guesses: number[][];
  done: boolean;
  solved: boolean;
};

export const emptyPlay = (): Play => ({
  guesses: [],
  done: false,
  solved: false,
});

/** Replays guesses against the answer; stops at the solving or fifth check. */
export const evaluate = (
  notes: readonly number[],
  guesses: readonly number[][]
): Play => {
  const kept: number[][] = [];
  let solved = false;
  for (const guess of guesses) {
    if (kept.length >= MAX_CHECKS) break;
    kept.push([...guess]);
    if (grade(notes, guess).every(Boolean)) {
      solved = true;
      break;
    }
  }
  return { guesses: kept, solved, done: solved || kept.length >= MAX_CHECKS };
};

export const isPrefix = (
  shorter: readonly number[][],
  longer: readonly number[][]
) =>
  shorter.length <= longer.length &&
  shorter.every((guess, i) => guess.join() === longer[i]?.join());

export const signature = (tune: Tune) => `${tune.scale}:${tune.notes.join('')}`;

export const encodeNotes = (notes: readonly number[]) => notes.join('');

export const decodeNotes = (text: string): number[] =>
  Array.from(text, (ch) => Number(ch)).filter(isRow);

const ADJECTIVES = [
  'Amber',
  'Brass',
  'Velvet',
  'Copper',
  'Paper',
  'Hollow',
  'Little',
  'Quiet',
  'Silver',
  'Mossy',
  'Drowsy',
  'Bright',
  'Dusty',
  'Gentle',
  'Wobbly',
  'Golden',
  'Tin',
  'Clover',
  'Linen',
  'Marble',
  'Honey',
  'Winter',
  'Lantern',
  'Pocket',
  'Wandering',
  'Crooked',
  'Tiny',
  'Midnight',
  'Morning',
  'Rainy',
  'Thistle',
  'Walnut',
] as const;

const NOUNS = [
  'Sparrow',
  'Lullaby',
  'Carousel',
  'Waltz',
  'Teacup',
  'Clockwork',
  'Lantern',
  'Ribbon',
  'Thimble',
  'Kettle',
  'Garden',
  'Attic',
  'Minuet',
  'Feather',
  'Marble',
  'Trinket',
  'Harbor',
  'Window',
  'Bluebird',
  'Snowfall',
  'Chimney',
  'Button',
  'Orchard',
  'Ferry',
  'Cradle',
  'Balloon',
  'Kite',
  'Parade',
  'Postcard',
  'Locket',
  'Staircase',
  'Dormouse',
] as const;

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Tunes have no free text: their name is derived from their notes. */
export const tuneName = (tune: Tune, salt = 0) => {
  const h = hash(salt > 0 ? `${signature(tune)}#${salt}` : signature(tune));
  const adjective = ADJECTIVES[h % ADJECTIVES.length] ?? 'Amber';
  const noun = NOUNS[(h >>> 8) % NOUNS.length] ?? 'Sparrow';
  return `${adjective} ${noun}`;
};

export const shareText = (
  label: string,
  notes: readonly number[],
  play: Play,
  /** Times the player heard the tune before finishing, when known. */
  listens: number | null = null
) => {
  const score = play.solved ? `${play.guesses.length}` : 'X';
  const heard =
    listens === null
      ? ''
      : ` · ${listens === 1 ? '1 listen' : `${listens} listens`}`;
  const rows = play.guesses.map((guess) =>
    grade(notes, guess)
      .map((ok) => (ok ? '🟩' : '⬜'))
      .join('')
  );
  return [`${label} ${score}/${MAX_CHECKS}${heard}`, ...rows].join('\n');
};
