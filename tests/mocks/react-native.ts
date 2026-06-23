export const Platform = {
  OS: 'android' as const,
  select: <T extends Record<string, unknown>>(options: T): T[keyof T] =>
    (options.android ?? options.default) as T[keyof T],
};
