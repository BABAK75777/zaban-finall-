export const asyncStore = new Map<string, string>();

export default {
  setItem: async (key: string, value: string) => {
    asyncStore.set(key, value);
  },
  getItem: async (key: string) => asyncStore.get(key) ?? null,
  removeItem: async (key: string) => {
    asyncStore.delete(key);
  },
};
