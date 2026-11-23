import { ROWS, SCALES, type ScaleId, type Tune } from './game';
import { weekdayOf } from './day';

export type Classic = Tune & { title: string; credit: string };

/** Public-domain melodies that fit five pitches; one opens each Sunday. */
export const CLASSICS: readonly Classic[] = [
  {
    title: 'Ode to Joy',
    credit: 'Beethoven, 1824',
    scale: 'plain',
    notes: [2, 2, 3, 4, 4, 3, 2, 1, 0, 0],
  },
  {
    title: 'Morning Mood',
    credit: 'Grieg, 1875',
    scale: 'sunny',
    notes: [3, 2, 1, 0, 1, 2, 3, 2, 1, 0],
  },
  {
    title: 'Amazing Grace',
    credit: 'traditional hymn tune',
    scale: 'meadow',
    notes: [0, 2, 4, 2, 4, 3, 2, 1, 0],
  },
  {
    title: 'Frère Jacques',
    credit: 'French nursery song',
    scale: 'plain',
    notes: [0, 1, 2, 0, 0, 1, 2, 0],
  },
  {
    title: 'Largo from the New World Symphony',
    credit: 'Dvořák, 1893',
    scale: 'sunny',
    notes: [2, 3, 3, 2, 1, 0, 1, 2, 3, 2],
  },
  {
    title: 'Auld Lang Syne',
    credit: 'Scottish folk tune',
    scale: 'meadow',
    notes: [0, 2, 2, 2, 4, 3, 2, 3],
  },
  {
    title: 'Row, Row, Row Your Boat',
    credit: 'American round',
    scale: 'plain',
    notes: [0, 0, 0, 1, 2, 2, 1, 2, 3, 4],
  },
  {
    title: 'Sakura, Sakura',
    credit: 'Japanese folk song',
    scale: 'misty',
    notes: [0, 0, 1, 0, 0, 1, 0, 1, 2, 1],
  },
  {
    title: 'Oh! Susanna',
    credit: 'Stephen Foster, 1848',
    scale: 'sunny',
    notes: [0, 1, 2, 3, 3, 4, 3, 2, 0, 1],
  },
  {
    title: 'Deck the Halls',
    credit: 'Welsh carol',
    scale: 'plain',
    notes: [4, 3, 2, 1, 0, 1, 2, 0],
  },
  {
    title: 'Swing Low, Sweet Chariot',
    credit: 'spiritual',
    scale: 'meadow',
    notes: [4, 2, 4, 2, 2, 1, 0],
  },
  {
    title: 'When the Saints Go Marching In',
    credit: 'traditional',
    scale: 'plain',
    notes: [0, 2, 3, 4, 0, 2, 3, 4],
  },
  {
    title: 'Camptown Races',
    credit: 'Stephen Foster, 1850',
    scale: 'sunny',
    notes: [3, 3, 2, 3, 4, 3, 2],
  },
  {
    title: 'Old MacDonald Had a Farm',
    credit: 'traditional',
    scale: 'meadow',
    notes: [2, 2, 2, 0, 1, 1, 0],
  },
  {
    title: 'Lightly Row',
    credit: 'German folk song',
    scale: 'plain',
    notes: [4, 2, 2, 3, 1, 1, 0, 1, 2, 3],
  },
  {
    title: 'Mary Had a Little Lamb',
    credit: 'American nursery song',
    scale: 'plain',
    notes: [2, 1, 0, 1, 2, 2, 2],
  },
  {
    title: 'Hot Cross Buns',
    credit: 'English street cry',
    scale: 'plain',
    notes: [2, 1, 0, 2, 1, 0],
  },
];

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Shape = {
  length: number;
  /** Chance that a move jumps more than one row. */
  leap: number;
  scales: readonly ScaleId[];
};

/** Monday is the gentlest box of the week, Saturday the hardest. */
const WEEK: readonly Shape[] = [
  { length: 6, leap: 0.1, scales: ['sunny', 'plain'] },
  { length: 6, leap: 0.2, scales: ['sunny', 'meadow'] },
  { length: 7, leap: 0.25, scales: ['dusky', 'plain'] },
  { length: 8, leap: 0.3, scales: ['sunny', 'meadow', 'dusky'] },
  { length: 8, leap: 0.45, scales: ['dusky', 'misty', 'meadow'] },
  { length: 9, leap: 0.55, scales: ['misty', 'dusky', 'sunny'] },
];

