/** Small things kept on the device so a reload or a wrong tap loses nothing. */

const read = (key: string): unknown => {
  try {
    const text = window.localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable inside the webview; play goes on without it.
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toPins = (value: unknown, length: number): (number | null)[] | null =>
  Array.isArray(value) && value.length === length
    ? value.map((pin: unknown) =>
        typeof pin === 'number' && Number.isInteger(pin) ? pin : null
      )
    : null;

export type BoardDraft = {
  /** Checks made when the pins were saved; older drafts are thrown away. */
  checks: number;
  pins: (number | null)[];
  listens: number;
};

const boardKey = (id: string) => `plink:board:${id}`;

export const loadBoard = (id: string, length: number): BoardDraft | null => {
  const saved = read(boardKey(id));
  if (!isRecord(saved)) return null;
  const pins = toPins(saved.pins, length);
  const { checks, listens } = saved;
  return pins && typeof checks === 'number' && typeof listens === 'number'
    ? { checks, pins, listens }
    : null;
};

export const saveBoard = (id: string, draft: BoardDraft | null) =>
  write(boardKey(id), draft);

export type TuneDraft = {
  scale: string;
  length: number;
  pins: (number | null)[];
};

const TUNE_KEY = 'plink:tune-draft';

export const loadTuneDraft = (slots: number): TuneDraft | null => {
  const saved = read(TUNE_KEY);
  if (!isRecord(saved)) return null;
  const pins = toPins(saved.pins, slots);
  const { scale, length } = saved;
  return pins && typeof scale === 'string' && typeof length === 'number'
    ? { scale, length, pins }
    : null;
};

export const saveTuneDraft = (draft: TuneDraft | null) =>
  write(TUNE_KEY, draft);
