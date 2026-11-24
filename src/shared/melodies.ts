import { ROWS, SCALES, type ScaleId, type Tune } from './game';

export type Classic = Tune & { title: string; credit: string };

const song = (
  title: string,
  credit: string,
  scale: ScaleId,
  notes: number[]
): Classic => ({ title, credit, scale, notes });

/**
 * Seven weeks of public-domain melodies that fit five pitches, one a day.
 * Each row is a week, Monday to Sunday: short and stepwise on Monday, longer
 * with wider leaps by Saturday, a ten-pin classic on Sunday. The carols land
 * in December, Auld Lang Syne on New Year's Eve.
 */
export const CLASSICS: readonly Classic[] = [
  // Week 1, from Monday 23 November 2026
  song('Hot Cross Buns', 'English street cry', 'plain', [2, 1, 0, 2, 1, 0]),
  song(
    'Mary Had a Little Lamb',
    'American nursery song',
    'plain',
    [2, 1, 0, 1, 2, 2, 2]
  ),
  song(
    'Twinkle, Twinkle, Little Star',
    'French melody, 1761',
    'sunny',
    [0, 0, 3, 3, 4, 4, 3]
  ),
  song(
    'Frère Jacques',
    'French nursery song',
    'plain',
    [0, 1, 2, 0, 0, 1, 2, 0]
  ),
  song(
    'When the Saints Go Marching In',
    'traditional',
    'plain',
    [0, 2, 3, 4, 0, 2, 3, 4]
  ),
  song(
    'Amazing Grace',
    'traditional hymn tune',
    'meadow',
    [0, 2, 4, 2, 4, 3, 2, 1, 0]
  ),
  song(
    'Ode to Joy',
    'Beethoven, 1824',
    'plain',
    [2, 2, 3, 4, 4, 3, 2, 1, 0, 0]
  ),
  // Week 2
  song('Ring Around the Rosie', 'nursery rhyme', 'sunny', [3, 3, 2, 4, 3, 2]),
  song('Yankee Doodle', 'traditional', 'plain', [0, 0, 1, 2, 0, 2, 1]),
  song(
    'Camptown Races',
    'Stephen Foster, 1850',
    'sunny',
    [3, 3, 2, 3, 4, 3, 2]
  ),
  song('Kumbaya', 'spiritual', 'sunny', [0, 2, 3, 3, 3, 4, 4, 3]),
  song(
    'Pop Goes the Weasel',
    'English nursery rhyme',
    'sunny',
    [0, 0, 1, 1, 2, 3, 2, 0]
  ),
  song(
    'Alouette',
    'French-Canadian folk song',
    'plain',
    [0, 1, 2, 2, 1, 0, 1, 2, 0]
  ),
  song('Morning Mood', 'Grieg, 1875', 'sunny', [3, 2, 1, 0, 1, 2, 3, 2, 1, 0]),
  // Week 3
  song('Skip to My Lou', 'American folk song', 'plain', [2, 0, 2, 2, 2, 4]),
  song(
    'Michael, Row the Boat Ashore',
    'spiritual',
    'sunny',
    [0, 2, 3, 2, 3, 4, 3]
  ),
  song('Surprise Symphony', 'Haydn, 1791', 'plain', [0, 0, 2, 2, 4, 4, 2]),
  song(
    'Jingle Bells',
    'James Pierpont, 1857',
    'plain',
    [2, 2, 2, 2, 4, 0, 1, 2]
  ),
  song('Bridal Chorus', 'Wagner, 1850', 'plain', [0, 3, 3, 3, 0, 4, 2, 3]),
  song(
    'Scarborough Fair',
    'English ballad',
    'misty',
    [0, 0, 3, 3, 3, 1, 2, 1, 0]
  ),
  song(
    'Largo from the New World Symphony',
    'Dvořák, 1893',
    'sunny',
    [2, 3, 3, 2, 1, 0, 1, 2, 3, 2]
  ),
  // Week 4
  song('La donna è mobile', 'Verdi, 1851', 'plain', [2, 2, 2, 4, 3, 1]),
  song(
    'Spring, from The Four Seasons',
    'Vivaldi, 1725',
    'plain',
    [0, 2, 2, 2, 1, 0, 4]
  ),
  song(
    'Angels We Have Heard on High',
    'French carol',
    'plain',
    [2, 2, 2, 4, 4, 3, 2]
  ),
  song('O Christmas Tree', 'German carol', 'meadow', [0, 2, 2, 2, 3, 4, 4, 4]),
  song(
    'Carol of the Bells',
    'Leontovych, 1914',
    'misty',
    [2, 1, 2, 0, 2, 1, 2, 0]
  ),
  song('Arirang', 'Korean folk song', 'meadow', [0, 1, 0, 1, 2, 3, 2, 3, 4]),
  song(
    'Sakura, Sakura',
    'Japanese folk song',
    'misty',
    [0, 0, 1, 0, 0, 1, 0, 1, 2, 1]
  ),
  // Week 5, Christmas week
  song('The First Noel', 'English carol', 'plain', [2, 1, 0, 1, 2, 3, 4]),
  song(
    'Up on the Housetop',
    'Benjamin Hanby, 1864',
    'sunny',
    [3, 3, 4, 3, 2, 0, 2, 3]
  ),
  song('Deck the Halls', 'Welsh carol', 'plain', [4, 3, 2, 1, 0, 1, 2, 0]),
  song('Silent Night', 'Franz Gruber, 1818', 'sunny', [3, 4, 3, 2, 3, 4, 3, 2]),
  song(
    'O Come, All Ye Faithful',
    'carol, 18th century',
    'meadow',
    [2, 2, 0, 2, 3, 0, 4, 3, 4]
  ),
  song(
    'Three Blind Mice',
    'English round',
    'plain',
    [2, 1, 0, 2, 1, 0, 4, 3, 3, 2]
  ),
  song(
    'Row, Row, Row Your Boat',
    'American round',
    'plain',
    [0, 0, 0, 1, 2, 2, 1, 2, 3, 4]
  ),
  // Week 6, New Year
  song('Taps', 'bugle call, 1862', 'meadow', [0, 0, 2, 0, 2, 4]),
  song('Tom Dooley', 'American folk song', 'meadow', [0, 0, 0, 1, 2, 4, 4]),
  song(
    'Swing Low, Sweet Chariot',
    'spiritual',
    'meadow',
    [4, 2, 4, 2, 2, 1, 0]
  ),
  song(
    'Auld Lang Syne',
    'Scottish folk tune',
    'meadow',
    [0, 2, 2, 2, 4, 3, 2, 3]
  ),
  song(
    'Westminster Chimes',
    'clock chime, 1793',
    'meadow',
    [4, 2, 3, 0, 0, 3, 4, 2]
  ),
  song(
    'Oh! Susanna',
    'Stephen Foster, 1848',
    'sunny',
    [0, 1, 2, 3, 3, 4, 3, 2, 0, 1]
  ),
  song(
    'Lightly Row',
    'German folk song',
    'plain',
    [4, 2, 2, 3, 1, 1, 0, 1, 2, 3]
  ),
  // Week 7
  song(
    'Old MacDonald Had a Farm',
    'traditional',
    'meadow',
    [2, 2, 2, 0, 1, 1, 0]
  ),
  song(
    'Oh My Darling, Clementine',
    'American ballad',
    'meadow',
    [2, 2, 2, 0, 4, 4, 4, 2]
  ),
  song(
    'The Cuckoo (Kuckuck, Kuckuck)',
    'German folk song',
    'plain',
    [4, 2, 4, 2, 1, 0, 1, 0]
  ),
  song(
    'America the Beautiful',
    'Samuel Ward, 1882',
    'sunny',
    [3, 3, 2, 2, 3, 3, 1, 1]
  ),
  song('Funeral March', 'Chopin, 1837', 'misty', [0, 0, 0, 0, 2, 1, 1, 0, 0]),
  song(
    'Sur le pont d’Avignon',
    'French folk song',
    'plain',
    [0, 0, 0, 1, 1, 1, 2, 3, 4, 0]
  ),
  song(
    'Go Tell Aunt Rhody',
    'American folk song',
    'plain',
    [2, 2, 1, 0, 0, 1, 1, 3, 2, 1]
  ),
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

/** A short phrase for the workshop shelf. It may start and end on any row. */
export const generateTune = (seed: number, shape: Shape): Tune => {
  const rand = mulberry32(seed);
  const scale = pick(rand, shape.scales, 'sunny');
  const home = SCALES[scale].home;
  for (let attempt = 0; attempt < 40; attempt++) {
    const notes: number[] = [Math.floor(rand() * ROWS)];
    while (notes.length < shape.length - 1) {
      notes.push(walk(rand, notes[notes.length - 1] ?? home, shape.leap));
    }
    // Most tunes come to rest on the home note, but not all of them.
    const before = notes[notes.length - 1] ?? home;
    notes.push(rand() < 0.55 && before !== home ? home : walk(rand, before, 0));
    if (isMusical(notes) && new Set(notes).size >= Math.min(4, ROWS)) {
      return { scale, notes };
    }
  }
  return {
    scale,
    notes: Array.from({ length: shape.length }, (_, i) =>
      clampRow([0, 2, 4, 3, 1][i % 5] ?? 0)
    ),
  };
};

export type DailyPuzzle = Tune & {
  day: number;
  /** Shown once the box is finished. */
  title: string;
  credit: string;
};

/** Every day's box is a real tune; the songbook repeats after seven weeks. */
export const dailyPuzzle = (day: number): DailyPuzzle => {
  const index =
    (((day - 1) % CLASSICS.length) + CLASSICS.length) % CLASSICS.length;
  const classic = CLASSICS[index] ?? CLASSICS[0]!;
  return {
    day,
    scale: classic.scale,
    notes: [...classic.notes],
    title: classic.title,
    credit: classic.credit,
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