const pick = <T>(rand: () => number, items: readonly T[], fallback: T): T =>
  items[Math.floor(rand() * items.length)] ?? fallback;

const clampRow = (row: number) => Math.max(0, Math.min(ROWS - 1, row));

const walk = (rand: () => number, from: number, leap: number) => {
  const roll = rand();
  if (roll < 0.14) return from;
  const size = rand() < leap ? (rand() < 0.7 ? 2 : 3) : 1;
  const up = from === 0 ? true : from === ROWS - 1 ? false : rand() < 0.5;
  const to = clampRow(from + (up ? size : -size));
  return to === from ? clampRow(from + (up ? -1 : 1)) : to;
};

const isMusical = (notes: readonly number[]) => {
  if (new Set(notes).size < 3) return false;
  for (let i = 3; i < notes.length; i++) {
    const n = notes[i];
    if (n === notes[i - 1] && n === notes[i - 2] && n === notes[i - 3]) {
      return false;
    }
  }
  return true;
};

/** A short phrase that leaves home, echoes its opening and comes back. */
export const generateTune = (seed: number, shape: Shape): Tune => {
  const rand = mulberry32(seed);
  const scale = pick(rand, shape.scales, 'sunny');
  const home = SCALES[scale].home;
  for (let attempt = 0; attempt < 40; attempt++) {
    const notes: number[] = [rand() < 0.6 ? home : clampRow(home + 2)];
    const half = Math.ceil(shape.length / 2);
    while (notes.length < half) {
      notes.push(walk(rand, notes[notes.length - 1] ?? home, shape.leap));
    }
    const echo = shape.length >= 8 ? 2 : 0;
    for (let i = 0; i < echo; i++) notes.push(notes[i] ?? home);
    while (notes.length < shape.length - 1) {
      notes.push(walk(rand, notes[notes.length - 1] ?? home, shape.leap));
    }
    notes.push(home);
    const beforeLast = notes[notes.length - 2];
    if (beforeLast === home) notes[notes.length - 2] = clampRow(home + 1);
    if (isMusical(notes)) return { scale, notes };
  }
  const fallback = Array.from({ length: shape.length }, (_, i) =>
    clampRow(home + [0, 1, 2, 1][i % 4]!)
  );
  fallback[shape.length - 1] = home;
  return { scale, notes: fallback };
};

export type DailyPuzzle = Tune & {
  day: number;
  /** Only Sunday classics have one; shown once the box is solved. */
  title: string | null;
  credit: string | null;
};

export const dailyPuzzle = (day: number): DailyPuzzle => {
  const weekday = weekdayOf(day);
  if (weekday === 6) {
    const week = Math.floor((day - 1) / 7);
    const classic = CLASSICS[week % CLASSICS.length];
    if (classic) {
      return {
        day,
        scale: classic.scale,
        notes: [...classic.notes],
        title: classic.title,
        credit: classic.credit,
      };
    }
  }
  const shape = WEEK[weekday] ?? WEEK[0]!;
  return {
    day,
    ...generateTune(day * 7919 + 17, shape),
    title: null,
    credit: null,
  };
};

export const WORKSHOP_AUTHOR = 'the Plink workshop';
export const WORKSHOP_COUNT = 3;

export const workshopId = (day: number, index: number) => `w${day}-${index}`;

export const parseWorkshopId = (id: string) => {
  const match = /^w(\d+)-(\d+)$/.exec(id);
  if (!match) return null;
  const day = Number(match[1]);
  const index = Number(match[2]);
  return index < WORKSHOP_COUNT ? { day, index } : null;
};

const WORKSHOP_SHAPES: readonly Shape[] = [
  { length: 6, leap: 0.15, scales: ['sunny', 'plain', 'meadow'] },
  { length: 8, leap: 0.35, scales: ['dusky', 'meadow', 'misty'] },
  { length: 10, leap: 0.5, scales: ['misty', 'dusky', 'sunny'] },
];

/** Three house tunes a day so the shelf is never empty. */
export const workshopTune = (day: number, index: number): Tune =>
  generateTune(
    day * 104729 + index * 331 + 5,
    WORKSHOP_SHAPES[index % WORKSHOP_SHAPES.length] ?? WORKSHOP_SHAPES[0]!
  );
