export type Scored = { member: string; score: number };

/** The slice of Redis the game needs, so the rules run anywhere. */
export type Store = {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  incrBy(key: string, amount: number): Promise<number>;
  hGet(key: string, field: string): Promise<string | undefined>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hSet(key: string, fields: Record<string, string>): Promise<void>;
  /** True when the field was free and is now set. */
  hSetNX(key: string, field: string, value: string): Promise<boolean>;
  hIncrBy(key: string, field: string, amount: number): Promise<number>;
  hDel(key: string, field: string): Promise<void>;
  zAdd(key: string, member: string, score: number): Promise<void>;
  zIncrBy(key: string, member: string, amount: number): Promise<number>;
  /** Highest score first. */
  zTop(key: string, count: number): Promise<Scored[]>;
  zCard(key: string): Promise<number>;
};

export type MemoryData = {
  strings: Record<string, string>;
  hashes: Record<string, Record<string, string>>;
  zsets: Record<string, Record<string, number>>;
};

export const emptyMemoryData = (): MemoryData => ({
  strings: {},
  hashes: {},
  zsets: {},
});

/** In-memory Store for unit tests and the offline demo. */
export const createMemoryStore = (
  data: MemoryData = emptyMemoryData(),
  onChange: (data: MemoryData) => void = () => {}
): Store => {
  const hash = (key: string) => (data.hashes[key] ??= {});
  const zset = (key: string) => (data.zsets[key] ??= {});
  const changed = () => onChange(data);
  return {
    get: async (key) => data.strings[key],
    set: async (key, value) => {
      data.strings[key] = value;
      changed();
    },
    incrBy: async (key, amount) => {
      const next = Number(data.strings[key] ?? 0) + amount;
      data.strings[key] = String(next);
      changed();
      return next;
    },
    hGet: async (key, field) => data.hashes[key]?.[field],
    hGetAll: async (key) => ({ ...(data.hashes[key] ?? {}) }),
    hSet: async (key, fields) => {
      Object.assign(hash(key), fields);
      changed();
    },
    hSetNX: async (key, field, value) => {
      const h = hash(key);
      if (h[field] !== undefined) return false;
      h[field] = value;
      changed();
      return true;
    },
    hIncrBy: async (key, field, amount) => {
      const h = hash(key);
      const next = Number(h[field] ?? 0) + amount;
      h[field] = String(next);
      changed();
      return next;
    },
    hDel: async (key, field) => {
      delete hash(key)[field];
      changed();
    },
    zAdd: async (key, member, score) => {
      zset(key)[member] = score;
      changed();
    },
    zIncrBy: async (key, member, amount) => {
      const z = zset(key);
      const next = (z[member] ?? 0) + amount;
      z[member] = next;
      changed();
      return next;
    },
    zTop: async (key, count) =>
      Object.entries(data.zsets[key] ?? {})
        .map(([member, score]) => ({ member, score }))
        .sort((a, b) => b.score - a.score || (a.member < b.member ? 1 : -1))
        .slice(0, count),
    zCard: async (key) => Object.keys(data.zsets[key] ?? {}).length,
  };
};
