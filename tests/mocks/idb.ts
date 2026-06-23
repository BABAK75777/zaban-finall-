export async function openDB() {
  return {
    get: async () => undefined,
    put: async () => undefined,
    delete: async () => undefined,
    clear: async () => undefined,
    transaction: () => ({
      store: {
        get: async () => undefined,
        put: async () => undefined,
        delete: async () => undefined,
        clear: async () => undefined,
      },
      done: Promise.resolve(),
    }),
  };
}

export type DBSchema = Record<string, unknown>;
export type IDBPDatabase = Awaited<ReturnType<typeof openDB>>;
