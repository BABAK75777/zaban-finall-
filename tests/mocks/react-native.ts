export const Platform = {
  select: <T extends Record<string, unknown>>(options: T): T[keyof T] =>
    options.default as T[keyof T],
};
